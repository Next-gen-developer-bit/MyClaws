import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * Callback endpoint that each VPS calls after deployment is complete.
 * The cloud-init script sends a POST here with the deployment status.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { deploymentId, status, ip } = body;

    if (!deploymentId) {
      return NextResponse.json({ error: 'Missing deploymentId' }, { status: 400 });
    }

    const updates = {};
    if (status) updates.status = status === 'running' ? 'active' : status;
    if (ip) updates.droplet_ip = ip;
    updates.last_health_check = new Date().toISOString();

    if (!updates.deployed_at) {
      updates.deployed_at = new Date().toISOString();
    }

    const { error } = await supabaseAdmin
      .from('claw_deployments')
      .update(updates)
      .eq('id', deploymentId);

    if (error) {
      console.error('Callback DB error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`[Callback] Deployment ${deploymentId} is now ${updates.status} at ${ip}`);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Callback error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
