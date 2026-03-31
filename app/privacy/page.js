import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'Privacy Policy | Claws',
  description: 'Privacy Policy for Claws AI Platform',
};

export default function PrivacyPage() {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{ flex: 1, padding: '140px 24px 60px', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 900, marginBottom: '40px', letterSpacing: '-0.02em' }}>Privacy Policy</h1>
        
        <div style={{ fontSize: '1.05rem', lineHeight: '1.7', color: 'var(--text-secondary)' }}>
          <p style={{ marginBottom: '20px' }}><strong>Last updated: March 2026</strong></p>

          <p style={{ marginBottom: '20px' }}>
            At Claws, we take your privacy seriously. This Privacy Policy outlines what data we collect, why we collect it, and how we protect it.
          </p>
          
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '40px', marginBottom: '16px' }}>1. Information We Collect</h2>
          <p style={{ marginBottom: '20px' }}>
            We collect the email address you use to sign up, as well as necessary billing information processed directly via our secure payment partners (we do not store raw credit card data). Additionally, we securely store the encrypted API keys and Bot Tokens you provide so your AI agents can function.
          </p>
          
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '40px', marginBottom: '16px' }}>2. How We Use Your Information</h2>
          <p style={{ marginBottom: '20px' }}>
            Your information is used strictly to provision, maintain, and manage your AI deployments on our infrastructure. We use your email to send you important account updates and deployment statuses.
          </p>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '40px', marginBottom: '16px' }}>3. Data Security and Isolation</h2>
          <p style={{ marginBottom: '20px' }}>
            We implement strict isolation. Your bot instances run on isolated Droplets. Database records containing your API keys are encrypted at rest. 
          </p>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '40px', marginBottom: '16px' }}>4. Third-Party Sharing</h2>
          <p style={{ marginBottom: '20px' }}>
            We do not sell or rent your personal data to third parties. We only share data with infrastructure partners (like our server providers and payment processors) necessary to deliver our services.
          </p>
          
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '40px', marginBottom: '16px' }}>5. Contact Us</h2>
          <p style={{ marginBottom: '20px' }}>
            If you have questions about this Privacy Policy or wish to request data deletion, contact us at <a href="mailto:sociallabs101@gmail.com" style={{ color: 'var(--accent)', fontWeight: 600 }}>sociallabs101@gmail.com</a>.
          </p>
        </div>
      </div>
      <Footer />
    </main>
  );
}
