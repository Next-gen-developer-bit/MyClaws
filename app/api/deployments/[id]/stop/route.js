import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { destroyInstance } from '@/lib/vultr';

/**
 * POST /api/deployments/[id]/stop
 * Destroys the VPS instance and marks the deployment as stopped.
 */
export async function POST(request, { params }) {
  try {
    const { id } = await params;

    // Fetch deployment
    const { data: deployment, error } = await supabaseAdmin
      .from('claw_deployments')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !deployment) {
      return NextResponse.json({ error: 'Deployment not found' }, { status: 404 });
    }

    // Destroy instance if it exists
    if (deployment.droplet_id) {
      try {
        await destroyInstance(deployment.droplet_id);
        console.log(`[Stop] Destroyed Vultr instance ${deployment.droplet_id} for deployment ${id}`);
      } catch (vultrErr) {
        console.error(`[Stop] Failed to destroy instance: ${vultrErr.message}`);
        // Continue anyway to update DB status
      }
    }

    // Update DB
    await supabaseAdmin
      .from('claw_deployments')
      .update({
        status: 'stopped',
        droplet_id: null,
        droplet_ip: null,
      })
      .eq('id', id);

    return NextResponse.json({ success: true, message: 'Deployment stopped and server destroyed.' });
  } catch (err) {
    console.error('Stop deployment error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
