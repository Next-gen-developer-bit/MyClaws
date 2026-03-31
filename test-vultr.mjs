const VULTR_API_KEY = 'TR5ZB3VQGBZ4BHJ4IX3GEXFXKAFANBQQ2YRA';

async function testPlans() {
  try {
    const res = await fetch('https://api.vultr.com/v2/plans', {
      headers: { Authorization: `Bearer ${VULTR_API_KEY}` }
    });
    const d = await res.json();
    ['bom', 'blr', 'del'].forEach(region => {
      console.log(`\nChecking plans in ${region}:`);
      const available = (d.plans || [])
        .filter(p => p.locations.includes(region) && p.ram <= 4096)
        .sort((a, b) => a.monthly_cost - b.monthly_cost);
        
      available.slice(0, 5).forEach(p => {
        console.log(`   ${p.id}: $${p.monthly_cost}/mo, ${p.vcpu_count}vCPU, ${p.ram}MB RAM, Type: ${p.type}`);
      });
    });
  } catch (e) {
    console.error(e);
  }
}
testPlans();
