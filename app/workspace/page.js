'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import styles from './page.module.css';

function ChatInterface() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const botId = searchParams.get('bot');

  const [bot, setBot] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    let timeoutId;
    async function loadBot() {
      if (!botId) {
        setError('No bot selected.');
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/deployments/${botId}/status`, { cache: 'no-store' });
        const json = await res.json();

        if (!json.success || !json.deployment) {
          setError('Bot not found.');
        } else {
          // The status endpoint returns a slightly different shape
          const data = json.deployment;
          // Map dbStatus to status so the rest of the component works as expected
          const mappedBot = {
            id: botId,
            bot_name: data.botName,
            ai_model: data.aiModel,
            channel: data.channel,
            status: data.dbStatus === 'active' || data.botRunning ? 'active' : data.dbStatus || 'provisioning',
          };
          
          setBot(mappedBot);
          
          if (mappedBot.status !== 'active') {
            // Failsafe: if bot has no droplet ID but is provisioning, the server creation failed
            if (mappedBot.status === 'provisioning' && !data.dropletId) {
               // Let frontend show error instead of infinite provisioning
               mappedBot.status = 'error (Provisioning failed)';
            } else {
               timeoutId = setTimeout(loadBot, 5000);
            }
          } else {
            // Only set welcome message once it's active and we haven't already
            setMessages(prev => {
              if (prev.length === 0) {
                return [{
                  role: 'assistant',
                  content: `Hi! I'm **${mappedBot.bot_name || 'Your AI Assistant'}**, powered by ${mappedBot.ai_model}. How can I help you today?`,
                  ts: new Date().toISOString(),
                }];
              }
              return prev;
            });
          }
        }
      } catch {
        // Silent fail on network errors during polling
        if (!bot) setError('Failed to load bot. Please try again.');
      }
      setLoading(false);
    }
    loadBot();
    return () => clearTimeout(timeoutId);
  }, [botId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending || !bot) return;

    const userMsg = { role: 'user', content: text, ts: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSending(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deploymentId: botId,
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      if (data.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply, ts: new Date().toISOString() }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: data.error || 'Something went wrong.', ts: new Date().toISOString(), isError: true }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Network error. Please try again.', ts: new Date().toISOString(), isError: true }]);
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const renderText = (text) => {
    // Simple markdown: bold
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  };

  if (loading) {
    return (
      <div className={styles.loadingState}>
        <div className={styles.spinner} />
        <p>Loading bot...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorState}>
        <p>{error}</p>
        <button className={styles.backBtn} onClick={() => router.push('/dashboard')}>← Back to Dashboard</button>
      </div>
    );
  }

  const statusColor = bot.status === 'active' || bot.status === 'running' ? '#34d399' : bot.status === 'pending' || bot.status === 'provisioning' || bot.status === 'deploying' ? '#fbbf24' : '#f87171';

  return (
    <div className={styles.chatContainer}>
      {/* Top bar */}
      <div className={styles.topBar}>
        <button className={styles.backLink} onClick={() => router.push('/dashboard')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5"/><path d="m12 5-7 7 7 7"/></svg>
          Dashboard
        </button>
        <div className={styles.botInfo}>
          <div className={styles.botAvatar}>
            {bot.channel === 'telegram' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.16 13.67l-2.965-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.993.889z"/></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
            )}
          </div>
          <div>
            <h2 className={styles.botName}>{bot.bot_name || 'AI Assistant'}</h2>
            <span className={styles.botStatus} style={{ color: statusColor }}>
              <span className={styles.statusDot} style={{ background: statusColor }} />
              {bot.status === 'active' || bot.status === 'running' ? 'Online' : bot.status === 'pending' ? 'Pending' : bot.status === 'provisioning' ? 'Provisioning' : bot.status === 'deploying' ? 'Deploying' : bot.status}
              {(bot.status === 'provisioning' || bot.status === 'deploying') && <span className={styles.dotsWait}>...</span>}
            </span>
          </div>
        </div>
        <div className={styles.botMeta}>
          <span className={styles.metaChip}>{bot.ai_model}</span>
          <span className={styles.metaChip}>{bot.channel}</span>
        </div>
      </div>

      {/* Messages */}
      <div className={styles.messages}>
        {messages.map((msg, i) => (
          <div key={i} className={`${styles.messageRow} ${msg.role === 'user' ? styles.userRow : styles.assistantRow}`}>
            {msg.role === 'assistant' && (
              <div className={styles.assistantAvatar}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/></svg>
              </div>
            )}
            <div className={`${styles.bubble} ${msg.role === 'user' ? styles.userBubble : msg.isError ? styles.errorBubble : styles.assistantBubble}`}>
              <p dangerouslySetInnerHTML={{ __html: renderText(msg.content) }} />
              <span className={styles.msgTime}>{formatTime(msg.ts)}</span>
            </div>
          </div>
        ))}
        {sending && (
          <div className={`${styles.messageRow} ${styles.assistantRow}`}>
            <div className={styles.assistantAvatar}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/></svg>
            </div>
            <div className={`${styles.bubble} ${styles.assistantBubble} ${styles.typingBubble}`}>
              <span className={styles.dot} /><span className={styles.dot} /><span className={styles.dot} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className={styles.inputBar}>
        <textarea
          ref={textareaRef}
          className={styles.chatInput}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder={`Message ${bot.bot_name || 'your bot'}… (Enter to send)`}
          rows={1}
          disabled={sending}
        />
        <button
          className={styles.sendBtn}
          onClick={sendMessage}
          disabled={!input.trim() || sending}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>
        </button>
      </div>
    </div>
  );
}

export default function WorkspacePage() {
  return (
    <Suspense fallback={<div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#0a0a0a', color:'rgba(255,255,255,0.5)' }}>Loading…</div>}>
      <ChatInterface />
    </Suspense>
  );
}
