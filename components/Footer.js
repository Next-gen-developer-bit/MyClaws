'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';

export default function Footer() {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  return (
    <>
      <footer className="footer">
      <div className="footer-inner">
        <p className="footer-copy">&copy; 2025 Claws Cloud</p>
        <div className="footer-links">
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
          <a href="#" onClick={(e) => { e.preventDefault(); showToast('For any support and assistance, please write back to sociallabs101@gmail.com'); }}>Support</a>
        </div>
      </div>
    </footer>

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
            color: '#fff',
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
      <style jsx global>{`
        @keyframes toastSlideIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
