import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request) {
  try {
    const { action, user_id } = await request.json(); // 'cancel' or 'resubscribe'

    if (!user_id) {
      return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });
    }

    const newStatus = action === 'cancel' ? 'cancelled' : 'active';
    const newPlan = action === 'cancel' ? 'free' : 'pro';

    // 1. Sync auth user_metadata
    const { error } = await supabaseAdmin.auth.admin.updateUserById(
      user_id,
      { user_metadata: { subscription_status: newStatus } }
    );

    // 2. Sync database profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        subscription_status: newStatus,
        subscription_plan: newPlan
      })
      .eq('id', user_id);
    if (profileError) console.error('Silent profile sync error:', profileError);

    if (error) throw error;

    return NextResponse.json({ success: true, status: newStatus });
  } catch (err) {
    console.error('Subscription error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
