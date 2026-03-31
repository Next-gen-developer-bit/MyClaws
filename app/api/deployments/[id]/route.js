import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * GET /api/deployments/[id]
 * Returns a single deployment by ID using service role (bypasses RLS).
 */
export async function GET(request, { params }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing deployment ID.' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('claw_deployments')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      console.error('[Deployment] Not found:', id, error?.message);
      return NextResponse.json({ success: false, error: 'Deployment not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, deployment: data });
  } catch (err) {
    console.error('[Deployment] Error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}

/**
 * DELETE /api/deployments/[id]
 * Destroys the VPS instance and removes the deployment completely.
 */
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing deployment ID.' }, { status: 400 });
    }

    // Fetch deployment to get droplet_id
    const { data: deployment, error: fetchErr } = await supabaseAdmin
      .from('claw_deployments')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !deployment) {
      return NextResponse.json({ success: false, error: 'Deployment not found.' }, { status: 404 });
    }

    // Terminate Vultr Instance if one exists
    if (deployment.droplet_id) {
      try {
        const { destroyInstance } = await import('@/lib/vultr');
        await destroyInstance(deployment.droplet_id);
      } catch (e) {
        console.error(`[Delete] Failed to destroy Vultr instance ${deployment.droplet_id}:`, e);
      }
    }

    // Delete DB record
    const { error: delErr } = await supabaseAdmin
      .from('claw_deployments')
      .delete()
      .eq('id', id);

    if (delErr) {
      console.error('[Delete] DB error:', delErr.message);
      return NextResponse.json({ success: false, error: 'Failed to delete record.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Deployment deleted successfully.' });
  } catch (err) {
    console.error('[Delete] Error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}
