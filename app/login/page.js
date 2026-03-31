'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import Image from 'next/image';

export default function Login() {
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'signup' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [msg, setMsg] = useState(null);

  // Explicitly upsert the profile row — belt-and-suspenders in case trigger fails
  const upsertProfile = async (userId, userEmail) => {
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email: userEmail,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id',
        ignoreDuplicates: false,
      });

    if (error) {
      console.error('Profile upsert error:', error.message);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMsg(null);

    try {
      if (authMode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;

        // Update profile with latest login timestamp
        if (data?.user) {
          await upsertProfile(data.user.id, data.user.email);
        }

        window.location.href = '/dashboard';
      } else if (authMode === 'signup') {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email, password })
        });
        
        const responseData = await res.json();

        if (!res.ok) {
          throw new Error(responseData.error || 'Failed to sign up');
        }

        // Direct login immediately without email confirmation
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (signInError) throw signInError;

        window.location.href = '/dashboard';
      } else if (authMode === 'forgot') {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }

        const res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email, newPassword: password })
        });
        
        const responseData = await res.json();

        if (!res.ok) {
          throw new Error(responseData.error || 'Failed to reset password');
        }

        setMsg('Password has been reset successfully. You can now log in.');
        setAuthMode('login');
        setConfirmPassword('');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <Link href="/" className="auth-logo">
            <span style={{ display: 'flex', alignItems: 'center' }}>
              <Image src="/logo.png" alt="Claws Logo" width={96} height={96} style={{ borderRadius: '24px' }} />
            </span>
            <span className="logo-text" style={{ fontSize: '1.8rem', marginLeft: '8px' }}>Claws</span>
          </Link>
          <h2 className="auth-title">
            {authMode === 'login' && 'Welcome back'}
            {authMode === 'signup' && 'Create an account'}
            {authMode === 'forgot' && 'Reset Password'}
          </h2>
          <p className="auth-subtitle">
            {authMode === 'login' && 'Enter your details to sign in.'}
            {authMode === 'signup' && 'Get started with Claws today.'}
            {authMode === 'forgot' && 'Enter your email and new password.'}
          </p>
        </div>

        {error && <div className="auth-alert auth-error">{error}</div>}
        {msg && <div className="auth-alert auth-success">{msg}</div>}

        <form onSubmit={handleAuth} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">
              {authMode === 'forgot' ? 'New Password' : 'Password'}
            </label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          {authMode === 'forgot' && (
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm New Password</label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
          )}

          {authMode === 'login' && (
            <div className="form-group" style={{ marginTop: '-10px', textAlign: 'right' }}>
              <button
                type="button"
                className="auth-toggle"
                style={{ fontSize: '13px' }}
                onClick={() => { setAuthMode('forgot'); setError(null); setMsg(null); setPassword(''); setConfirmPassword(''); }}
              >
                Forgot Password?
              </button>
            </div>
          )}

          <button type="submit" className="btn-auth" disabled={loading}>
            {loading ? 'Processing...' : (
              authMode === 'login' ? 'Sign In' : 
              authMode === 'signup' ? 'Create Account' : 
              'Reset Password'
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            {authMode === 'login' && "Don't have an account? "}
            {authMode !== 'login' && "Back to "}
            <button
              type="button"
              className="auth-toggle"
              onClick={() => { 
                setAuthMode(authMode === 'login' ? 'signup' : 'login'); 
                setError(null); 
                setMsg(null); 
                setPassword(''); 
                setConfirmPassword(''); 
              }}
            >
              {authMode === 'login' ? 'Sign up' : 'Log in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
