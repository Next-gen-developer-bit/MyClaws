export default function Pricing() {
  const plans = [
    {
      name: "Pro",
      price: "$40",
      featured: true,
      tagline: "Handle complex automated workflows.",
      features: ["Up to 5 active agents", "Premium AI models", "API & Webhook access", "Priority support"]
    },
    {
      name: "Enterprise",
      price: "Custom",
      tagline: "For demanding high-volume workloads.",
      features: ["Dedicated infrastructure", "SSO integration", "Custom SLAs", "Dedicated success manager"]
    }
  ];

  return (
    <section className="pricing">
      <div className="section-container">
        <span className="section-label">Plans</span>
        <h2 className="section-title">Transparent pricing</h2>
        <p className="section-subtitle">Scale as you grow. No hidden platform fees.</p>
        <div className="pricing-grid">
          {plans.map((plan, idx) => (
            <div key={idx} className={`pricing-card ${plan.featured ? 'pricing-card-featured' : ''}`}>
              {plan.featured && <div className="plan-badge">Popular</div>}
              <h3 className="plan-name">{plan.name}</h3>
              <div className="plan-price">{plan.price}<span style={{ fontSize: '1rem', color: 'var(--text-tertiary)' }}>{plan.price !== 'Custom' ? '/mo' : ''}</span></div>
              <p className="plan-tagline">{plan.tagline}</p>
              <ul className="plan-features">
                {plan.features.map((feat, fIdx) => (
                  <li key={fIdx}>
                    <svg className="feat-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    {feat}
                  </li>
                ))}
              </ul>
              <a href="/login" className={`btn-plan ${plan.featured ? 'btn-plan-featured' : ''}`}>Get Started</a>
            </div>
          ))}
        </div>
        <p className="pricing-footnote">Need more power? <a href="/login">View dedicated CPU tiers</a></p>
      </div>
    </section>
  );
}
