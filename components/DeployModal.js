'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import styles from './DeployModal.module.css';

const TOTAL_STEPS = 4;

const AI_MODELS = [
  { id: 'claude', name: 'Claude', provider: 'Anthropic', placeholder: 'sk-ant-...' },
  { id: 'chatgpt', name: 'ChatGPT', provider: 'OpenAI', placeholder: 'sk-...' },
  { id: 'gemini', name: 'Gemini', provider: 'Google', placeholder: 'AIza...' },
];

const PERSONA_TEMPLATES = [
  { id: 'compass', name: 'Compass', desc: 'Customer support & ticket management', badge: 'Popular', prompt: '# Compass - The Support Agent\n\nYou are Compass, an AI customer support agent powered by Claws.\n\n## Core Identity\n- **Role:** Customer support responder and ticket manager\n- **Personality:** Empathetic, patient, solution-oriented\n- **Communication:** Warm, clear, professional\n\n## Responsibilities\n1. **Ticket Triage** – Categorize incoming tickets by urgency\n2. **Response Drafting** – Draft responses using knowledge base articles\n3. **Escalation** – Recognize when to escalate to a human\n4. **Reporting** – Track average response time\n\n## Guidelines\n- Acknowledge the customer\'s frustration first\n- Provide step-by-step solutions\n- Follow up on unresolved tickets\n- Never promise what you cannot deliver' },
  { id: 'radar', name: 'Radar', desc: 'Data analyst & insights generator', badge: 'Popular', prompt: '# Radar - The Data Analyst\n\nYou are Radar, an AI data analyst and reporting assistant powered by Claws.\n\n## Core Identity\n- **Role:** Data analyst and insights generator\n- **Personality:** Precise, analytical, insightful\n- **Communication:** Clear, data-driven, visual\n\n## Responsibilities\n1. **Analysis** – Analyze datasets, identify patterns\n2. **Reporting** – Create reports with key metrics\n3. **Recommendations** – Suggest actionable recommendations\n4. **Quality** – Flag data quality issues proactively' },
  { id: 'atlas', name: 'Atlas', desc: 'Technical strategy & architecture', badge: '', prompt: '# Atlas - The Tech Advisor\n\nYou are Atlas, an AI technical strategy and architecture advisor powered by Claws.\n\n## Core Identity\n- **Role:** Technical strategist and system architect\n- **Personality:** Thoughtful, thorough, forward-thinking\n- **Communication:** Technical but accessible, structured\n\n## Responsibilities\n1. **Architecture** – Evaluate technical architectures\n2. **Technology** – Recommend technology stacks\n3. **Performance** – Identify scalability bottlenecks\n4. **Best Practices** – Guide engineering best practices' },
  { id: 'quill', name: 'Quill', desc: 'Content writer & script creator', badge: '', prompt: '# Quill - The Content Creator\n\nYou are Quill, an AI content writer and script creator powered by Claws.\n\n## Core Identity\n- **Role:** Content strategist, writer, and editor\n- **Personality:** Creative, articulate, versatile\n- **Communication:** Engaging, polished, audience-aware\n\n## Responsibilities\n1. **Writing** – Write blogs, emails, social media posts\n2. **Brand Voice** – Adapt tone to match brand guidelines\n3. **Editing** – Edit, proofread, and refine existing content\n4. **Strategy** – Generate outlines and content calendars' },
  { id: 'sage', name: 'Sage', desc: 'Research assistant & knowledge builder', badge: '', prompt: '# Sage - The Researcher\n\nYou are Sage, an AI research assistant and knowledge synthesizer powered by Claws.\n\n## Core Identity\n- **Role:** Researcher and knowledge base builder\n- **Personality:** Curious, methodical, comprehensive\n- **Communication:** Structured, well-sourced, balanced' },
  { id: 'nexus', name: 'Nexus', desc: 'Calendar, email & task management', badge: '', prompt: '# Nexus - The Productivity Agent\n\nYou are Nexus, an AI productivity and task management assistant powered by Claws.\n\n## Core Identity\n- **Role:** Productivity coordinator and scheduler\n- **Personality:** Organized, proactive, efficient\n- **Communication:** Concise, action-oriented, respectful of time' },
];

