export default function Hero() {
  return (
    <section className="hero">
      <div className="hero-content">
        <div className="hero-badge">AI Agent Infrastructure Platform</div>
        <h1 className="hero-title">
          Build & Deploy <br />
          <span className="hero-title-highlight">Agents Instantly.</span>
        </h1>
        <p className="hero-subtitle">
          Scale your autonomous AI workforce with zero configuration. No servers to provision. Maximum security by default. Just deploy and scale.
        </p>
        <div className="hero-cta">
          <a href="/pricing" className="btn-primary">
            Start Deploying &nbsp;&rarr;
          </a>
          <span className="no-credit">
            <svg className="check-icon" viewBox="0 0 20 20" fill="currentColor" width="20" height="20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            No credit card required
          </span>
        </div>
      </div>
    </section>
  );
}
