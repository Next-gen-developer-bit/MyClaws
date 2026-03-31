/**
 * DigitalOcean API Client for Claws
 * Handles VPS provisioning, management, and teardown
 */

const DO_API = 'https://api.digitalocean.com/v2';

function headers() {
  return {
    Authorization: `Bearer ${process.env.DIGITALOCEAN_API_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

async function doFetch(path, options = {}) {
  const res = await fetch(`${DO_API}${path}`, {
    ...options,
    headers: { ...headers(), ...options.headers },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.message || data?.id || `DO API error ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

// ── SSH Key Management ──

/** Create an SSH key on DigitalOcean (if not already present) */
export async function ensureSSHKey(name, publicKey) {
  try {
    const data = await doFetch('/account/keys', {
      method: 'POST',
      body: JSON.stringify({ name, public_key: publicKey }),
    });
    return data.ssh_key;
  } catch (err) {
    if (err.message?.includes('already in use')) {
      // Key already exists, find it by fingerprint
      const { ssh_keys } = await doFetch('/account/keys');
      return ssh_keys?.[0];
    }
    throw err;
  }
}

/** List all SSH keys */
export async function listSSHKeys() {
  const data = await doFetch('/account/keys');
  return data.ssh_keys || [];
}

// ── Droplet Management ──

/**
 * Create a new droplet for a Claw deployment
 * @param {object} config
 * @param {string} config.name - Droplet name (e.g., claw-abc123)
 * @param {string} config.region - Region slug (default: blr1)
 * @param {string} config.size - Size slug (default: s-1vcpu-2gb)
 * @param {string} config.userData - Cloud-init script
 * @param {number[]} config.sshKeyIds - SSH key IDs
 */
export async function createDroplet(config) {
  const { name, region = 'blr1', size = 's-1vcpu-2gb', userData, sshKeyIds = [] } = config;

  const body = {
    name,
    region,
    size,
    image: 'docker-20-04', // Ubuntu 20.04 with Docker pre-installed
    ssh_keys: sshKeyIds,
    user_data: userData,
    backups: false,
    ipv6: false,
    monitoring: true,
    tags: ['claws', 'bot-deployment'],
  };

  const data = await doFetch('/droplets', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  return data.droplet;
}

/** Get droplet details */
export async function getDroplet(dropletId) {
  const data = await doFetch(`/droplets/${dropletId}`);
  return data.droplet;
}

/** Get droplet's public IPv4 address */
export function getDropletIP(droplet) {
  const v4 = droplet?.networks?.v4 || [];
  const publicNet = v4.find((n) => n.type === 'public');
  return publicNet?.ip_address || null;
}

/** Destroy a droplet */
export async function destroyDroplet(dropletId) {
  await fetch(`${DO_API}/droplets/${dropletId}`, {
    method: 'DELETE',
    headers: headers(),
  });
  return true;
}

/** Power off a droplet */
export async function powerOffDroplet(dropletId) {
  await doFetch(`/droplets/${dropletId}/actions`, {
    method: 'POST',
    body: JSON.stringify({ type: 'power_off' }),
  });
}

/** Power on a droplet */
export async function powerOnDroplet(dropletId) {
  await doFetch(`/droplets/${dropletId}/actions`, {
    method: 'POST',
    body: JSON.stringify({ type: 'power_on' }),
  });
}

/** Reboot a droplet */
export async function rebootDroplet(dropletId) {
  await doFetch(`/droplets/${dropletId}/actions`, {
    method: 'POST',
    body: JSON.stringify({ type: 'reboot' }),
  });
}

// ── Utility ──

/**
 * Poll until a droplet is active and has an IP
 * @param {number} dropletId
 * @param {number} maxWaitMs - Max wait time (default: 120s)
 * @returns {object} droplet with IP
 */
export async function waitForDroplet(dropletId, maxWaitMs = 120000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const droplet = await getDroplet(dropletId);
    const ip = getDropletIP(droplet);
    if (droplet.status === 'active' && ip) {
      return { ...droplet, ip };
    }
    // Wait 5 seconds before next poll
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error('Timeout: Droplet did not become active within the expected time.');
}

/** List all Claws-tagged droplets */
export async function listClawsDroplets() {
  const data = await doFetch('/droplets?tag_name=claws');
  return data.droplets || [];
}

/** Get account info */
export async function getAccount() {
  const data = await doFetch('/account');
  return data.account;
}
