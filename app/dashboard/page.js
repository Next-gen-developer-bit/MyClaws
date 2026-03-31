'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import styles from './page.module.css';
import { supabase } from '../../lib/supabase';
import DeployModal from '../../components/DeployModal';

export default function DashboardPage() {
  const [userEmail, setUserEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [deployments, setDeployments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeNav, setActiveNav] = useState('dashboard');
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null); // null = loading, 'inactive' | 'active' | 'cancelled'
  const [toast, setToast] = useState(null); // { message, type: 'success'|'error' }
  const [confirmAction, setConfirmAction] = useState(null); // { message, onConfirm }

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const showConfirm = useCallback((message, onConfirm) => {
    setConfirmAction({ message, onConfirm });
  }, []);

  useEffect(() => {
    async function loadData() {
      if (!supabase) {
        setLoading(false);
        return;
      }

      // Get user session
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserEmail(session.user.email);
        if (session.user.user_metadata?.display_name) {
          setDisplayName(session.user.user_metadata.display_name);
        }

        // Fetch deployments via API route (bypasses RLS using service role key)
        let deps = [];
        const res = await fetch(`/api/deployments?user_id=${session.user.id}`, { cache: 'no-store' });
        const json = await res.json();
        if (json.success) {
          deps = json.deployments || [];
          setDeployments(deps);
        } else {
          console.error('Fetch deployments error:', json.error);
        }

        // Calculate subscription status from the profiles table (ONLY authoritative source)
        // Never trust user_metadata — it was tainted by a previous bug.
        let subStatus = 'inactive';
        try {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('subscription_plan, subscription_status')
            .eq('id', session.user.id)
            .single();

          if (profileData?.subscription_plan === 'pro' && profileData?.subscription_status === 'active') {
            subStatus = 'active';
          } else if (profileData?.subscription_status === 'cancelled') {
            subStatus = 'cancelled';
          }
          // else: no profile row, or plan is not pro/active → stays 'inactive'
        } catch (e) {
          console.error('Failed to fetch subscription status:', e);
          subStatus = 'inactive';
        }
        setSubscriptionStatus(subStatus);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  const refreshDeployments = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;
      const res = await fetch(`/api/deployments?user_id=${session.user.id}`, { cache: 'no-store' });
      const json = await res.json();
      if (json.success) setDeployments(json.deployments || []);
    } catch (err) {
      console.error('Refresh deployments error:', err);
    }
  };

  const ACTIVE_STATUSES = ['pending', 'provisioning', 'deploying', 'active', 'running'];
  const totalBots = deployments.length;
  const runningBots = deployments.filter(d => d.status === 'active' || d.status === 'running').length;
  const pendingBots = deployments.filter(d => d.status === 'pending' || d.status === 'provisioning' || d.status === 'deploying').length;
  const activeDeploymentCount = deployments.filter(d => ACTIVE_STATUSES.includes(d.status)).length;

  useEffect(() => {
    let timeout;
    if (pendingBots > 0) {
      // Only poll deployments created within the last 10 minutes to avoid
      // endless polling for old stuck deployments (saves Supabase credits).
      const tenMinAgo = Date.now() - 10 * 60 * 1000;
      const recentPending = deployments.find(d =>
        (d.status === 'pending' || d.status === 'provisioning' || d.status === 'deploying') &&
        new Date(d.created_at).getTime() > tenMinAgo
      );

      if (recentPending && recentPending.id) {
        timeout = setTimeout(() => {
          fetch(`/api/deployments/${recentPending.id}/status`)
            .then(() => refreshDeployments())
            .catch(() => refreshDeployments());
        }, 15000); // Poll every 15s instead of 5s
      }
    }
    return () => clearTimeout(timeout);
  }, [pendingBots, deployments]);

  const handleStop = async (id) => {
    showConfirm('Are you sure you want to stop this bot? It will be taken offline.', async () => {
      try {
        await fetch(`/api/deployments/${id}/stop`, { method: 'POST' });
        showToast('Bot stopped successfully.');
        refreshDeployments();
      } catch (e) {
        showToast('Failed to stop bot.', 'error');
        console.error(e);
      }
    });
  };

  const handleResume = async (id) => {
    if (subscriptionStatus !== 'active') {
      showToast('You need an active subscription to deploy or resume bots.', 'error');
      return;
    }
    setToast({ message: 'Resuming bot...', type: 'success' });
    try {
      const res = await fetch('/api/provision-server', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deploymentId: id })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Bot is resuming...');
        refreshDeployments();
      } else {
        showToast(data.error || 'Failed to resume bot.', 'error');
      }
    } catch (e) {
      showToast('Failed to resume bot.', 'error');
      console.error(e);
    }
  };

  const handleDelete = async (id) => {
    showConfirm('Are you sure you want to permanently delete this bot?', async () => {
      try {
        await fetch(`/api/deployments/${id}`, { method: 'DELETE' });
        showToast('Bot deleted successfully.');
        refreshDeployments();
      } catch (e) {
        showToast('Failed to delete bot.', 'error');
        console.error(e);
      }
    });
  };

  const handleToggleSubscription = async (action) => {
    try {
      // Get current user ID
      let userId = null;
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        userId = session?.user?.id || null;
      }
      const res = await fetch('/api/subscription/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, user_id: userId })
      });
      const data = await res.json();
      if (data.success) {
        setSubscriptionStatus(data.status);
        showToast(action === 'cancel' ? "Subscription cancelled." : "Successfully resubscribed!");
      }
    } catch (err) {
      console.error('Subscription error:', err);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': case 'running': return '#34d399';
      case 'pending': return '#fbbf24';
      case 'error': return '#f87171';
      default: return 'rgba(255,255,255,0.4)';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'active': case 'running': return 'Connected';
      case 'pending': return 'Pending';
      case 'error': return 'Error';
      default: return status || 'Unknown';
    }
  };

  const getChannelIcon = (channel) => {
    if (channel === 'telegram') return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.16 13.67l-2.965-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.993.889z"/></svg>
    );
    if (channel === 'discord') return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
    );
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={styles.container}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <a href="/" className={styles.sidebarLogo} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Image src="/logo.png" alt="Claws Logo" width={56} height={56} style={{ borderRadius: '14px' }} />
          <span className={styles.logoText} style={{ fontSize: '1.5rem', fontWeight: '800' }}>Claws</span>
        </a>

        <nav className={styles.sidebarNav}>
          <button
            className={`${styles.navItem} ${activeNav === 'dashboard' ? styles.navItemActive : ''}`}
            onClick={() => setActiveNav('dashboard')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            Dashboard
          </button>
          <button
            className={`${styles.navItem} ${activeNav === 'bots' ? styles.navItemActive : ''}`}
            onClick={() => setActiveNav('bots')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/></svg>
            My Bots
          </button>
          <button
            className={`${styles.navItem} ${activeNav === 'billing' ? styles.navItemActive : ''}`}
            onClick={() => setActiveNav('billing')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
            Billing
          </button>
          <button
            className={`${styles.navItem} ${activeNav === 'settings' ? styles.navItemActive : ''}`}
            onClick={() => setActiveNav('settings')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            Settings
          </button>
          <button
            className={`${styles.navItem} ${activeNav === 'support' ? styles.navItemActive : ''}`}
            onClick={() => setActiveNav('support')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            Support
          </button>
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.userBadge}>
            <div className={styles.userAvatar}>
              {(displayName || userEmail || 'U').charAt(0).toUpperCase()}
            </div>
            <div className={styles.userInfo}>
              <span className={styles.userName}>{displayName || 'User'}</span>
              <span className={styles.userPlan}>{subscriptionStatus === 'active' ? 'Pro Plan' : subscriptionStatus === 'cancelled' ? 'Cancelled' : 'Free'}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={styles.main}>
        {/* Header */}
        <header className={styles.header}>
          <div>
            <h1 className={styles.pageTitle}>
              {activeNav === 'bots' ? 'My Bots' : activeNav === 'settings' ? 'Settings' : activeNav === 'billing' ? 'Billing' : activeNav === 'support' ? 'Support' : 'Dashboard'}
            </h1>
            <p className={styles.pageSubtitle}>
              {activeNav === 'bots' ? 'Manage your active and pending bots' : activeNav === 'settings' ? 'Configure your account settings' : activeNav === 'billing' ? 'Manage your subscription' : activeNav === 'support' ? 'Get help and support' : 'Manage your AI assistant deployments'}
            </p>
          </div>
          <button 
            onClick={() => {
              if (subscriptionStatus !== 'active') {
                showToast(subscriptionStatus === 'cancelled' 
                  ? "Your subscription is cancelled. Please resubscribe in Billing to deploy bots." 
                  : "You need an active Pro subscription to deploy bots. Go to Billing to subscribe.", 'error');
                return;
              }
              setShowDeployModal(true);
            }} 
            className={styles.deployBtn}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Deploy New
          </button>
        </header>

        {loading ? (
          <div className={styles.loadingState}>
            <div className={styles.loadingSpinner} />
            <p>Loading your dashboard...</p>
          </div>
        ) : (
          <>
            {activeNav === 'dashboard' && (
              <>
                {/* Stats Cards */}
                <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statIcon} style={{ background: 'rgba(255, 59, 59, 0.1)', color: '#ff3b3b' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/></svg>
                </div>
                <div className={styles.statContent}>
                  <span className={styles.statValue}>{totalBots}</span>
                  <span className={styles.statLabel}>Total Bots</span>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statIcon} style={{ background: 'rgba(52, 211, 153, 0.1)', color: '#34d399' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                </div>
                <div className={styles.statContent}>
                  <span className={styles.statValue}>{runningBots}</span>
                  <span className={styles.statLabel}>Running</span>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statIcon} style={{ background: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </div>
                <div className={styles.statContent}>
                  <span className={styles.statValue}>{pendingBots}</span>
                  <span className={styles.statLabel}>Pending</span>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statIcon} style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                </div>
                <div className={styles.statContent}>
                  <span className={styles.statValue}>0</span>
                  <span className={styles.statLabel}>Messages</span>
                </div>
              </div>
            </div>

            {/* Two-column layout: Fleet Health + Recent Activity */}
            <div className={styles.twoCol}>
              {/* Fleet Health */}
              <div className={styles.panelCard}>
                <h3 className={styles.panelTitle}>Fleet Health</h3>
                <div className={styles.healthChart}>
                  <div className={styles.donutWrap}>
                    <svg viewBox="0 0 36 36" className={styles.donut}>
                      <path
                        d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="rgba(255,255,255,0.06)"
                        strokeWidth="3"
                      />
                      <path
                        d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#34d399"
                        strokeWidth="3"
                        strokeDasharray={`${totalBots > 0 ? (runningBots / totalBots) * 100 : 0}, 100`}
                        strokeLinecap="round"
                        style={{ transition: 'stroke-dasharray 0.6s ease' }}
                      />
                    </svg>
                    <div className={styles.donutCenter}>
                      <span className={styles.donutValue}>{totalBots}</span>
                    </div>
                  </div>
                  <div className={styles.healthLegend}>
                    <div className={styles.legendItem}>
                      <span className={styles.legendDot} style={{ background: '#34d399' }} />
                      Running <strong>{runningBots}</strong>
                    </div>
                    <div className={styles.legendItem}>
                      <span className={styles.legendDot} style={{ background: '#fbbf24' }} />
                      Pending <strong>{pendingBots}</strong>
                    </div>
                    <div className={styles.legendItem}>
                      <span className={styles.legendDot} style={{ background: '#f87171' }} />
                      Errors <strong>0</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className={styles.panelCard}>
                <h3 className={styles.panelTitle}>Recent Activity</h3>
                <div className={styles.activityList}>
                  {deployments.length === 0 ? (
                    <div className={styles.emptyActivity}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'rgba(255,255,255,0.2)' }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                      <p>No activity yet. Deploy your first bot!</p>
                    </div>
                  ) : (
                    deployments.slice(0, 5).map((dep, i) => (
                      <div key={dep.id || i} className={styles.activityItem}>
                        <div className={styles.activityDot} style={{ background: getStatusColor(dep.status) }} />
                        <div className={styles.activityContent}>
                          <span className={styles.activityText}>
                            <strong>{dep.bot_name || 'Unnamed Bot'}</strong> — {dep.channel} bot {dep.status === 'pending' ? 'created' : 'deployed'}
                          </span>
                          <span className={styles.activityTime}>{formatDate(dep.created_at)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            </>
            )}

            {activeNav === 'bots' && (
              <div className={styles.botsSection}>
              <div className={styles.botsSectionHeader}>
                <h3 className={styles.panelTitle}>Your Bots</h3>
              </div>

              {deployments.length === 0 ? (
                <div className={styles.emptyBots}>
                  <div className={styles.emptyBotIcon}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/></svg>
                  </div>
                  <p>No bots deployed yet</p>
                  <button 
                    onClick={() => {
                      if (subscriptionStatus !== 'active') { showToast('You need an active subscription. Go to Billing to subscribe.', 'error'); return; }
                      setShowDeployModal(true);
                    }} 
                    className={styles.emptyDeployBtn}
                  >Deploy your first bot</button>
                </div>
              ) : (
                <div className={styles.botsGrid}>
                  {deployments.map((dep, i) => (
                    <div key={dep.id || i} className={styles.botCard}>
                      <div className={styles.botCardHeader}>
                        <div className={styles.botCardName}>
                          <div className={styles.botCardIcon}>
                            {getChannelIcon(dep.channel)}
                          </div>
                          <div>
                            <h4>{dep.bot_name || 'Unnamed Bot'}</h4>
                            <span className={styles.botCardModel}>{dep.ai_model}</span>
                          </div>
                        </div>
                        <span className={styles.botCardStatus} style={{ color: getStatusColor(dep.status), background: `${getStatusColor(dep.status)}15` }}>
                          <span className={styles.statusDot} style={{ background: getStatusColor(dep.status) }} />
                          {getStatusLabel(dep.status)}
                        </span>
                      </div>
                      <div className={styles.botCardMeta}>
                        <span>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                          {dep.channel}
                        </span>
                        <span>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                          {formatDate(dep.created_at)}
                        </span>
                      </div>
                      <div className={styles.botCardActions}>
                        <button
                          className={styles.botActionBtn}
                          onClick={() => window.open(`/workspace?bot=${dep.id}`, '_blank')}
                        >Interact</button>
                        
                        {(dep.status === 'stopped' || dep.status === 'error') ? (
                          <button 
                            className={styles.botActionBtn}
                            style={{ background: 'rgba(52, 211, 153, 0.1)', color: '#34d399', border: '1px solid rgba(52, 211, 153, 0.2)' }}
                            onClick={() => handleResume(dep.id)}
                          >Resume</button>
                        ) : (
                          <button 
                            className={styles.botActionBtnDanger}
                            onClick={() => handleStop(dep.id)}
                          >Stop</button>
                        )}
                        
                        <button 
                          className={styles.botActionBtnDanger}
                          style={{ background: 'rgba(255, 59, 59, 0.1)', color: '#ff3b3b' }}
                          onClick={() => handleDelete(dep.id)}
                        >Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            )}

            {activeNav === 'settings' && (
              <div className={styles.panelCard} style={{ maxWidth: '600px', margin: '0 auto', padding: '30px' }}>
                <h3 className={styles.panelTitle} style={{ marginBottom: '20px' }}>Account Settings</h3>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.7)', marginBottom: '8px' }}>Email</label>
                  <input type="email" value={userEmail || ''} disabled style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '15px', cursor: 'not-allowed' }} />
                </div>
                <div style={{ marginBottom: '30px' }}>
                  <label style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.7)', marginBottom: '8px' }}>Display Name</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input type="text" value={displayName || ''} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your Name" style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '15px' }} />
                    <button 
                      onClick={async () => {
                        const { error } = await supabase.auth.updateUser({
                          data: { display_name: displayName }
                        });
                        if (error) {
                          showToast("Failed to update name: " + error.message, 'error');
                        } else {
                          showToast("Name updated successfully!");
                        }
                      }}
                      style={{ padding: '0 20px', background: '#34d399', color: '#000', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}
                    >
                      Save
                    </button>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    await supabase.auth.signOut();
                    window.location.href = '/login';
                  }}
                  style={{ width: '100%', padding: '14px', background: 'rgba(255, 59, 59, 0.1)', color: '#ff3b3b', border: '1px solid rgba(255, 59, 59, 0.2)', borderRadius: '8px', fontSize: '15px', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                  Log out
                </button>
              </div>
            )}

            {activeNav === 'support' && (
              <div className={styles.panelCard} style={{ maxWidth: '600px', margin: '0 auto', padding: '30px', textAlign: 'center' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '32px', background: 'rgba(41, 182, 246, 0.1)', color: '#29b6f6', marginBottom: '20px' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                </div>
                <h3 className={styles.panelTitle} style={{ fontSize: '24px', marginBottom: '10px' }}>
                  Contact Support
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '30px', lineHeight: '1.6' }}>
                  Need help with your deployments or have any questions? We're here to help. Reach out to us via email.
                </p>
                <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                  <button
                    onClick={() => showToast('For any support and assistance, please write back to sociallabs101@gmail.com')}
                    style={{ padding: '12px 24px', background: '#34d399', color: '#000', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                    Email sociallabs101@gmail.com
                  </button>
                </div>
              </div>
            )}

            {activeNav === 'billing' && (
              <div className={styles.panelCard} style={{ maxWidth: '600px', margin: '0 auto', padding: '30px', textAlign: 'center' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '32px', background: subscriptionStatus === 'active' ? 'rgba(255, 215, 0, 0.1)' : subscriptionStatus === 'cancelled' ? 'rgba(255, 59, 59, 0.1)' : 'rgba(255, 255, 255, 0.05)', color: subscriptionStatus === 'active' ? '#ffd700' : subscriptionStatus === 'cancelled' ? '#ff3b3b' : 'rgba(255,255,255,0.4)', marginBottom: '20px' }}>
                  {subscriptionStatus === 'active' ? (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>
                  ) : subscriptionStatus === 'cancelled' ? (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                  ) : (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                  )}
                </div>
                <h3 className={styles.panelTitle} style={{ fontSize: '24px', marginBottom: '10px' }}>
                  {subscriptionStatus === 'active' ? 'Pro Plan Active' : subscriptionStatus === 'cancelled' ? 'Subscription Cancelled' : 'No Active Subscription'}
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '30px', lineHeight: '1.6' }}>
                  {subscriptionStatus === 'active'
                    ? 'You are currently subscribed to the Claws Pro Plan, which allows you to deploy up to 5 AI agents.'
                    : subscriptionStatus === 'cancelled' 
                      ? 'Your subscription is cancelled. You cannot deploy any new bots. Re-subscribe to regain access.'
                      : 'You do not have an active subscription. Subscribe to the Pro Plan to start deploying AI agents.'}
                </p>
                <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                  {subscriptionStatus === 'active' && (
                    <>
                      <button
                        onClick={() => showToast("Billing is managed through Creem. Check your email for a link to the billing portal.")}
                        style={{ padding: '12px 24px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}
                      >
                        Manage Billing
                      </button>
                      <button
                        onClick={() => {
                          showConfirm('Are you sure you want to cancel your Pro Plan? You will not be able to deploy new bots.', () => {
                            handleToggleSubscription('cancel');
                          });
                        }}
                        style={{ padding: '12px 24px', background: 'transparent', color: '#ff3b3b', border: '1px solid rgba(255, 59, 59, 0.3)', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}
                      >
                        Cancel Subscription
                      </button>
                    </>
                  )}
                  {subscriptionStatus === 'cancelled' && (
                    <button
                      onClick={() => handleToggleSubscription('resubscribe')}
                      style={{ padding: '12px 24px', background: '#34d399', color: '#000', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}
                    >
                      Resubscribe Now
                    </button>
                  )}
                  {subscriptionStatus === 'inactive' && (
                    <a
                      href="/pricing"
                      style={{ padding: '12px 24px', background: '#34d399', color: '#000', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                    >
                      Subscribe to Pro Plan
                    </a>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {showDeployModal && (
        <DeployModal
          onClose={() => setShowDeployModal(false)}
          onDeployed={refreshDeployments}
          subscriptionStatus={subscriptionStatus}
          activeDeploymentCount={activeDeploymentCount}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '14px 20px',
            borderRadius: '10px',
            background: toast.type === 'error' ? 'rgba(248, 113, 113, 0.95)' : 'rgba(239, 68, 68, 0.85)',
            border: `1px solid ${toast.type === 'error' ? '#f87171' : '#fca5a5'}`,
            backdropFilter: 'blur(16px)',
            color: '#ffffff',
            fontSize: '15px',
            fontWeight: '600',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            animation: 'toastSlideIn 0.3s ease',
            maxWidth: '400px',
          }}
        >
          {toast.type === 'error' ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          )}
          <span style={{ color: '#fff' }}>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            style={{ marginLeft: '8px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: '2px', lineHeight: 1 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      )}

      {/* Confirm Toast */}
      {confirmAction && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 10000,
            padding: '18px 22px',
            borderRadius: '12px',
            background: 'rgba(251, 191, 36, 0.1)',
            border: '1px solid rgba(251, 191, 36, 0.25)',
            backdropFilter: 'blur(16px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            animation: 'toastSlideIn 0.3s ease',
            maxWidth: '420px',
            minWidth: '320px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <span style={{ color: '#fff', fontSize: '14px', lineHeight: '1.5' }}>{confirmAction.message}</span>
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setConfirmAction(null)}
              style={{ padding: '8px 18px', background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              onClick={() => { confirmAction.onConfirm(); setConfirmAction(null); }}
              style={{ padding: '8px 18px', background: '#ff3b3b', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}
            >
              Confirm
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes toastSlideIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
