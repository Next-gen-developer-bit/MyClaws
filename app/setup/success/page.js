'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import styles from './page.module.css';

function SuccessContent() {
  const searchParams = useSearchParams();
  const [countdown, setCountdown] = useState(8);
  const [provisionStatus, setProvisionStatus] = useState('starting'); // starting | provisioning | deploying | active | error
  const [statusMessage, setStatusMessage] = useState('Initializing deployment...');
  const [errorMsg, setErrorMsg] = useState(null);

  const deploymentId = searchParams.get('deployment_id') || '';
  const checkoutId = searchParams.get('checkout_id') || '';
  const orderId = searchParams.get('order_id') || '';
  const subscriptionId = searchParams.get('subscription_id') || '';
  const skipCheckout = searchParams.get('skip_checkout') === '1';

  // Trigger server provisioning
  useEffect(() => {
    if (!deploymentId) return;

    async function provision() {
      // NOTE: Do NOT set subscription_status here.
      // Subscription upgrades must only happen via verified payment webhook/callback.
      // The provision-server API will verify subscription server-side.

      setProvisionStatus('provisioning');
      setStatusMessage('Provisioning your server...');

      try {
        const res = await fetch('/api/provision-server', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deploymentId }),
        });
        const data = await res.json();

        if (data.success) {
          setProvisionStatus('deploying');
          setStatusMessage('Server created! Deploying your bot...');

          // Poll for deployment status
          pollStatus(deploymentId);
        } else {
          setProvisionStatus('error');
          setErrorMsg(data.error || 'Failed to provision server.');
          setStatusMessage('Provisioning failed');
        }
      } catch {
        setProvisionStatus('error');
        setErrorMsg('Network error. Please try again.');
        setStatusMessage('Provisioning failed');
      }
    }

    provision();
  }, [deploymentId]);

  // Poll deployment status
  async function pollStatus(depId) {
    let attempts = 0;
    const maxAttempts = 40; // 40 * 5s = 200s max

    const interval = setInterval(async () => {
      attempts++;
      if (attempts > maxAttempts) {
        clearInterval(interval);
        setProvisionStatus('deploying');
        setStatusMessage('Bot is deploying. Check your dashboard for updates.');
        return;
      }

      try {
        const res = await fetch(`/api/deployments/${depId}/status`);
        const data = await res.json();

        if (data.success) {
          const dep = data.deployment;
          if (dep.botRunning || dep.dbStatus === 'active') {
            clearInterval(interval);
            setProvisionStatus('active');
            setStatusMessage('Your bot is live and running!');
          } else if (dep.dbStatus === 'deploying' || dep.dropletStatus === 'active') {
            setStatusMessage('Server is ready. Starting your bot...');
          } else if (dep.dbStatus === 'provisioning') {
            setStatusMessage('Server is booting up...');
          }
        }
      } catch {
        // Silent fail, keep polling
      }
    }, 5000);
  }

  // Countdown to dashboard redirect
  useEffect(() => {
    if (provisionStatus !== 'active' && provisionStatus !== 'error') return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          window.location.href = '/dashboard';
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [provisionStatus]);

  const statusSteps = [
    { key: 'starting', label: skipCheckout ? 'Pro plan confirmed' : 'Payment confirmed' },
    { key: 'provisioning', label: 'Provisioning server' },
    { key: 'deploying', label: 'Deploying your bot' },
    { key: 'active', label: 'Bot is live!' },
  ];

  const getStepStatus = (stepKey) => {
    const order = ['starting', 'provisioning', 'deploying', 'active'];
    const currentIdx = order.indexOf(provisionStatus);
    const stepIdx = order.indexOf(stepKey);
    if (provisionStatus === 'error') {
      return stepIdx <= 0 ? 'done' : stepIdx === 1 ? 'error' : 'pending';
    }
    if (stepIdx < currentIdx) return 'done';
    if (stepIdx === currentIdx) return 'current';
    return 'pending';
  };

  return (
    <div className={styles.container}>
      {/* Background effects */}
      <div className={styles.particles}>
        {[...Array(20)].map((_, i) => (
          <div key={i} className={styles.particle} style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 3}s`,
            animationDuration: `${3 + Math.random() * 4}s`,
          }} />
        ))}
      </div>
      <div className={styles.orb1} />
      <div className={styles.orb2} />

      <div className={styles.card}>
        {/* Success icon */}
        <div className={styles.iconWrap}>
          <div className={styles.iconCircle}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div className={styles.iconRing} />
          <div className={styles.iconRing2} />
        </div>

        <h1 className={styles.title}>{skipCheckout ? 'Deploying...' : 'Payment Successful!'}</h1>
        <p className={styles.subtitle}>
          {skipCheckout ? 'Your Claws Pro plan is active. Deploying your AI assistant...' : 'Your Claws Pro plan is now active. Deploying your AI assistant...'}
        </p>

        {/* Deployment Progress */}
        <div className={styles.progressSection}>
          {statusSteps.map((step, i) => {
            const status = getStepStatus(step.key);
            return (
              <div key={step.key} className={`${styles.progressStep} ${styles[`step_${status}`]}`}>
                <div className={styles.stepIndicator}>
                  {status === 'done' ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  ) : status === 'current' ? (
                    <div className={styles.stepSpinner} />
                  ) : status === 'error' ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  ) : (
                    <span className={styles.stepNumber}>{i + 1}</span>
                  )}
                </div>
                <span className={styles.stepLabel}>{step.label}</span>
              </div>
            );
          })}
        </div>

        {/* Status message */}
        <div className={styles.statusBar}>
          {provisionStatus !== 'error' && provisionStatus !== 'active' && (
            <div className={styles.statusSpinner} />
          )}
          <span>{statusMessage}</span>
        </div>

        {errorMsg && (
          <p className={styles.errorText}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {errorMsg}
          </p>
        )}

        {/* Order details */}
        <div className={styles.details}>
          <div className={styles.detailRow}>
            <span>Plan</span>
            <strong>Claws Pro</strong>
          </div>
          <div className={styles.detailRow}>
            <span>Billing</span>
            <strong>$40/month</strong>
          </div>
          {orderId && (
            <div className={styles.detailRow}>
              <span>Order</span>
              <strong className={styles.mono}>{orderId.slice(0, 16)}…</strong>
            </div>
          )}
        </div>

        {/* CTA */}
        <a href="/dashboard" className={styles.ctaBtn}>
          Go to Dashboard
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
          </svg>
        </a>

        {(provisionStatus === 'active' || provisionStatus === 'error') && (
          <p className={styles.redirectText}>
            Redirecting to dashboard in <strong>{countdown}s</strong>
          </p>
        )}
      </div>

      <p className={styles.footer}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        {skipCheckout ? 'Deploying under your existing Pro plan subscription.' : 'Payment secured by Creem. A receipt has been sent to your email.'}
      </p>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d0a0a', color: '#fff' }}>
        Loading...
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
