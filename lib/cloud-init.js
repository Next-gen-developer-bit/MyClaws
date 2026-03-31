/**
 * Cloud-Init Template Generator
 * Generates the startup script that runs on each new VPS
 * Installs Docker, configures OpenClaw, and starts the bot
 */

/**
 * Generate a cloud-init script for a Claw deployment
 * @param {object} config
 * @param {string} config.deploymentId - Unique deployment ID
 * @param {string} config.aiModel - AI model provider (claude, chatgpt, gemini)
 * @param {string} config.apiKey - User's LLM API key
 * @param {string} config.channel - Messaging channel (telegram, discord)
 * @param {string} config.botToken - Bot token for the channel
 * @param {string} config.botName - Bot display name
 * @param {string} config.systemPrompt - System prompt / persona
 * @param {string} config.callbackUrl - URL to notify when deployment is ready
 * @returns {string} Cloud-init bash script
 */
export function generateCloudInit(config) {
  const {
    deploymentId,
    aiModel,
    apiKey,
    channel,
    botToken,
    botName,
    systemPrompt,
    callbackUrl,
  } = config;

  // Map the model to the provider format OpenClaw expects
  const providerMap = {
    claude: 'anthropic',
    chatgpt: 'openai',
    gemini: 'google',
    deepseek: 'deepseek',
  };
  const provider = providerMap[aiModel] || aiModel;

  // Escape special characters for shell safety
  const escapeShell = (str) =>
    (str || '').replace(/'/g, "'\\''");

  return `#!/bin/bash
set -euo pipefail
exec > /var/log/claw-deploy.log 2>&1

echo "=== Claws Deployment Starting: ${deploymentId} ==="
echo "Timestamp: $(date -u)"

# ── System Updates ──
export DEBIAN_FRONTEND=noninteractive
apt-get update -y

# ── Install Docker if not present ──
if ! command -v docker &> /dev/null; then
  echo "Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
fi

# ── Install Docker Compose if not present ──
if ! command -v docker-compose &> /dev/null; then
  echo "Installing Docker Compose..."
  apt-get install -y docker-compose-plugin || {
    curl -SL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
  }
fi

# ── Setup Firewall ──
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 8080/tcp
ufw --force enable

# ── Create Workspace ──
mkdir -p /opt/claw/{config,workspace,logs}

# ── Write Environment File ──
cat > /opt/claw/.env << 'ENVEOF'
DEPLOYMENT_ID=${deploymentId}
LLM_PROVIDER=${escapeShell(provider)}
LLM_API_KEY=${escapeShell(apiKey)}
CHANNEL=${escapeShell(channel)}
BOT_TOKEN=${escapeShell(botToken)}
BOT_NAME=${escapeShell(botName)}
ENVEOF

# ── Write System Prompt ──
cat > /opt/claw/config/system_prompt.txt << 'PROMPTEOF'
${escapeShell(systemPrompt)}
PROMPTEOF

# ── Write Docker Compose ──
cat > /opt/claw/docker-compose.yml << 'COMPOSEEOF'
version: "3.8"

services:
  gateway:
    image: node:20-slim
    container_name: claw-gateway
    restart: always
    working_dir: /app
    environment:
      - NODE_ENV=production
      - LLM_PROVIDER=\${LLM_PROVIDER}
      - LLM_API_KEY=\${LLM_API_KEY}
      - CHANNEL=\${CHANNEL}
      - BOT_TOKEN=\${BOT_TOKEN}
      - BOT_NAME=\${BOT_NAME}
      - DEPLOYMENT_ID=\${DEPLOYMENT_ID}
    volumes:
      - ./config:/app/config:ro
      - ./workspace:/app/workspace
      - ./logs:/app/logs
      - ./bot:/app/bot
    ports:
      - "8080:8080"
    env_file:
      - .env
    command: ["node", "bot/index.js"]
    healthcheck:
      test: ["CMD", "node", "-e", "process.exit(0)"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        limits:
          memory: 1536M
          cpus: "0.8"
COMPOSEEOF

# ── Write the Bot Script ──
mkdir -p /opt/claw/bot
cat > /opt/claw/bot/package.json << 'PKGEOF'
{
  "name": "claw-bot",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "node-telegram-bot-api": "^0.66.0",
    "openai": "^4.0.0",
    "@anthropic-ai/sdk": "^0.39.0",
    "@google/generative-ai": "^0.21.0"
  }
}
PKGEOF

cat > /opt/claw/bot/index.js << 'BOTEOF'
import fs from 'fs';

const {
  LLM_PROVIDER,
  LLM_API_KEY,
  CHANNEL,
  BOT_TOKEN,
  BOT_NAME,
  DEPLOYMENT_ID,
} = process.env;

const systemPrompt = (() => {
  try {
    return fs.readFileSync('/app/config/system_prompt.txt', 'utf8').trim();
  } catch {
    return 'You are a helpful AI assistant.';
  }
})();

console.log(\`[Claw] Starting bot: \${BOT_NAME} (ID: \${DEPLOYMENT_ID})\`);
console.log(\`[Claw] Provider: \${LLM_PROVIDER} | Channel: \${CHANNEL}\`);

// ── LLM Clients ──
async function callLLM(messages) {
  if (LLM_PROVIDER === 'anthropic') {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: LLM_API_KEY });
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: systemPrompt,
      messages,
    });
    return response.content[0]?.text || 'I could not generate a response.';
  }

  if (LLM_PROVIDER === 'openai') {
    const { default: OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey: LLM_API_KEY });
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      max_tokens: 2048,
    });
    return response.choices[0]?.message?.content || 'I could not generate a response.';
  }

  if (LLM_PROVIDER === 'google') {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(LLM_API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: systemPrompt,
    });
    const prompt = messages.map(m => m.content).join('\\n');
    const result = await model.generateContent(prompt);
    return result.response.text() || 'I could not generate a response.';
  }

  return 'Unknown LLM provider.';
}

// ── Memory (simple per-user conversation history) ──
const conversations = new Map();
const MAX_HISTORY = 20;

function getHistory(userId) {
  if (!conversations.has(userId)) conversations.set(userId, []);
  return conversations.get(userId);
}

function addToHistory(userId, role, content) {
  const history = getHistory(userId);
  history.push({ role, content });
  if (history.length > MAX_HISTORY) history.splice(0, history.length - MAX_HISTORY);
}

// ── Telegram Bot ──
if (CHANNEL === 'telegram') {
  const TelegramBot = (await import('node-telegram-bot-api')).default;
  const bot = new TelegramBot(BOT_TOKEN, { polling: true });

  console.log('[Claw] Telegram bot connected. Listening for messages...');

  bot.on('message', async (msg) => {
    if (!msg.text) return;
    const userId = String(msg.from.id);
    const userMsg = msg.text;

    console.log(\`[Claw] Message from \${msg.from.username || userId}: \${userMsg.slice(0, 80)}\`);

    addToHistory(userId, 'user', userMsg);

    try {
      const response = await callLLM(getHistory(userId));
      addToHistory(userId, 'assistant', response);

      // Split long messages (Telegram 4096 char limit)
      const chunks = response.match(/[\\s\\S]{1,4000}/g) || [response];
      for (const chunk of chunks) {
        await bot.sendMessage(msg.chat.id, chunk, { parse_mode: 'Markdown' }).catch(() => {
          bot.sendMessage(msg.chat.id, chunk);
        });
      }
    } catch (err) {
      console.error('[Claw] LLM Error:', err.message);
      await bot.sendMessage(msg.chat.id, 'Sorry, I encountered an error. Please try again.');
    }
  });

  bot.on('polling_error', (err) => {
    console.error('[Claw] Polling error:', err.message);
  });
}

// ── Discord Bot (placeholder for future) ──
if (CHANNEL === 'discord') {
  console.log('[Claw] Discord support coming soon. Bot is in standby mode.');
}

// ── Health check endpoint ──
import { createServer } from 'http';
const healthServer = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'running',
      bot: BOT_NAME,
      provider: LLM_PROVIDER,
      channel: CHANNEL,
      uptime: process.uptime(),
      deployment: DEPLOYMENT_ID,
    }));
  } else {
    res.writeHead(404);
    res.end();
  }
});
healthServer.listen(8080, () => {
  console.log('[Claw] Health endpoint on :8080/health');
});

// ── Graceful Shutdown ──
process.on('SIGTERM', () => {
  console.log('[Claw] Shutting down...');
  healthServer.close();
  process.exit(0);
});

console.log('[Claw] Bot is fully operational.');
BOTEOF

# ── Install Dependencies & Start ──
cd /opt/claw

echo "Installing bot dependencies..."
docker run --rm -v /opt/claw/bot:/app -w /app node:20-slim npm install --production 2>&1 | tail -5

echo "Starting services..."
docker compose --env-file .env up -d 2>/dev/null || docker-compose --env-file .env up -d

# ── Callback to Claws server ──
INSTANCE_IP=$(curl -s http://169.254.169.254/v1/interfaces/0/ipv4/address 2>/dev/null || hostname -I | awk '{print $1}' || echo "unknown")

if [ -n "${callbackUrl || ''}" ]; then
  curl -s -X POST "${callbackUrl || ''}" \\
    -H "Content-Type: application/json" \\
    -d "{\\"deploymentId\\":\\"${deploymentId}\\",\\"status\\":\\"running\\",\\"ip\\":\\"\${INSTANCE_IP}\\"}" || true
fi

echo "=== Claws Deployment Complete ==="
echo "Bot: ${escapeShell(botName)}"
echo "IP: \${INSTANCE_IP}"
echo "Health: http://\${INSTANCE_IP}:8080/health"
`;
}
