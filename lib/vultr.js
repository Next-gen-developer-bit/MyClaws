const VULTR_API = 'https://api.vultr.com/v2';

function headers() {
  return {
    Authorization: `Bearer ${process.env.VULTR_API_KEY}`,
    'Content-Type': 'application/json',
  };
}

async function vultrFetch(path, options = {}) {
  const res = await fetch(`${VULTR_API}${path}`, {
    ...options,
    headers: { ...headers(), ...options.headers },
  });

  // DELETE returns 204 No Content
  if (res.status === 204) return {};

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error || data?.message || `Vultr API error ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

// ── Instance Management ──

/**
 * Create a new VPS instance for a Claw deployment
 * @param {object} config
 * @param {string} config.name - Instance label (e.g., claw-abc123)
 * @param {string} config.region - Region slug (default: bom for Mumbai)
 * @param {string} config.plan - Plan slug (default: vc2-1c-2gb)
 * @param {string} config.userData - Cloud-init script (base64 encoded)
 * @param {number} config.osId - OS ID (default: 2284 = Ubuntu 24.04 x64)
 * @returns {object} instance object with id, main_ip, status, etc.
 */
export async function createInstance(config) {
  const {
    name,
    region = 'bom',       // Mumbai, India (closest to user)
    plan = 'vc2-1c-2gb',  // 1 vCPU, 2GB RAM — $10/mo
    userData,
    osId = 2284,          // Ubuntu 24.04 x64 (Correct ID)
  } = config;

  // Vultr requires user_data to be base64 encoded
  const userDataB64 = Buffer.from(userData || '').toString('base64');

  const body = {
    region,
    plan,
    os_id: osId,
    label: name,
    user_data: userDataB64,
    backups: 'disabled',
    hostname: name,
    tags: ['claws', 'bot-deployment'],
  };

  console.log('[Vultr Request Config]', JSON.stringify({ ...body, user_data: '<b64_hidden>' }, null, 2));

  const data = await vultrFetch('/instances', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  return data.instance;
}

/** Get instance details */
export async function getInstance(instanceId) {
  const data = await vultrFetch(`/instances/${instanceId}`);
  return data.instance;
}

/** Get instance's public IPv4 address */
export function getInstanceIP(instance) {
  // Vultr returns main_ip directly on the instance object
  const ip = instance?.main_ip;
  // '0.0.0.0' means IP hasn't been assigned yet
  return ip && ip !== '0.0.0.0' ? ip : null;
}

/** Destroy an instance */
export async function destroyInstance(instanceId) {
  await vultrFetch(`/instances/${instanceId}`, {
    method: 'DELETE',
  });
  return true;
}

/** Halt (power off) an instance */
export async function haltInstance(instanceId) {
  await vultrFetch(`/instances/${instanceId}/halt`, {
    method: 'POST',
  });
}

/** Start (power on) an instance */
export async function startInstance(instanceId) {
  await vultrFetch(`/instances/${instanceId}/start`, {
    method: 'POST',
  });
}

/** Reboot an instance */
export async function rebootInstance(instanceId) {
  await vultrFetch(`/instances/${instanceId}/reboot`, {
    method: 'POST',
  });
}

// ── Utility ──

/**
 * Poll until an instance is active and has a public IP
 * @param {string} instanceId
 * @param {number} maxWaitMs - Max wait time (default: 120s)
 * @returns {object} instance with IP
 */
export async function waitForInstance(instanceId, maxWaitMs = 120000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const instance = await getInstance(instanceId);
    const ip = getInstanceIP(instance);
    if (instance.status === 'active' && instance.power_status === 'running' && ip) {
      return { ...instance, ip };
    }
    // Wait 5 seconds before next poll
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error('Timeout: Instance did not become active within the expected time.');
}

/** List all Claws-tagged instances */
export async function listClawsInstances() {
  const data = await vultrFetch('/instances?tag=claws');
  return data.instances || [];
}

/** Get account info */
export async function getAccount() {
  const data = await vultrFetch('/account');
  return data.account;
}
