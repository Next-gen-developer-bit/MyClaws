const VULTR_API_KEY = 'TR5ZB3VQGBZ4BHJ4IX3GEXFXKAFANBQQ2YRA';

async function testProvision(plan) {
  try {
    const body = {
      region: 'bom',
      plan: plan,
      os_id: 2284,
      label: 'test-del',
      backups: 'disabled',
    };
    const res = await fetch('https://api.vultr.com/v2/instances', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${VULTR_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    const d = await res.json();
    if (res.ok) {
      console.log(`✅ SUCCESS provisioning ${plan} in bom! Instance ID:`, d.instance.id);
      // Immediately destroy it
      await fetch(`https://api.vultr.com/v2/instances/${d.instance.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${VULTR_API_KEY}` }
      });
      console.log(`Destroyed test instance.`);
      return true;
    } else {
      console.log(`❌ FAILED provisioning ${plan} in bom:`, d.error || d.message);
      return false;
    }
  } catch (e) {
    console.error('Network err:', e.message);
    return false;
  }
}

async function run() {
  const plansToTest = ['vc2-1c-2gb', 'vc2-1c-1gb', 'vhp-1c-1gb-intel', 'vhp-1c-1gb-amd', 'vhf-1c-1gb'];
  for (const plan of plansToTest) {
    console.log(`Testing plan ${plan}...`);
    const success = await testProvision(plan);
    if (success) {
      console.log(`Found working plan: ${plan}`);
      break;
    }
  }
}
run();
