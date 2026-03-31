const VULTR_API_KEY = 'TR5ZB3VQGBZ4BHJ4IX3GEXFXKAFANBQQ2YRA';

async function testProvisionFull() {
  try {
    const body = {
      region: 'bom',
      plan: 'vc2-1c-2gb',
      os_id: 2284,
      label: 'claw-testfull',
      user_data: Buffer.from('#!/bin/bash\necho "Hello World"').toString('base64'),
      backups: 'disabled',
      hostname: 'claw-testfull',     // Does this break?
      tags: ['claws', 'bot-deployment'], // Does this break?
    };
    
    console.log("Sending payload:", JSON.stringify({ ...body, user_data: '<b64>' }, null, 2));
    
    const res = await fetch('https://api.vultr.com/v2/instances', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${VULTR_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    const d = await res.json().catch(() => ({}));
    if (res.ok) {
      console.log(`✅ SUCCESS! Instance ID:`, d.instance.id);
      await fetch(`https://api.vultr.com/v2/instances/${d.instance.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${VULTR_API_KEY}` }
      });
      console.log(`Destroyed test instance.`);
    } else {
      console.log(`❌ FAILED:`, res.status, d);
    }
  } catch (e) {
    console.error('Network err:', e.message);
  }
}
testProvisionFull();
