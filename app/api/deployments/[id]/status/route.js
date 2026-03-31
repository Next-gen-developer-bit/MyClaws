import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getInstance, getInstanceIP } from '@/lib/vultr';

// Force dynamic - never cache status checks
export const dynamic = 'force-dynamic';

/**
 * GET /api/deployments/[id]/status
 * Returns the real-time status of a deployment by checking both DB and Vultr.
 */
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    console.log(`[Status Check] Looking up deployment: ${id}`);

    // Fetch from DB
    const { data: deployment, error } = await supabaseAdmin
      .from('claw_deployments')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !deployment) {
      console.error(`[Status Check] Deployment not found for id=${id}`, error?.message || 'No error details');
      return NextResponse.json({ error: 'Deployment not found', details: error?.message }, { status: 404 });
    }
    console.log(`[Status Check] Found deployment: status=${deployment.status}, instance_id=${deployment.droplet_id}`);

    let liveStatus = {
      dbStatus: deployment.status,
      dropletId: deployment.droplet_id,
      dropletIp: deployment.droplet_ip,
      region: deployment.region,
      deployedAt: deployment.deployed_at,
      botName: deployment.bot_name,
      channel: deployment.channel,
      aiModel: deployment.ai_model,
    };

    // If we have an instance, check its real status from Vultr
    if (deployment.droplet_id) {
      try {
        const instance = await getInstance(deployment.droplet_id);
        const ip = getInstanceIP(instance);
        liveStatus.dropletStatus = instance.status === 'active' && instance.power_status === 'running' ? 'active' : instance.status;
        liveStatus.dropletIp = ip || deployment.droplet_ip;
        liveStatus.dropletRegion = instance.region;
        liveStatus.dropletSize = instance.plan;
        liveStatus.dropletMemory = instance.ram;
        liveStatus.dropletVcpus = instance.vcpu_count;
        liveStatus.dropletDisk = instance.disk;

        // Update DB if instance has an IP and it changed
        if (ip && ip !== deployment.droplet_ip) {
          await supabaseAdmin
            .from('claw_deployments')
            .update({ droplet_ip: ip })
            .eq('id', id);
        }
      } catch (vultrErr) {
        liveStatus.dropletError = vultrErr.message;
      }
    }

    // If instance is active and has IP, try health check
    if (liveStatus.dropletIp && liveStatus.dropletStatus === 'active') {
      try {
        const healthRes = await fetch(`http://${liveStatus.dropletIp}:8080/health`, {
          signal: AbortSignal.timeout(5000),
        });
        if (healthRes.ok) {
          const health = await healthRes.json();
          liveStatus.botHealth = health;
          liveStatus.botRunning = true;

          // Update status to active if not already
          if (deployment.status !== 'active') {
            await supabaseAdmin
              .from('claw_deployments')
              .update({
                status: 'active',
                last_health_check: new Date().toISOString(),
              })
              .eq('id', id);
            liveStatus.dbStatus = 'active';
          }
        }
      } catch {
        liveStatus.botRunning = false;
      }
    }

    return NextResponse.json({ success: true, deployment: liveStatus });
  } catch (err) {
    console.error('Status check error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
