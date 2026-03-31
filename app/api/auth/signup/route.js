import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // 1. Create the user with the service role key, bypassing email confirmation
    const { data: userData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email so they can log in immediately
    });

    if (signUpError) {
      // If user already exists, Supabase throws an error.
      return NextResponse.json(
        { error: signUpError.message },
        { status: 400 }
      );
    }

    const user = userData.user;

    // 2. Insert into profiles using the admin key to bypass RLS
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id'
      });

    if (profileError) {
      console.error('Profile explicitly inserted failed:', profileError);
      // We don't fail the complete signup just because profile insert failed,
      // but log it. Usually, a database trigger handles this anyway.
    }

    return NextResponse.json(
      { message: 'Account created successfully', user },
      { status: 200 }
    );
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
