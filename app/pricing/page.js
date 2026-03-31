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
              <div className={styles.specRow}>
                <span className={styles.specLabel}>CPU</span>
                <span className={styles.specValue}>4 vCPU</span>
              </div>
              <div className={styles.specRow}>
                <span className={styles.specLabel}>RAM</span>
                <span className={styles.specValue}>8 GB</span>
              </div>
              <div className={styles.specRow}>
                <span className={styles.specLabel}>Storage</span>
                <span className={styles.specValue}>80 GB SSD</span>
              </div>
              <div className={styles.specRow}>
                <span className={styles.specLabel}>Agents</span>
                <span className={styles.specValue}>Up to 5</span>
              </div>
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