const DEFAULT_PROMPT = `# AI Assistant

You are a versatile AI assistant powered by Claws, ready to help with any task.

## Core Identity
- **Role:** General-purpose helper
- **Personality:** Friendly, adaptive, reliable
- **Communication:** Clear, conversational, helpful

## Guidelines
- Adapt your tone and detail level to the user's needs
- Ask clarifying questions when the request is ambiguous
- Be honest when you don't know something`;

const MAX_AGENTS_PRO = 5;

export default function DeployModal({ onClose, onDeployed, subscriptionStatus, activeDeploymentCount = 0 }) {
  const [step, setStep] = useState(1);

  // Step 1 – Model & API Key
  const [selectedModel, setSelectedModel] = useState('claude');
  const [apiKey, setApiKey] = useState('');
  const [keyStatus, setKeyStatus] = useState(null); // null | 'loading' | 'valid' | 'invalid'
  const [keyError, setKeyError] = useState(null);

  // Step 2 – Channel & Bot Token
  const [channel, setChannel] = useState('telegram');
  const [botToken, setBotToken] = useState('');
  const [botName, setBotName] = useState('');
  const [tokenStatus, setTokenStatus] = useState(null);
  const [tokenError, setTokenError] = useState(null);
  const [tokenInfo, setTokenInfo] = useState('');

  // Step 3 – Persona
  const [personaTab, setPersonaTab] = useState('templates');
  const [selectedPersona, setSelectedPersona] = useState(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [previewPersona, setPreviewPersona] = useState(null);

  // Step 4 – Provisioning
  const [provisionStage, setProvisionStage] = useState(null); // null | 'saving' | 'provisioning' | 'deploying' | 'active' | 'error'
  const [provisionError, setProvisionError] = useState(null);

  // ── Validation ──
  const handleValidateKey = async () => {
    const key = apiKey.trim();
    if (!key) return;
    setKeyStatus('loading');
    setKeyError(null);
    try {
      const res = await fetch('/api/validate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: selectedModel, key }),
      });
      const data = await res.json();
      if (data.valid) {
        setKeyStatus('valid');
      } else {
        setKeyStatus('invalid');
        setKeyError(data.error || 'Invalid API key.');
      }
    } catch {
      setKeyStatus('invalid');
      setKeyError('Network error.');
    }
  };

  const handleValidateToken = async () => {
    const token = botToken.trim();
    if (!token) return;
    setTokenStatus('loading');
    setTokenError(null);
    setTokenInfo('');
    try {
      const res = await fetch('/api/validate-bot-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, token }),
      });
      const data = await res.json();
      if (data.valid) {
        setTokenStatus('valid');
        setTokenInfo(data.info || '');
        if (data.botName && !botName.trim()) setBotName(data.botName);
      } else {
        setTokenStatus('invalid');
        setTokenError(data.error || 'Token validation failed.');
      }
    } catch {
      setTokenStatus('invalid');
      setTokenError('Network error.');
    }
  };

  // ── Deploy ──
  const handleDeploy = async () => {
    // Block cancelled subscriptions
    if (subscriptionStatus === 'cancelled') {
       setProvisionStage('error');
       setProvisionError('Your subscription is cancelled. Please resubscribe to deploy a new bot.');
       return;
    }

    // Block if agent limit reached (only count active bots)
    if (activeDeploymentCount >= MAX_AGENTS_PRO) {
       setProvisionStage('error');
       setProvisionError(`You have reached the maximum of ${MAX_AGENTS_PRO} active agents on the Pro plan. Please stop or delete an existing bot before deploying a new one.`);
       return;
    }

    const prompt = customPrompt || DEFAULT_PROMPT;
    const hasProPlan = subscriptionStatus === 'active';

    // If user does NOT have a pro plan, go straight to checkout — do NOT save deployment first
    if (!hasProPlan) {
      setProvisionStage('checkout');
      setProvisionError(null);

      try {
        // Save deployment first so we have an ID for the checkout metadata
        let userId = null;
        if (supabase) {
          const { data: { session } } = await supabase.auth.getSession();
          userId = session?.user?.id || null;
        }

        const saveRes = await fetch('/api/save-deployment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            ai_model: selectedModel,
            api_key: apiKey,
            channel,
            bot_token: botToken,
            bot_name: botName,
            persona_template: selectedPersona || null,
            system_prompt: prompt,
          }),
        });
        const saveData = await saveRes.json();

        if (!saveData.success) {
          setProvisionStage('error');
          setProvisionError(saveData.error || 'Failed to save configuration.');
          return;
        }

        const deploymentId = saveData.deploymentId;

        const checkoutRes = await fetch('/api/create-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: 'prod_Kvur9bmUuwY1FYegEb4H3',
            successUrl: `${window.location.origin}/setup/success?deployment_id=${deploymentId}`,
            metadata: {
              deployment_id: deploymentId,
              ai_model: selectedModel,
              channel,
              bot_name: botName,
            },
          }),
        });
        const checkoutData = await checkoutRes.json();
        if (checkoutData.success && checkoutData.checkoutUrl) {
          window.location.href = checkoutData.checkoutUrl;
        } else {
          setProvisionStage('error');
          setProvisionError(checkoutData.error || 'Failed to initiate payment.');
        }
      } catch (e) {
        setProvisionStage('error');
        setProvisionError('Network error while initiating payment.');
      }
      return;
    }

    // User HAS a verified pro plan — save and go directly to deployment
    setProvisionStage('saving');
    setProvisionError(null);

    try {
      let userId = null;
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        userId = session?.user?.id || null;
      }

      // 1. Save deployment
      const saveRes = await fetch('/api/save-deployment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          ai_model: selectedModel,
          api_key: apiKey,
          channel,
          bot_token: botToken,
          bot_name: botName,
          persona_template: selectedPersona || null,
          system_prompt: prompt,
        }),
      });
      const saveData = await saveRes.json();
      if (!saveData.success) {
        setProvisionStage('error');
        setProvisionError(saveData.error || 'Failed to save.');
        return;
      }

      const deploymentId = saveData.deploymentId;
      window.location.href = `${window.location.origin}/setup/success?deployment_id=${deploymentId}&skip_checkout=1`;
    } catch {
      setProvisionStage('error');
      setProvisionError('Network error. Please try again.');
    }
  };

  const pollDeploymentStatus = (depId) => {
    let attempts = 0;
    const maxAttempts = 90; // ~7.5 minutes (cloud-init can be slow)
    let consecutiveErrors = 0;

    const interval = setInterval(async () => {
      attempts++;
      console.log(`[Deploy Poll] Attempt ${attempts}/${maxAttempts} for ${depId}`);

      if (attempts > maxAttempts) {
        clearInterval(interval);
        // Don't silently mark as active — show a timeout message
        setProvisionStage('error');
        setProvisionError('Deployment is taking longer than expected. Check your dashboard for status updates.');
        return;
      }
      try {
        const res = await fetch(`/api/deployments/${depId}/status?t=${Date.now()}`, {
          cache: 'no-store',
        });
        const data = await res.json();
        console.log(`[Deploy Poll] Response:`, res.status, data);

        if (res.status === 404) {
          consecutiveErrors++;
          console.warn(`[Deploy Poll] 404 - deployment not found (${consecutiveErrors} consecutive errors)`);
          // After 5 consecutive 404s, something is wrong
          if (consecutiveErrors >= 5) {
            clearInterval(interval);
            setProvisionStage('error');
            setProvisionError('Could not find deployment record. The deployment may have failed to save properly.');
          }
          return;
        }

        consecutiveErrors = 0; // Reset on success

        if (data.success) {
          const dep = data.deployment;
          if (dep.botRunning || dep.dbStatus === 'active') {
            clearInterval(interval);
            setProvisionStage('active');
          } else if (dep.dbStatus === 'deploying' || dep.dropletStatus === 'active') {
            setProvisionStage('deploying');
          }
        }
      } catch (err) {
        consecutiveErrors++;
        console.error(`[Deploy Poll] Error:`, err.message);
        if (consecutiveErrors >= 5) {
          clearInterval(interval);
          setProvisionStage('error');
          setProvisionError('Network error while checking deployment status. Please check your dashboard.');
        }
      }
    }, 5000);
  };

  // ── Navigation helpers ──
  const canProceed = () => {
    if (step === 1) return apiKey.trim().length > 0;
    if (step === 2) return botToken.trim().length > 0;
    if (step === 3) return (selectedPersona || customPrompt.trim().length > 0);
    return true;
  };

  const getPrompt = () => {
    if (customPrompt) return customPrompt;
    const t = PERSONA_TEMPLATES.find(p => p.id === selectedPersona);
    return t?.prompt || DEFAULT_PROMPT;
  };

  const modelObj = AI_MODELS.find(m => m.id === selectedModel);

  // ── Provision Progress View ──
  if (provisionStage) {
    const stages = ['saving', 'provisioning', 'checkout', 'deploying', 'active'];
    const stageIdx = stages.indexOf(provisionStage);
    const isError = provisionStage === 'error';

    const stageLabels = [
      'Saving configuration...',
      'Creating VPS server...',
      'Redirecting to payment...',
      'Deploying your bot...',
      'Bot is live!',
    ];

    return (
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <h2>Deploying Bot</h2>
              <p>{botName || 'Your AI Assistant'}</p>
            </div>
            {(provisionStage === 'active' || isError) && (
              <button className={styles.closeBtn} onClick={onClose}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            )}
          </div>

          <div className={styles.content} style={{ paddingTop: '24px' }}>
            <div className={styles.provisioningWrap}>
              <div className={`${styles.provisioningIcon} ${isError ? styles.provisioningIconError : provisionStage === 'active' ? styles.provisioningIconSuccess : styles.provisioningIconPending}`}>
                {isError ? (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                ) : provisionStage === 'active' ? (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                ) : (
                  <div className={styles.spinner} style={{ width: '24px', height: '24px' }} />
                )}
              </div>

              <h3 className={styles.provisionTitle}>
                {isError ? 'Deployment Failed' : provisionStage === 'checkout' ? 'Proceeding to Checkout' : provisionStage === 'active' ? 'Bot Deployed!' : 'Setting Up Your Bot'}
              </h3>
              <p className={styles.provisionSubtitle}>
                {isError
                  ? provisionError
                  : provisionStage === 'checkout'
                    ? 'Redirecting you to the secure payment portal to complete deployment...'
                  : provisionStage === 'active'
                    ? 'Your AI assistant is now running and ready to receive messages.'
                    : 'This takes about 1–2 minutes. You can close this and check your dashboard.'}
              </p>

              {!isError && (
                <div className={styles.progressSteps}>
                  {stageLabels.map((label, i) => {
                    // Hide later steps if we are redirecting away to checkout right now
                    if (provisionStage === 'checkout' && i > 2) return null;
                    const isCurrent = i === stageIdx && provisionStage !== 'active';
                    const isDone = provisionStage === 'active' || i < stageIdx;
                    return (
                      <div key={i} className={`${styles.progressStep} ${isDone ? styles.progressStepDone : isCurrent ? styles.progressStepCurrent : styles.progressStepPending}`}>
                        <div className={styles.progressDot}>
                          {isDone ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                          ) : isCurrent ? (
                            <div className={styles.spinner} style={{ width: '14px', height: '14px' }} />
                          ) : (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/></svg>
                          )}
                        </div>
                        <span>{label}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {(provisionStage === 'active' || isError) && (
                <button className={styles.dashboardBtn} onClick={() => { if (onDeployed) onDeployed(); onClose(); }}>
                  Go to Dashboard
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h2>Deploy New Bot</h2>
            <p>Step {step} of {TOTAL_STEPS}</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Step dots */}
        <div className={styles.steps}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div key={i} className={`${styles.stepDot} ${i + 1 === step ? styles.stepDotActive : i + 1 < step ? styles.stepDotDone : ''}`} />
          ))}
        </div>

        {/* Content */}
        <div className={styles.content}>
          {/* ── STEP 1: Model & API Key ── */}
          {step === 1 && (
            <>
              <h3 className={styles.stepTitle}>Choose AI Model & Enter Key</h3>
              <p className={styles.stepSubtitle}>Select your AI provider and enter the API key.</p>

              <div className={styles.modelGrid}>
                {AI_MODELS.map((m) => (
                  <div
                    key={m.id}
                    className={`${styles.modelCard} ${selectedModel === m.id ? styles.modelCardSelected : ''}`}
                    onClick={() => { setSelectedModel(m.id); setKeyStatus(null); setKeyError(null); }}
                  >
                    {selectedModel === m.id && (
                      <div className={styles.checkMark}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                      </div>
                    )}
                    <div className={styles.modelCardIcon}>
                      {m.id === 'claude' && (
                        <svg width="28" height="28" viewBox="0 0 36 36" fill="none"><text x="6" y="26" fontSize="24" fontWeight="800" fill="currentColor">A</text></svg>
                      )}
                      {m.id === 'chatgpt' && (
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                      )}
                      {m.id === 'gemini' && (
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                      )}
                    </div>
                    <h4 className={styles.modelCardName}>{m.name}</h4>
                    <p className={styles.modelCardProvider}>{m.provider}</p>
                  </div>
                ))}
              </div>

              <div className={styles.fieldGroup} style={{ marginTop: '16px' }}>
                <label className={styles.fieldLabel}>{modelObj?.provider} API Key</label>
                <div className={styles.inputRow}>
                  <input
                    type="password"
                    className={`${styles.input} ${keyStatus === 'valid' ? styles.inputValid : keyStatus === 'invalid' ? styles.inputInvalid : ''}`}
                    placeholder={modelObj?.placeholder || 'sk-...'}
                    value={apiKey}
                    onChange={(e) => { setApiKey(e.target.value); setKeyStatus(null); setKeyError(null); }}
                    autoComplete="off"
                  />
                  {keyStatus === 'valid' ? (
                    <button className={styles.validateBtnSuccess} disabled>Valid ✓</button>
                  ) : keyStatus === 'loading' ? (
                    <button className={styles.validateBtnLoading} disabled>
                      <span className={styles.spinner} /> Checking…
                    </button>
                  ) : (
                    <button className={styles.validateBtn} onClick={handleValidateKey} disabled={!apiKey.trim()}>Validate</button>
                  )}
                </div>
                {keyStatus === 'valid' && <p className={styles.successText}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  API key validated and encrypted.
                </p>}
                {keyError && <p className={styles.errorText}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  {keyError}
                </p>}
              </div>
            </>
          )}

          {/* ── STEP 2: Channel & Token ── */}
          {step === 2 && (
            <>
              <h3 className={styles.stepTitle}>Connect Your Channel</h3>
              <p className={styles.stepSubtitle}>Choose where your bot will live and enter the token.</p>

              <div className={styles.channelGrid}>
                <div className={`${styles.channelCard} ${channel === 'telegram' ? styles.channelCardSelected : ''}`} onClick={() => { setChannel('telegram'); setTokenStatus(null); }}>
                  {channel === 'telegram' && <div className={styles.checkMark}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg></div>}
                  <div className={styles.channelIcon} style={{ color: '#29b6f6' }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.16 13.67l-2.965-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.993.889z"/></svg>
                  </div>
                  <h4 className={styles.channelName}>Telegram</h4>
                  <p className={styles.channelDesc}>Token from @BotFather</p>
                </div>
                <div className={`${styles.channelCard} ${channel === 'discord' ? styles.channelCardSelected : ''}`} onClick={() => { setChannel('discord'); setTokenStatus(null); }}>
                  {channel === 'discord' && <div className={styles.checkMark}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg></div>}
                  <div className={styles.channelIcon} style={{ color: '#7289da' }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
                  </div>
                  <h4 className={styles.channelName}>Discord</h4>
                  <p className={styles.channelDesc}>Token from Developer Portal</p>
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>{channel === 'telegram' ? 'Telegram' : 'Discord'} Bot Token</label>
                <div className={styles.inputRow}>
                  <input
                    type="text"
                    className={`${styles.input} ${tokenStatus === 'valid' ? styles.inputValid : tokenStatus === 'invalid' ? styles.inputInvalid : ''}`}
                    placeholder={channel === 'telegram' ? '123456:ABC-DEF1234...' : 'MTIz...'}
                    value={botToken}
                    onChange={(e) => { setBotToken(e.target.value); setTokenStatus(null); setTokenError(null); }}
                    autoComplete="off"
                  />
                  {tokenStatus === 'valid' ? (
                    <button className={styles.validateBtnSuccess} disabled>Valid ✓</button>
                  ) : tokenStatus === 'loading' ? (
                    <button className={styles.validateBtnLoading} disabled>
                      <span className={styles.spinner} /> Checking…
                    </button>
                  ) : (
                    <button className={styles.validateBtn} onClick={handleValidateToken} disabled={!botToken.trim()}>Validate</button>
                  )}
                </div>
                {tokenStatus === 'valid' && <p className={styles.successText}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  Token verified{tokenInfo ? ` — ${tokenInfo}` : ''}.
                </p>}
                {tokenError && <p className={styles.errorText}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  {tokenError}
                </p>}
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Bot Name</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="e.g. Sales Bot, Support Agent, My AI"
                  value={botName}
                  onChange={(e) => setBotName(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
                <p className={styles.inputHint}>What you'll call your assistant. For your reference.</p>
              </div>
            </>
          )}

          {/* ── STEP 3: Persona ── */}
          {step === 3 && (
            <>
              <h3 className={styles.stepTitle}>Choose Personality</h3>
              <p className={styles.stepSubtitle}>Pick a template or write a custom persona.</p>

              <div className={styles.tabs}>
                <button className={`${styles.tab} ${personaTab === 'templates' ? styles.tabActive : ''}`} onClick={() => setPersonaTab('templates')}>Templates</button>
                <button className={`${styles.tab} ${personaTab === 'custom' ? styles.tabActive : ''}`} onClick={() => setPersonaTab('custom')}>Custom</button>
              </div>

              {personaTab === 'templates' && (
                <div className={styles.personaGrid}>
                  {PERSONA_TEMPLATES.map((t) => (
                    <div
                      key={t.id}
                      className={`${styles.personaCard} ${selectedPersona === t.id ? styles.personaCardSelected : ''}`}
                      onClick={() => { setSelectedPersona(t.id); setCustomPrompt(t.prompt); }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <h4 className={styles.personaName}>{t.name}</h4>
                        {t.badge && <span className={styles.personaBadge}>{t.badge}</span>}
                        <button 
                          className={styles.previewBtn}
                          onClick={(e) => { e.stopPropagation(); setPreviewPersona(t); }}
                        >
                          Preview
                        </button>
                      </div>
                      <p className={styles.personaDesc}>{t.desc}</p>
                    </div>
                  ))}
                </div>
              )}

              {personaTab === 'custom' && (
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>System Prompt</label>
                  <textarea
                    className={styles.textArea}
                    rows={10}
                    placeholder="Describe your bot's personality, responsibilities, and communication style..."
                    value={customPrompt || DEFAULT_PROMPT}
                    onChange={(e) => { setCustomPrompt(e.target.value); setSelectedPersona(null); }}
                  />
                </div>
              )}
            </>
          )}

          {/* ── STEP 4: Review & Deploy ── */}
          {step === 4 && (
            <>
              <h3 className={styles.stepTitle}>Review & Deploy</h3>
              <p className={styles.stepSubtitle}>Double-check your configuration, then deploy.</p>

              <div className={styles.reviewCard}>
                <div className={styles.reviewRow}><span>AI Model</span><strong>{modelObj?.name} ({modelObj?.provider})</strong></div>
                <div className={styles.reviewRow}><span>API Key</span><strong>{apiKey.length > 8 ? `${apiKey.slice(0, 4)}••••${apiKey.slice(-4)}` : '••••••••'}</strong></div>
                <div className={styles.reviewRow}><span>Channel</span><strong>{channel === 'telegram' ? 'Telegram' : 'Discord'}</strong></div>
                <div className={styles.reviewRow}><span>Bot Token</span><strong>{botToken.length > 8 ? `${botToken.slice(0, 4)}••••${botToken.slice(-4)}` : '••••••••'}</strong></div>
                <div className={styles.reviewRow}><span>Bot Name</span><strong>{botName || 'Unnamed Bot'}</strong></div>
                <div className={styles.reviewPrompt}>
                  <p className={styles.reviewPromptLabel}>System Prompt</p>
                  <div className={styles.reviewPromptText}>{getPrompt().slice(0, 300)}{getPrompt().length > 300 ? '...' : ''}</div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          {step > 1 ? (
            <button className={styles.backBtn} onClick={() => setStep(s => s - 1)}>Back</button>
          ) : (
            <div />
          )}

          {step < TOTAL_STEPS ? (
            <button className={styles.nextBtn} onClick={() => setStep(s => s + 1)} disabled={!canProceed()}>
              Next
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </button>
          ) : (
            <button className={styles.deployBtn} onClick={handleDeploy}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>
              Deploy Bot
            </button>
          )}
        </div>
      </div>

      {/* Preview Overlay */}
      {previewPersona && (
        <div className={styles.previewOverlay} onClick={() => setPreviewPersona(null)}>
          <div className={styles.previewInner} onClick={(e) => e.stopPropagation()}>
            <div className={styles.previewHeader}>
              <h4>{previewPersona.name} Preview</h4>
              <button className={styles.closeBtn} onClick={() => setPreviewPersona(null)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className={styles.previewContent}>
              <pre className={styles.previewText}>{previewPersona.prompt}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
