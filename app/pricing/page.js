import React from 'react';
import Link from 'next/link';
import styles from './page.module.css';

export default function PricingSelection() {
  return (
    <div className={styles.container}>
      <div className={styles.inner}>
        <Link href="/" className={styles.backLink}>
          &lt; Back to Home
        </Link>
        
        <div className={styles.label}>Pricing</div>
        <h1 className={styles.title}>Choose Your Plan</h1>
        <p className={styles.subtitle}>Deploy your own AI agents in minutes</p>
        
        <div className={styles.cards}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitleWrapper}>
                <h3 className={styles.cardTitle}>Pro</h3>
                <span className={styles.cardDesc}>4 vCPU, 8GB RAM, 80GB SSD · Best for production</span>
              </div>
              <div className={styles.cardPriceWrapper}>
                <span className={styles.cardPrice}>$40</span>
                <span className={styles.cardPeriod}>/mo</span>
              </div>
            </div>
            
            <div className={styles.specs}>
              {[
                "Up to 5 active agents",
                "Premium AI models",
                "Connect Telegram, Discord & Slack(coming soon)",
                "Priority support",
                "One click deployment"
              ].map((feat, i) => (
                <div key={i} className={styles.specRow} style={{ justifyContent: 'flex-start', borderBottom: 'none', padding: '8px 0' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '12px', flexShrink: 0}}><polyline points="20 6 9 17 4 12"></polyline></svg>
                  <span className={styles.specLabel} style={{ color: 'var(--text-secondary)' }}>{feat}</span>
                </div>
              ))}
            </div>
            
            <Link href="/checkout?plan=pro" className={styles.cardBtnPrimary}>
              Subscribe &rarr;
            </Link>
          </div>
        </div>

        <p className={styles.subtitle} style={{ marginTop: '30px', fontSize: '14px' }}>
          Need a custom plan? <Link href="mailto:sociallabs101@gmail.com" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>Contact us</Link> for Enterprise pricing.
        </p>
      </div>
    </div>
  );
}
