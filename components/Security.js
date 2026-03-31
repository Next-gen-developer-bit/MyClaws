export default function Security() {
  const securityItems = [
    { 
      title: "Dedicated VM Per User", 
      desc: "Every workspace runs in its own isolated virtual machine with separate compute, networking, and storage. Your data never shares infrastructure with other users.",
      icon: (
        <>
          <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
          <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
          <line x1="6" y1="6" x2="6.01" y2="6"></line>
          <line x1="6" y1="18" x2="6.01" y2="18"></line>
        </>
      )
    },
    { 
      title: "Private Encrypted Network", 
      desc: "All communication between your browser and your agents travels over encrypted private channels. Gateway endpoints are never exposed to the public internet.",
      icon: (
        <>
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </>
      )
    },
    { 
      title: "Zero-Trust Authentication", 
      desc: "Every request is verified with session authentication, origin validation, and ownership checks. CSRF protection and rate limiting are built in at every layer.",
      icon: (
        <>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          <polyline points="9 12 11 14 15 10"></polyline>
        </>
      )
    },
    { 
      title: "Secure Credential Storage", 
      desc: "Your API keys and OAuth tokens are never stored in plaintext. Credentials use cryptographic derivation with hash-only storage and automatic rotation.",
      icon: (
        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path>
      )
    }
  ];

  return (
    <section className="security">
      <div className="section-container">
        <span className="section-label">Protection</span>
        <h2 className="section-title">Enterprise Security First</h2>
        <div className="security-grid">
          {securityItems.map((item, idx) => (
            <div key={idx} className="security-card">
              <div className="security-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {item.icon}
                </svg>
              </div>
              <h3 className="security-title">{item.title}</h3>
              <p className="security-desc">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
