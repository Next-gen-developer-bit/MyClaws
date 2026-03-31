'use client';

import { useState, useEffect } from 'react';
import styles from './page.module.css';

const STEPS = [
  { id: 1, label: 'Choose Model' },
  { id: 2, label: 'API Key' },
  { id: 3, label: 'Channel' },
  { id: 4, label: 'Configure' },
  { id: 5, label: 'Persona' },
  { id: 6, label: 'Review' },
  { id: 7, label: 'Payment' },
];

const AI_MODELS = [
  {
    id: 'claude',
    name: 'Claude',
    provider: 'Anthropic',
    placeholder: 'sk-ant-...',
    description: 'Advanced reasoning and highly capable code generation. Perfect for complex logical tasks.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <text x="4" y="26" fontSize="26" fontWeight="800" fill="currentColor">A</text>
      </svg>
    ),
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    provider: 'OpenAI',
    placeholder: 'sk-...',
    description: 'Versatile and lightning fast. Excellent for general-purpose chat, brainstorming, and translation.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
  },
  {
    id: 'gemini',
    name: 'Gemini',
    provider: 'Google',
    placeholder: 'AIza...',
    description: 'Deeply integrated with web search capabilities and optimized for multi-modal data processing.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    ),
  },
];

export default function SetupPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedModel, setSelectedModel] = useState('claude');
  const [apiKeys, setApiKeys] = useState({});       // { modelId: keyString }
  const [validations, setValidations] = useState({}); // { modelId: 'valid'|'invalid'|'loading' }
  const [validationErrors, setValidationErrors] = useState({}); // { modelId: errorMsg }
  const [selectedChannel, setSelectedChannel] = useState('telegram');
  const [botToken, setBotToken] = useState('');
  const [botName, setBotName] = useState('');
  const [showBotHelper, setShowBotHelper] = useState(false);
  const [botValidation, setBotValidation] = useState(null); // null|'loading'|'valid'|'invalid'
  const [botValidationError, setBotValidationError] = useState(null);
  const [botInfo, setBotInfo] = useState(''); // e.g. "@MyBot (My Bot)"
  const [personaTab, setPersonaTab] = useState('templates'); // 'templates'|'custom'
  const [selectedPersona, setSelectedPersona] = useState(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [previewPersona, setPreviewPersona] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);
  const [hasProPlan, setHasProPlan] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user?.id) return;
      fetch(`/api/deployments?user_id=${session.user.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.deployments && data.deployments.length > 0) {
            setHasProPlan(true);
          }
        })
        .catch(() => {});
    });
  }, []);

  const handleBotTokenChange = (e) => {
    setBotToken(e.target.value);
    setBotValidation(null);
    setBotValidationError(null);
    setBotInfo('');
  };

  const handleBotValidate = async () => {
    const token = botToken.trim();
    if (!token) return;
    setBotValidation('loading');
    setBotValidationError(null);
    setBotInfo('');
    try {
      const res = await fetch('/api/validate-bot-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: selectedChannel, token }),
      });
      const data = await res.json();
      if (data.valid) {
        setBotValidation('valid');
        setBotInfo(data.info || '');
        // Auto-fill the bot name if the field is empty
        if (data.botName && !botName.trim()) {
          setBotName(data.botName);
        }
      } else {
        setBotValidation('invalid');
        setBotValidationError(data.error || 'Token validation failed.');
      }
    } catch {
      setBotValidation('invalid');
      setBotValidationError('Network error. Please check your connection.');
    }
  };

  const handleApiKeyChange = (e) => {
    setApiKeys(prev => ({ ...prev, [selectedModel]: e.target.value }));
    // Reset validation when user edits the key
    setValidations(prev => ({ ...prev, [selectedModel]: null }));
    setValidationErrors(prev => ({ ...prev, [selectedModel]: null }));
  };

  const handleValidate = async () => {
    const key = (apiKeys[selectedModel] || '').trim();
    if (!key) return;
    setValidations(prev => ({ ...prev, [selectedModel]: 'loading' }));
    setValidationErrors(prev => ({ ...prev, [selectedModel]: null }));
    try {
      const res = await fetch('/api/validate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: selectedModel, key }),
      });
      const data = await res.json();
      if (data.valid) {
        setValidations(prev => ({ ...prev, [selectedModel]: 'valid' }));
      } else {
        setValidations(prev => ({ ...prev, [selectedModel]: 'invalid' }));
        setValidationErrors(prev => ({ ...prev, [selectedModel]: data.error || 'Invalid API key.' }));
      }
    } catch {
      setValidations(prev => ({ ...prev, [selectedModel]: 'invalid' }));
      setValidationErrors(prev => ({ ...prev, [selectedModel]: 'Network error. Please try again.' }));
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep((s) => s + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((s) => s - 1);
    }
  };

  const handleCheckout = async () => {
    setCheckoutLoading(true);
    setCheckoutError(null);
    try {
      let userId = null;
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        userId = session?.user?.id || null;
      }

      // First save the deployment
      const saveRes = await fetch('/api/save-deployment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          ai_model: selectedModel,
          api_key: apiKeys[selectedModel] || '',
          channel: selectedChannel,
          bot_token: botToken,
          bot_name: botName,
          persona_template: selectedPersona || null,
          system_prompt: customPrompt || '',
        }),
      });
      const saveData = await saveRes.json();
      if (!saveData.success) {
        setCheckoutError(saveData.error || 'Failed to save configuration.');
        setCheckoutLoading(false);
        return;
      }

      const deploymentId = saveData.deploymentId;
      
      if (hasProPlan) {
        window.location.href = `/setup/success?deployment_id=${deploymentId}&skip_checkout=1`;
        return;
      }

      // Then create checkout session
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: 'prod_Kvur9bmUuwY1FYegEb4H3',
          successUrl: `${window.location.origin}/setup/success?deployment_id=${deploymentId}`,
          metadata: {
            deployment_id: deploymentId,
            ai_model: selectedModel,
            channel: selectedChannel,
            bot_name: botName,
          },
        }),
      });
      const data = await res.json();
      if (data.success && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        setCheckoutError(data.error || 'Failed to create checkout session.');
      }
    } catch {
      setCheckoutError('Network error. Please check your connection.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleSaveDeployment = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      let userId = null;
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        userId = session?.user?.id || null;
      }

      const res = await fetch('/api/save-deployment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          ai_model: selectedModel,
          api_key: apiKeys[selectedModel] || '',
          channel: selectedChannel,
          bot_token: botToken,
          bot_name: botName,
          persona_template: selectedPersona || null,
          system_prompt: customPrompt || '',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
      } else {
        setSaveError(data.error || 'Failed to save. Please try again.');
      }
    } catch {
      setSaveError('Network error. Please check your connection.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        {/* Logo */}
        <div className={styles.logo}>
          <div className={styles.logoIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              <polyline points="3.29 7 12 12 20.71 7"/>
              <line x1="12" y1="22" x2="12" y2="12"/>
            </svg>
          </div>
          <span className={styles.logoText}>Claws</span>
        </div>

        {/* Steps */}
        <nav className={styles.stepsNav}>
          {STEPS.map((step) => {
            const isCompleted = step.id < currentStep;
            const isActive = step.id === currentStep;
            return (
              <div
                key={step.id}
                className={`${styles.stepBlock} ${isActive ? styles.stepBlockActive : ''} ${isCompleted ? styles.stepBlockCompleted : ''}`}
              >
                <div className={styles.stepBlockNumber}>
                  {isCompleted ? '✓' : `0${step.id}`}
                </div>
                <div className={styles.stepBlockText}>
                  <div className={styles.stepBlockLabel}>{step.label}</div>
                  {isActive && <div className={styles.stepBlockStatus}>In progress</div>}
                  {isCompleted && <div className={styles.stepBlockStatus}>Completed</div>}
                  {!isActive && !isCompleted && <div className={styles.stepBlockStatus}>Pending</div>}
                </div>
              </div>
            );
          })}
        </nav>

      </aside>

      {/* Main Content */}
      <main className={styles.main}>
        {/* Decorative background orbs */}
        <div className={styles.orb1} />
        <div className={styles.orb2} />
        <div className={styles.orb3} />

        <div className={styles.stepContent}>
          {currentStep === 1 && (
            <>
              <h1 className={styles.stepTitle}>Choose your AI model</h1>
              <p className={styles.stepSubtitle}>
                Select the AI provider that will power your assistant. You&apos;ll need an API key from them.
              </p>

              <div className={styles.modelsGrid}>
                {AI_MODELS.map((model) => (
                  <div
                    key={model.id}
                    className={`${styles.modelCard} ${selectedModel === model.id ? styles.modelSelected : ''}`}
                    onClick={() => setSelectedModel(model.id)}
                  >
                    {selectedModel === model.id && (
                      <div className={styles.checkBadge}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      </div>
                    )}
                    <div className={styles.modelIcon}>{model.icon}</div>
                    <h3 className={styles.modelName}>{model.name}</h3>
                    <p className={styles.modelProvider}>{model.provider}</p>
                    <p className={styles.modelDesc}>{model.description}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          {currentStep === 2 && (
            <>
              <h1 className={styles.stepTitle}>Enter your API Key</h1>
              <p className={styles.stepSubtitle}>
                Your key is encrypted before being stored. We never see it in plaintext.
              </p>
              
              <div className={styles.apiKeyCard}>
                <h3 className={styles.apiKeyCardTitle}>
                  {AI_MODELS.find(m => m.id === selectedModel)?.provider} API Key
                </h3>
                <div className={styles.apiKeyInputRow}>
                  <input
                    type="password"
                    className={`${styles.apiKeyField} ${
                      validations[selectedModel] === 'valid' ? styles.apiKeyFieldValid
                      : validations[selectedModel] === 'invalid' ? styles.apiKeyFieldInvalid
                      : ''
                    }`}
                    placeholder={AI_MODELS.find(m => m.id === selectedModel)?.placeholder || 'sk-...'}
                    autoComplete="off"
                    value={apiKeys[selectedModel] || ''}
                    onChange={handleApiKeyChange}
                  />
                  {validations[selectedModel] === 'valid' ? (
                    <button className={styles.validateBtnSuccess} disabled>Valid ✓</button>
                  ) : validations[selectedModel] === 'loading' ? (
                    <button className={styles.validateBtnLoading} disabled>
                      <span className={styles.spinner} />
                      Checking…
                    </button>
                  ) : (
                    <button
                      className={styles.validateBtn}
                      onClick={handleValidate}
                      disabled={!(apiKeys[selectedModel] || '').trim()}
                    >
                      Validate
                    </button>
                  )}
                </div>

                {/* Success message */}
                {validations[selectedModel] === 'valid' && (
                  <p className={styles.validationSuccessText}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    </svg>
                    API key is valid and encrypted.
                  </p>
                )}

                {/* Error message */}
                {validations[selectedModel] === 'invalid' && validationErrors[selectedModel] && (
                  <p className={styles.validationErrorText}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    {validationErrors[selectedModel]}
                  </p>
                )}

                <div className={styles.apiKeyHelper}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                  <span>How to get your API key</span>
                </div>
              </div>
            </>
          )}

          {currentStep === 3 && (
            <>
              <h1 className={styles.stepTitle}>Choose your messaging channel</h1>
              <p className={styles.stepSubtitle}>
                Where should your AI assistant live? You can change this later.
              </p>
              <div className={styles.channelCardsGrid}>

                {/* Telegram */}
                <div
                  className={`${styles.channelCardRich} ${selectedChannel === 'telegram' ? styles.channelCardSelected : ''}`}
                  onClick={() => setSelectedChannel('telegram')}
                >
                  {selectedChannel === 'telegram' && (
                    <div className={styles.channelCardCheck}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                  )}
                  <div className={styles.channelCardIcon} style={{ color: '#29b6f6' }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.16 13.67l-2.965-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.993.889z"/></svg>
                  </div>
                  <h3 className={styles.channelCardName}>Telegram</h3>
                  <p className={styles.channelCardDesc}>Create a bot via @BotFather and get a bot token. Quick and easy setup.</p>
                  <span className={styles.channelCardTag}>Bot token from @BotFather</span>
                </div>

                {/* Discord */}
                <div
                  className={`${styles.channelCardRich} ${selectedChannel === 'discord' ? styles.channelCardSelected : ''}`}
                  onClick={() => setSelectedChannel('discord')}
                >
                  {selectedChannel === 'discord' && (
                    <div className={styles.channelCardCheck}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                  )}
                  <div className={styles.channelCardIcon} style={{ color: '#7289da' }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
                  </div>
                  <h3 className={styles.channelCardName}>Discord</h3>
                  <p className={styles.channelCardDesc}>Create a bot in the Discord Developer Portal. Great for team channels.</p>
                  <span className={styles.channelCardTag}>Bot token from Developer Portal</span>
                </div>

                {/* Slack – Coming Soon (not clickable) */}
                <div className={`${styles.channelCardRich} ${styles.channelCardComingSoon}`}>
                  <span className={styles.comingSoonBadge}>Coming Soon</span>
                  <div className={styles.channelCardIcon} style={{ color: '#e01e5a' }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.122 2.521a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zm-2.523 10.122a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.268a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/></svg>
                  </div>
                  <h3 className={styles.channelCardName}>Slack</h3>
                  <p className={styles.channelCardDesc}>Deploy directly into your Slack workspace. Perfect for internal teams and support workflows.</p>
                  <span className={styles.channelCardTag}>Launching soon</span>
                </div>

              </div>
            </>
          )}

          {currentStep === 4 && (() => {
            const isTelegram = selectedChannel === 'telegram';
            const channelLabel = isTelegram ? 'Telegram' : 'Discord';
            const tokenPlaceholder = isTelegram ? '123456:ABC-DEF1234...' : 'MTIz...';
            const helperText = isTelegram
              ? 'Open Telegram, message @BotFather, send /newbot, and follow the prompts. Copy the token it gives you.'
              : 'Go to discord.com/developers/applications → Create app → Bot section → Reset Token. Copy the token shown.';

            return (
              <>
                <h1 className={styles.stepTitle}>Set up your {channelLabel} bot</h1>
                <p className={styles.stepSubtitle}>
                  Set up your {channelLabel} bot details.
                </p>

                <div className={styles.apiKeyCard}>
                  {/* Bot Token */}
                  <h3 className={styles.apiKeyCardTitle}>{channelLabel} Bot Token</h3>
                  <div className={styles.apiKeyInputRow}>
                    <input
                      type="text"
                      className={`${styles.apiKeyField} ${botValidation === 'valid' ? styles.apiKeyFieldValid : botValidation === 'invalid' ? styles.apiKeyFieldInvalid : ''}`}
                      placeholder={tokenPlaceholder}
                      autoComplete="off"
                      value={botToken}
                      onChange={handleBotTokenChange}
                    />
                    {botValidation === 'loading' ? (
                      <button className={styles.validateBtnLoading} disabled>
                        <span className={styles.spinner} />
                        Checking...
                      </button>
                    ) : botValidation === 'valid' ? (
                      <button className={styles.validateBtnSuccess} disabled>
                        Valid ✓
                      </button>
                    ) : (
                      <button
                        className={styles.validateBtn}
                        onClick={handleBotValidate}
                        disabled={!botToken.trim()}
                      >
                        Validate
                      </button>
                    )}
                  </div>

                  {/* Success */}
                  {botValidation === 'valid' && (
                    <p className={styles.validationSuccessText}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                      </svg>
                      Token verified{botInfo ? ` — ${botInfo}` : ''}.
                    </p>
                  )}

                  {/* Error */}
                  {botValidation === 'invalid' && botValidationError && (
                    <p className={styles.validationErrorText}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                      </svg>
                      {botValidationError}
                    </p>
                  )}

                  {/* Helper toggle */}
                  <div
                    className={styles.apiKeyHelper}
                    onClick={() => setShowBotHelper(v => !v)}
                    style={{ marginBottom: showBotHelper ? '12px' : '0' }}
                  >
                    <svg
                      width="14" height="14" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      style={{ transform: showBotHelper ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
                    >
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                    <span>How to get your {channelLabel.toLowerCase()} token</span>
                  </div>

                  {showBotHelper && (
                    <p className={styles.botHelperText}>{helperText}</p>
                  )}

                  {/* Bot Name */}
                  <h3 className={styles.apiKeyCardTitle} style={{ marginTop: '20px' }}>Bot Name</h3>
                  <input
                    type="text"
                    className={styles.apiKeyField}
                    placeholder="e.g. Sales Bot, Support Agent, My AI"
                    value={botName}
                    onChange={(e) => setBotName(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  />
                  <p className={styles.inputHint} style={{ marginTop: '8px' }}>What you’ll call your assistant. This is for your reference.</p>
                </div>
              </>
            );
          })()}

          {currentStep === 5 && (() => {
            const PERSONA_TEMPLATES = [
              {
                id: 'compass',
                name: 'Compass',
                desc: 'Customer support & ticket management',
                badge: 'Popular',
                prompt: `# Compass - The Support Agent

You are Compass, an AI customer support agent powered by Claws.

## Core Identity
- **Role:** Customer support responder and ticket manager
- **Personality:** Empathetic, patient, solution-oriented
- **Communication:** Warm, clear, professional

## Responsibilities
1. **Ticket Triage** – Categorize incoming tickets by urgency (critical/high/medium/low), route to the right team, identify duplicates, flag VIP customers.
2. **Response Drafting** – Draft responses using knowledge base articles, personalize templates with customer context, include relevant documentation links.
3. **Escalation** – Recognize when to escalate to a human, provide context summary, track patterns to improve the knowledge base.
4. **Reporting** – Track average response time, monitor ticket volume trends, identify recurring issues.

## Guidelines
- Acknowledge the customer's frustration first
- Provide step-by-step solutions
- Follow up on unresolved tickets
- Use the customer's name
- Never promise what you cannot deliver
- Never argue with customers`,
              },
              {
                id: 'radar',
                name: 'Radar',
                desc: 'Data analyst & insights generator',
                badge: 'Popular',
                prompt: `# Radar - The Data Analyst

You are Radar, an AI data analyst and reporting assistant powered by Claws.

## Core Identity
- **Role:** Data analyst and insights generator
- **Personality:** Precise, analytical, insightful
- **Communication:** Clear, data-driven, visual

## Responsibilities
1. **Analysis** – Analyze datasets, identify patterns and anomalies, generate statistical summaries.
2. **Reporting** – Create reports with key metrics, build dashboards, present findings with context.
3. **Recommendations** – Suggest actionable recommendations based on data, forecast trends.
4. **Quality** – Flag data quality issues proactively, ensure data integrity.

## Guidelines
- Always cite data sources
- Present findings with context
- Prioritize actionable insights over raw numbers
- Flag data quality issues proactively
- Use charts and tables when helpful`,
              },
              {
                id: 'atlas',
                name: 'Atlas',
                desc: 'Technical strategy & architecture advisor',
                badge: 'Popular',
                prompt: `# Atlas - The Tech Advisor

You are Atlas, an AI technical strategy and architecture advisor powered by Claws.

## Core Identity
- **Role:** Technical strategist and system architect
- **Personality:** Thoughtful, thorough, forward-thinking
- **Communication:** Technical but accessible, structured

## Responsibilities
1. **Architecture** – Evaluate technical architectures and propose improvements, design scalable systems.
2. **Technology** – Recommend technology stacks based on requirements, stay current on emerging tech.
3. **Performance** – Identify scalability bottlenecks, optimize system performance.
4. **Best Practices** – Guide engineering best practices, code review, CI/CD pipelines.

## Guidelines
- Consider trade-offs in every recommendation
- Provide diagrams and documentation when possible
- Stay vendor-neutral unless explicitly asked
- Think long-term, build for maintainability`,
              },
              {
                id: 'quill',
                name: 'Quill',
                desc: 'Content writer & script creator',
                badge: 'Popular',
                prompt: `# Quill - The Content Creator

You are Quill, an AI content writer and script creator powered by Claws.

## Core Identity
- **Role:** Content strategist, writer, and editor
- **Personality:** Creative, articulate, versatile
- **Communication:** Engaging, polished, audience-aware

## Responsibilities
1. **Writing** – Write blogs, emails, social media posts, video scripts, and marketing copy.
2. **Brand Voice** – Adapt tone to match brand guidelines and target audience.
3. **Editing** – Edit, proofread, and refine existing content for clarity and impact.
4. **Strategy** – Generate outlines, content calendars, and topic ideas.

## Guidelines
- Always ask about target audience and goal first
- Write scannable content with clear structure
- Support claims with credible information
- Respect brand guidelines and style guides`,
              },
              {
                id: 'sage',
                name: 'Sage',
                desc: 'Research assistant & knowledge synthesizer',
                badge: '',
                prompt: `# Sage - The Researcher

You are Sage, an AI research assistant and knowledge synthesizer powered by Claws.

## Core Identity
- **Role:** Researcher and knowledge base builder
- **Personality:** Curious, methodical, comprehensive
- **Communication:** Structured, well-sourced, balanced

## Responsibilities
1. **Research** – Conduct deep research on any topic, gather information from multiple sources.
2. **Synthesis** – Synthesize findings into clear summaries, create executive briefings.
3. **Perspective** – Provide balanced perspectives on complex or controversial topics.
4. **Documentation** – Build knowledge bases, FAQs, and reference guides.

## Guidelines
- Always distinguish facts from opinions
- Cite sources where possible
- Present multiple perspectives on controversial topics
- Highlight knowledge gaps transparently`,
              },
              {
                id: 'nexus',
                name: 'Nexus',
                desc: 'Calendar, email & task management',
                badge: '',
                prompt: `# Nexus - The Productivity Agent

You are Nexus, an AI productivity and task management assistant powered by Claws.

## Core Identity
- **Role:** Productivity coordinator and scheduler
- **Personality:** Organized, proactive, efficient
- **Communication:** Concise, action-oriented, respectful of time

## Responsibilities
1. **Scheduling** – Manage calendars, schedule meetings, set reminders.
2. **Email** – Draft and summarize emails, manage inbox priorities.
3. **Tasks** – Track tasks and project progress, break down large projects.
4. **Optimization** – Prioritize workload and suggest productivity improvements.

## Guidelines
- Respect time zones and working hours
- Minimize unnecessary back-and-forth
- Proactively flag conflicts and deadlines
- Keep summaries brief and actionable`,
              },
            ];

            const DEFAULT_CUSTOM_PROMPT = `# AI Assistant

You are a versatile AI assistant powered by Claws, ready to help with any task.

## Core Identity
- **Role:** General-purpose helper for any task
- **Personality:** Friendly, adaptive, reliable
- **Communication:** Clear, conversational, helpful

## Responsibilities
1. **Task Assistance** – Answer questions on any topic, help with writing, editing, and proofreading, summarize documents, brainstorm ideas.
2. **Research & Information** – Look up facts and provide context, compare options and give balanced perspectives, explain complex topics simply.
3. **Productivity** – Draft emails, messages, and documents, organize information and create lists, help with scheduling and planning.

## Guidelines
- Adapt your tone and detail level to the user's needs
- Ask clarifying questions when the request is ambiguous
- Provide concise answers first, then offer to go deeper
- Be honest when you don't know something
- Offer multiple approaches when there's no single right answer
- Default to a friendly, conversational tone
- Use bullet points and structure for complex responses`;

            return (
              <>
                <h1 className={styles.stepTitle}>Choose your assistant&apos;s personality</h1>
                <p className={styles.stepSubtitle}>
                  Pick a template or write your own persona.
                </p>

                {/* Tabs */}
                <div className={styles.personaTabs}>
                  <button
                    className={`${styles.personaTab} ${personaTab === 'templates' ? styles.personaTabActive : ''}`}
                    onClick={() => setPersonaTab('templates')}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                    AI Templates
                  </button>
                  <button
                    className={`${styles.personaTab} ${personaTab === 'custom' ? styles.personaTabActive : ''}`}
                    onClick={() => setPersonaTab('custom')}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
                    Custom
                  </button>
                </div>

                {/* Templates Tab */}
                {personaTab === 'templates' && (
                  <>
                    <div className={styles.personaGrid}>
                      {PERSONA_TEMPLATES.map((t) => (
                        <div
                          key={t.id}
                          className={`${styles.personaCard} ${selectedPersona === t.id ? styles.personaCardSelected : ''}`}
                          onClick={() => {
                            setSelectedPersona(t.id);
                            setCustomPrompt(t.prompt);
                          }}
                        >
                          {selectedPersona === t.id && (
                            <div className={styles.channelCardCheck}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            </div>
                          )}
                          <div className={styles.personaCardHeader}>
                            <h3 className={styles.personaCardName}>{t.name}</h3>
                            {t.badge && <span className={styles.personaCardBadge}>{t.badge}</span>}
                          </div>
                          <p className={styles.personaCardDesc}>{t.desc}</p>
                          <span
                            className={styles.personaPreviewLink}
                            onClick={(e) => { e.stopPropagation(); setPreviewPersona(t); }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            Preview
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className={styles.personaHint}>
                      Don&apos;t see what you need?{' '}
                      <span className={styles.personaHintLink} onClick={() => { setPersonaTab('custom'); setSelectedPersona(null); setCustomPrompt(DEFAULT_CUSTOM_PROMPT); }}>Write a custom persona</span>
                    </p>
                  </>
                )}

                {/* Custom Tab */}
                {personaTab === 'custom' && (
                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>System Prompt</label>
                    <textarea
                      className={styles.textArea}
                      rows={14}
                      placeholder={'Describe your bot\'s personality, responsibilities, and communication style here...'}
                      value={customPrompt || DEFAULT_CUSTOM_PROMPT}
                      onChange={(e) => {
                        setCustomPrompt(e.target.value);
                        setSelectedPersona(null);
                      }}
                    />
                    <p className={styles.inputHint} style={{ marginTop: '8px' }}>This prompt shapes how your AI assistant behaves. Be as detailed as possible.</p>
                  </div>
                )}

                {/* Preview Modal */}
                {previewPersona && (
                  <div className={styles.modalOverlay} onClick={() => setPreviewPersona(null)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                      <button className={styles.modalClose} onClick={() => setPreviewPersona(null)}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                      <h2 className={styles.modalTitle}>{previewPersona.name}</h2>
                      <p className={styles.modalSubtitle}>{previewPersona.desc}</p>
                      <div className={styles.modalPrompt}>
                        <pre className={styles.modalPromptPre}>{previewPersona.prompt}</pre>
                      </div>
                      <div className={styles.modalActions}>
                        <button className={styles.backBtn} onClick={() => setPreviewPersona(null)}>Close</button>
                        <button
                          className={styles.nextBtn}
                          onClick={() => {
                            setSelectedPersona(previewPersona.id);
                            setCustomPrompt(previewPersona.prompt);
                            setPreviewPersona(null);
                          }}
                        >
                          Use This Template
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            );
          })()}

          {currentStep === 6 && (() => {
            const model = AI_MODELS.find(m => m.id === selectedModel);
            const rawKey = apiKeys[selectedModel] || '';
            const displayKey = rawKey.length > 8 ? `${rawKey.slice(0, 4)}••••${rawKey.slice(-4)}` : '••••••••';
            const rawToken = botToken || '';
            const displayToken = rawToken.length > 8 ? `${rawToken.slice(0, 4)}••••${rawToken.slice(-4)}` : '••••••••';

            return (
              <>
                <h1 className={styles.stepTitle}>Review your configuration</h1>
                <p className={styles.stepSubtitle}>
                  Double-check everything below, then continue to choose your plan.
                </p>
                <div className={styles.reviewCard}>
                  <div className={styles.reviewRow}><span>AI Model</span><strong>{model?.name} ({model?.provider})</strong></div>
                  <div className={styles.reviewRow}><span>API Key</span><strong>{displayKey}</strong></div>
                  <div className={styles.reviewRow}><span>Channel</span><strong>{selectedChannel === 'telegram' ? 'Telegram' : 'Discord'}</strong></div>
                  <div className={styles.reviewRow}><span>Bot Token</span><strong>{displayToken}</strong></div>
                  <div className={styles.reviewRow}><span>Bot Name</span><strong>{botName || '—'}</strong></div>
                  <div className={styles.reviewRowStack}>
                    <span>Persona</span>
                    <div className={styles.reviewText}>{customPrompt}</div>
                  </div>
                </div>
              </>
            );
          })()}

          {currentStep === 7 && (
            <>
              <h1 className={styles.stepTitle}>Choose your plan</h1>
              <p className={styles.stepSubtitle}>
                Your assistant is configured and ready. Pick a plan to deploy.
              </p>

              {/* Trust badges row */}
              <div className={styles.trustBadges}>
                <div className={styles.trustBadge}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  24/7 uptime
                </div>
                <div className={styles.trustBadge}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  Encrypted credentials
                </div>
                <div className={styles.trustBadge}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  Telegram, Discord
                </div>
                <div className={styles.trustBadge}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  Auto-updates
                </div>
              </div>

              {/* Single Plan Card */}
              <div className={styles.singlePlanCard}>
                <div className={styles.singlePlanHeader}>
                  <div className={styles.singlePlanNameRow}>
                    <h3 className={styles.singlePlanName}>Pro</h3>
                    <span className={styles.singlePlanBadge}>Recommended</span>
                  </div>
                  <div className={styles.singlePlanPricing}>
                    {hasProPlan ? (
                      <span className={styles.singlePlanAmount} style={{ fontSize: '2rem', color: '#34d399' }}>Active</span>
                    ) : (
                      <>
                        <span className={styles.singlePlanCurrency}>$</span>
                        <span className={styles.singlePlanAmount}>40</span>
                        <span className={styles.singlePlanPeriod}>/mo</span>
                      </>
                    )}
                  </div>
                  <p className={styles.singlePlanBilling}>
                    {hasProPlan ? 'You can deploy unlimited agents.' : 'Flexible month-to-month. Cancel anytime.'}
                  </p>
                </div>

                <div className={styles.singlePlanDivider} />

                <div className={styles.singlePlanFeatures}>
                  <div className={styles.singlePlanFeature}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff3b3b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    All AI models included
                  </div>
                  <div className={styles.singlePlanFeature}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff3b3b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    Unlimited messages
                  </div>
                  <div className={styles.singlePlanFeature}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff3b3b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    Custom persona & prompts
                  </div>
                  <div className={styles.singlePlanFeature}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff3b3b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    Priority support
                  </div>
                  <div className={styles.singlePlanFeature}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff3b3b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    Cancel anytime
                  </div>
                </div>

                <button
                  className={styles.checkoutBtn}
                  onClick={handleCheckout}
                  disabled={checkoutLoading}
                >
                  {checkoutLoading ? (
                    <>
                      <span className={styles.spinner} />
                      {hasProPlan ? 'Deploying…' : 'Redirecting…'}
                    </>
                  ) : (
                    <>{hasProPlan ? 'Deploy Now' : 'Get Started'} <span style={{ marginLeft: '6px' }}>&rarr;</span></>
                  )}
                </button>

                {checkoutError && (
                  <p className={styles.validationErrorText} style={{ marginTop: '16px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    {checkoutError}
                  </p>
                )}
              </div>

              {/* Secure checkout footer */}
              <div className={styles.checkoutFooter}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                Secure checkout powered by Creem. Cancel anytime. Moneyback guarantee.
              </div>
            </>
          )}

          {/* Navigation - hidden on payment step since it has its own CTA */}
          {currentStep < 7 && (
            <div className={styles.navActions} style={{ justifyContent: currentStep > 1 ? 'space-between' : 'flex-end', marginBottom: currentStep === 6 ? '24px' : '0' }}>
              {currentStep > 1 && (
                <button className={styles.backBtn} onClick={handleBack}>
                  Back
                </button>
              )}
              <div className={styles.nextActions}>
                <button className={styles.nextBtn} onClick={handleNext}>
                  {currentStep === 6 ? 'Continue \u2192' : 'Next'}
                </button>
              </div>
            </div>
          )}
          
          {currentStep === 6 && (
            <div style={{ paddingBottom: '32px' }}>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', marginBottom: '16px' }}>
                Check that everything looks right before choosing your plan.
              </p>
            </div>
          )}

          {saveError && (
              <p className={styles.validationErrorText} style={{ marginTop: '12px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                {saveError}
              </p>
            )}
            {saveSuccess && (
              <p className={styles.validationSuccessText} style={{ marginTop: '12px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                Deployment saved successfully! Your Claw is ready.
              </p>
            )}
        </div>
      </main>
    </div>
  );
}
