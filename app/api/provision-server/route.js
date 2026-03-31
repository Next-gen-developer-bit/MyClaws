import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createInstance, waitForInstance, getInstanceIP } from '@/lib/vultr';
import { generateCloudInit } from '@/lib/cloud-init';

/** Map known Vultr API errors to user-friendly messages */
function getFriendlyError(message) {
  const msg = (message || '').toLowerCase();

  if (msg.includes('insufficient') || msg.includes('limit') || msg.includes('exceed')) {
    return `You've reached your Vultr instance limit. Please delete unused servers from your Vultr dashboard or contact Vultr support to increase your limit, then try again.`;
  }
  if (msg.includes('unauthorized ip address')) {
    return 'Vultr blocked the request due to an un-whitelisted IP address. In your Vultr API settings, make sure to add both 0.0.0.0/0 (for IPv4) and ::/0 (for IPv6) directly into the Access Controls to allow connections from your current internet provider.';
  }
  if (msg.includes('unauthorized') || msg.includes('401') || msg.includes('invalid api')) {
    return 'Vultr API key is invalid or expired. Please check your server configuration.';
  }
  if (msg.includes('rate limit') || msg.includes('429')) {
    return 'Too many requests to Vultr. Please wait a moment and try again.';
  }
  if (msg.includes('region') && (msg.includes('not available') || msg.includes('invalid'))) {
    return 'The selected server region is currently unavailable. Please try a different region.';
  }
  if (msg.includes('plan') && (msg.includes('not available') || msg.includes('invalid'))) {
    return 'The selected server plan is not available in this region. Please try a different configuration.';
  }

  return message || 'Failed to provision server. Please try again.';
}

const MAX_AGENTS_PRO = 5;

export async function POST(request) {
  let deploymentId = null;
  try {
    const body = await request.json();
    deploymentId = body.deploymentId;

    if (!deploymentId) {
      return NextResponse.json({ success: false, error: 'Deployment ID is required.' }, { status: 400 });
    }

    // 1. Fetch deployment config from database
    const { data: deployment, error: fetchError } = await supabaseAdmin
      .from('claw_deployments')
      .select('*')
      .eq('id', deploymentId)
      .single();

    if (fetchError || !deployment) {
      return NextResponse.json({ success: false, error: 'Deployment not found.' }, { status: 404 });
    }

    // 2. ── SUBSCRIPTION GATE: verify user has an active paid subscription ──
    if (!deployment.user_id) {
      return NextResponse.json({ success: false, error: 'No user associated with this deployment.' }, { status: 403 });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('subscription_plan, subscription_status')
      .eq('id', deployment.user_id)
      .single();

    const hasActiveSubscription =
      profile &&
      profile.subscription_plan === 'pro' &&
      profile.subscription_status === 'active';

    if (!hasActiveSubscription) {
      console.warn(`[Provision] Blocked: user ${deployment.user_id} has no active Pro subscription. Plan: ${profile?.subscription_plan}, Status: ${profile?.subscription_status}`);
      return NextResponse.json(
        { success: false, error: 'You need an active Pro subscription to deploy bots. Please subscribe first.' },
        { status: 403 }
      );
    }

    // 3. ── AGENT LIMIT: max 5 agents for Pro plan ──
    // Only count OTHER bots that are actually running or in-progress.
    // Exclude the current deployment (it was already approved by save-deployment).
    // Without this exclusion, save-deployment lets #5 through, then provision-server
    // sees 5 (including this one) and blocks — a classic off-by-one.
    const ACTIVE_STATUSES = ['pending', 'provisioning', 'deploying', 'active', 'running'];
    const { count: existingCount, error: countError } = await supabaseAdmin
      .from('claw_deployments')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', deployment.user_id)
      .in('status', ACTIVE_STATUSES)
      .neq('id', deploymentId);  // exclude current deployment from count

    if (!countError && existingCount >= MAX_AGENTS_PRO) {
      console.warn(`[Provision] Blocked: user ${deployment.user_id} already has ${existingCount}/${MAX_AGENTS_PRO} active agents (excluding current).`);
      return NextResponse.json(
        { success: false, error: `You have reached the maximum of ${MAX_AGENTS_PRO} active agents on the Pro plan. Please stop or delete an existing bot before deploying a new one.` },
        { status: 403 }
      );
    }

    if (deployment.droplet_id) {
      return NextResponse.json({ success: false, error: 'Server already provisioned for this deployment.' }, { status: 409 });
    }

    // 2. Generate cloud-init script
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';

    const cloudInit = generateCloudInit({
      deploymentId,
      aiModel: deployment.ai_model,
      apiKey: deployment.api_key,
      channel: deployment.channel,
      botToken: deployment.bot_token,
      botName: deployment.bot_name || 'Claw Bot',
      systemPrompt: deployment.system_prompt || 'You are a helpful AI assistant.',
      callbackUrl: `${appUrl}/api/deployments/callback`,
    });

    // 3. Update status to provisioning
    await supabaseAdmin
      .from('claw_deployments')
      .update({ status: 'provisioning', updated_at: new Date().toISOString() })
      .eq('id', deploymentId);

    // 4. Create Vultr instance (Force 'bom' to ignore all legacy DigitalOcean region codes in DB)
    const region = 'bom'; // Mumbai
    
    const instanceName = `claw-${deploymentId.slice(0, 8)}`;

    const instance = await createInstance({
      name: instanceName,
      region,
      plan: 'vc2-1c-2gb', // 1 vCPU, 2GB RAM
      userData: cloudInit,
    });

    // 5. Save instance ID immediately (reusing droplet_id column for backward compatibility)
    await supabaseAdmin
      .from('claw_deployments')
      .update({
        droplet_id: String(instance.id),
        region,
        status: 'provisioning',
        updated_at: new Date().toISOString()
      })
      .eq('id', deploymentId);

    // 6. Start background polling (fire-and-forget — don't await)
    // This updates the DB when instance becomes active, but we return immediately
    (async () => {
      try {
        const activeInstance = await waitForInstance(instance.id, 120000); // 120s timeout
        const ip = getInstanceIP(activeInstance) || activeInstance.ip;
        console.log(`[Provision] Vultr instance ${instance.id} is active, IP: ${ip}`);

        await supabaseAdmin
          .from('claw_deployments')
          .update({
            droplet_ip: ip,
            status: 'deploying',
            deployed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', deploymentId);
      } catch (bgErr) {
        console.log(`[Provision] Background poll: Instance ${instance.id} still provisioning, callback will update status.`, bgErr.message);
      }
    })();

    // Return immediately — the client will poll /api/deployments/[id]/status
    return NextResponse.json({
      success: true,
      dropletId: instance.id, // kept as dropletId for frontend compatibility
      status: 'provisioning',
      message: 'Server is being provisioned. Your bot will be live in 1–2 minutes.',
    });
  } catch (err) {
    console.error('Provision server error:', err);

    if (deploymentId) {
      // Revert status to error so it doesn't stay stuck in 'provisioning' forever
      await supabaseAdmin
        .from('claw_deployments')
        .update({ status: 'error' })
        .eq('id', deploymentId);
    }

    // Map known Vultr errors to user-friendly messages
    const friendlyError = getFriendlyError(err.message);

    return NextResponse.json(
      { success: false, error: friendlyError },
      { status: 500 }
    );
  }
}
