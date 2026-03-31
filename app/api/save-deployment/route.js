import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request) {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { success: false, error: 'Supabase is not configured.' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();

    const {
      user_id,
      ai_model,
      api_key,
      channel,
      bot_token,
      bot_name,
      persona_template,
      system_prompt,
    } = body;

    // Validate required fields
    if (!ai_model || !api_key || !channel || !bot_token || !system_prompt) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: ai_model, api_key, channel, bot_token, system_prompt.' },
        { status: 400 }
      );
    }

    if (!user_id) {
      return NextResponse.json(
        { success: false, error: 'Missing user_id. You must be logged in.' },
        { status: 400 }
      );
    }

    // ── SUBSCRIPTION GATE: verify user has active Pro subscription ──
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('subscription_plan, subscription_status')
      .eq('id', user_id)
      .single();

    const hasActiveSubscription =
      profile &&
      profile.subscription_plan === 'pro' &&
      profile.subscription_status === 'active';

    if (!hasActiveSubscription) {
      return NextResponse.json(
        { success: false, error: 'You need an active Pro subscription to deploy bots. Please subscribe first.' },
        { status: 403 }
      );
    }

    // ── AGENT LIMIT: max 5 agents for Pro plan ──
    // Only count bots that are actually running or in-progress (not stopped/error ones)
    const MAX_AGENTS_PRO = 5;
    const ACTIVE_STATUSES = ['pending', 'provisioning', 'deploying', 'active', 'running'];
    const { count: existingCount } = await supabaseAdmin
      .from('claw_deployments')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user_id)
      .in('status', ACTIVE_STATUSES);

    if (existingCount >= MAX_AGENTS_PRO) {
      return NextResponse.json(
        { success: false, error: `You have reached the maximum of ${MAX_AGENTS_PRO} active agents on the Pro plan. Please stop or delete an existing bot before deploying a new one.` },
        { status: 403 }
      );
    }

    const { data: inserted, error } = await supabaseAdmin
      .from('claw_deployments')
      .insert([
        {
          user_id,
          ai_model,
          api_key,
          channel,
          bot_token,
          bot_name: bot_name || '',
          persona_template: persona_template || null,
          system_prompt,
          status: 'pending',
        },
      ])
      .select('id')
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    console.log('[Save Deployment] Successfully inserted, returned id:', inserted?.id, 'for user:', user_id);
    return NextResponse.json({ success: true, deploymentId: inserted?.id });
  } catch (err) {
    console.error('Save deployment error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to save deployment.' },
      { status: 500 }
    );
  }
}
