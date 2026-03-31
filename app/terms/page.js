import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'Terms of Service | Claws',
  description: 'Terms of Service for Claws AI Platform',
};

export default function TermsPage() {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{ flex: 1, padding: '140px 24px 60px', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 900, marginBottom: '40px', letterSpacing: '-0.02em' }}>Terms of Service</h1>
        
        <div style={{ fontSize: '1.05rem', lineHeight: '1.7', color: 'var(--text-secondary)' }}>
          <p style={{ marginBottom: '20px' }}><strong>Last updated: March 2026</strong></p>
          
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '40px', marginBottom: '16px' }}>1. Acceptance of Terms</h2>
          <p style={{ marginBottom: '20px' }}>
            By accessing and using Claws ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
          </p>
          
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '40px', marginBottom: '16px' }}>2. Description of Service</h2>
          <p style={{ marginBottom: '20px' }}>
            Claws provides an automated AI agent infrastructure platform. We provide the tools to deploy, manage, and scale AI assistants on infrastructure we provision on your behalf.
          </p>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '40px', marginBottom: '16px' }}>3. Subscriptions and Payments</h2>
          <p style={{ marginBottom: '20px' }}>
            Certain features of the Platform require a paid Pro subscription. Subscription fees are billed in advance on a recurring basis. Payments are processed securely via our payment provider. There are no refunds for partial subscriptions unless required by local law.
          </p>
          
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '40px', marginBottom: '16px' }}>4. User Responsibilities</h2>
          <p style={{ marginBottom: '20px' }}>
            You are responsible for the API keys and tokens you provide to the Platform. You agree not to use our bots for illegal, abusive, or spammy activities. We reserve the right to terminate accounts that violate these terms.
          </p>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '40px', marginBottom: '16px' }}>5. Limitation of Liability</h2>
          <p style={{ marginBottom: '20px' }}>
            Our services are provided "as is". Claws shall not be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, or goodwill.
          </p>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '40px', marginBottom: '16px' }}>6. Contact</h2>
          <p style={{ marginBottom: '20px' }}>
            If you have any questions regarding these Terms, you can contact us at <a href="mailto:sociallabs101@gmail.com" style={{ color: 'var(--accent)', fontWeight: 600 }}>sociallabs101@gmail.com</a>.
          </p>
        </div>
      </div>
      <Footer />
    </main>
  );
}
