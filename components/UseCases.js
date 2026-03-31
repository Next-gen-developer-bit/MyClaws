const useCases1 = [
  "Summarize long documents", "Notify before a meeting", "Schedule meetings from chat", 
  "Read & summarize emails", "Manage subscriptions", "Remind you of deadlines", 
  "Plan your week", "Take meeting notes"
];

const useCases2 = [
  "Find discount codes", "Price-drop alerts", "Compare product specs", 
  "Negotiate deals", "Run payroll calculations", "Create social posts"
];

const useCases3 = [
  "Write contracts and NDAs", "Research competitors", "Screen and prioritize leads", 
  "Generate invoices", "Draft job descriptions", "Run standup summaries", 
  "Track OKRs and KPIs", "Monitor news and alerts"
];

function TagRow({ items, reverse = false }) {
  return (
    <div className="tags-row">
      <div className={`tags-track ${reverse ? 'tags-track-reverse' : 'tags-track-normal'}`}>
        {[...items, ...items].map((item, idx) => (
          <span key={idx} className="tag">{item}</span>
        ))}
      </div>
    </div>
  );
}

export default function UseCases() {
  return (
    <section className="use-cases">
      <div className="section-container">
        <span className="section-label">Solutions</span>
        <h2 className="section-title">What can Claws automate?</h2>
        <p className="section-subtitle">Unlock thousands of custom agent workflows.</p>
        <div className="tags-marquee-wrapper">
          <TagRow items={useCases1} />
          <TagRow items={useCases2} reverse />
          <TagRow items={useCases3} />
        </div>
        <p className="use-cases-footnote">You can instruct agents with natural language in seconds.</p>
      </div>
    </section>
  );
}
