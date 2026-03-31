export default function HowItWorks() {
  const steps = [
    { num: 1, title: "Create Workspace", desc: "Sign up and configure your secure AI workspace in just seconds." },
    { num: 2, title: "Connect Providers", desc: "Integrate with OpenAI, Anthropic, or any LLM via simple OAuth links." },
    { num: 3, title: "Deploy Agents", desc: "Your autonomous workforce is live. Chat via UI or plug into Discord/Slack." }
  ];

  return (
    <section className="how-it-works">
      <div className="section-container">
        <span className="section-label">Workflow</span>
        <h2 className="section-title">How It Works</h2>
        <div className="steps-grid">
          {steps.map((step, idx) => (
            <div key={idx} className="step-card">
              <div className="step-number">{step.num}</div>
              <h3 className="step-title">{step.title}</h3>
              <p className="step-desc">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
