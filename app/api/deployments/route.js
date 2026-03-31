import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * GET /api/deployments?user_id=xxx
 * Returns deployments for a specific user. Uses service role key to bypass RLS.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    let query = supabaseAdmin
      .from('claw_deployments')
      .select('*')
      .order('created_at', { ascending: false });

    // Filter by user_id if provided
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Deployments] Fetch error:', error.message);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, deployments: data || [] });
  } catch (err) {
    console.error('[Deployments] Unexpected error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}
