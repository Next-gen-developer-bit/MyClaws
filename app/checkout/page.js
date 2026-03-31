'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import styles from './page.module.css';

function CheckoutContent() {
  const searchParams = useSearchParams();
  const plan = searchParams.get('plan') || 'pro';
  
  const isStarter = plan === 'starter';
  const planTitle = isStarter ? 'Starter Plan' : 'Pro Plan';
  const planPrice = isStarter ? '$20' : '$40';

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      setTimeout(() => {
        window.location.href = '/login';
      }, 2500);
    }, 2000);
  };

  return (
    <div className={styles.checkoutWrapper}>
      <Link href="/pricing" className={styles.backLink}>
        &larr; Back to Pricing
      </Link>
      
      {success ? (
        <div className={styles.successMessage}>
          <div className={styles.successIcon}>✓</div>
          <h2>Payment Successful!</h2>
          <p>Redirecting you to setup your workspace...</p>
        </div>
      ) : (
        <div className={styles.checkoutContainer}>
          <div className={styles.orderSummary}>
            <div className={styles.planBadge}>{planTitle}</div>
            <h2 className={styles.planTitle}>Complete your order</h2>
            <div className={styles.priceContainer}>
              <span className={styles.price}>{planPrice}</span>
              <span className={styles.period}>/month</span>
            </div>
            
            <ul className={styles.features}>
              {isStarter ? (
                <>
                  <li>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    2 vCPU, 4GB RAM
                  </li>
                  <li>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    40GB SSD Storage
                  </li>
                  <li>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    1 Active Instance
                  </li>
                  <li>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    Community support
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    4 vCPU, 8GB RAM
                  </li>
                  <li>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    80GB SSD Storage
                  </li>
                  <li>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    1 Active Instance
                  </li>
                  <li>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    Priority support
                  </li>
                </>
              )}
            </ul>
          </div>

          <div className={styles.paymentSection}>
            <h3 className={styles.paymentTitle}>Payment Details</h3>
            <form onSubmit={handleSubmit} className={styles.paymentForm}>
              <div className={styles.formGroup}>
                <label>Email Address</label>
                <input type="email" required placeholder="name@company.com" className={styles.input} />
              </div>

              <div className={styles.formGroup}>
                <label>Card Information</label>
                <div className={styles.cardInputWrapper}>
                  <input type="text" required placeholder="0000 0000 0000 0000" maxLength="19" className={`${styles.input} ${styles.cardNumber}`} />
                  <div className={styles.cardDetails}>
                    <input type="text" required placeholder="MM/YY" maxLength="5" className={styles.input} />
                    <input type="text" required placeholder="CVC" maxLength="4" className={styles.input} />
                  </div>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Cardholder Name</label>
                <input type="text" required placeholder="Name on card" className={styles.input} />
              </div>

              <button type="submit" disabled={loading} className={styles.payButton}>
                {loading ? 'Processing...' : `Pay ${planPrice}.00`}
              </button>
              <p className={styles.secureText}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0110 0v4"></path></svg>
                Guaranteed safe & secure checkout
              </p>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading checkout...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
