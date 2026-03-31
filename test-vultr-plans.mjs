const VULTR_API_KEY = 'TR5ZB3VQGBZ4BHJ4IX3GEXFXKAFANBQQ2YRA';

async function checkPlans() {
  try {
    const res = await fetch('https://api.vultr.com/v2/plans?type=vc2', {
      headers: { Authorization: `Bearer ${VULTR_API_KEY}` },
    });
    const d = await res.json();
    console.log("Checking vc2 plans in bom:");
    d.plans.filter(p => p.locations.includes('bom') && p.ram <= 2048).forEach(p => {
      console.log(`- ${p.id}: $${p.monthly_cost}/mo, ${p.vcpu_count}vCPU, ${p.ram}MB RAM`);
    });
    
    // Also check Bangalore (blr) and Delhi (del)
    console.log("\\nChecking vc2 plans in blr:");
    d.plans.filter(p => p.locations.includes('blr') && p.ram <= 2048).forEach(p => {
      console.log(`- ${p.id}: $${p.monthly_cost}/mo, ${p.vcpu_count}vCPU, ${p.ram}MB RAM`);
    });

    console.log("\\nChecking vc2 plans in del:");
    d.plans.filter(p => p.locations.includes('del') && p.ram <= 2048).forEach(p => {
      console.log(`- ${p.id}: $${p.monthly_cost}/mo, ${p.vcpu_count}vCPU, ${p.ram}MB RAM`);
    });
    
    // Also check high frequency / optimized cloud just in case vc2 (standard) is not available
    const r2 = await fetch('https://api.vultr.com/v2/plans?type=vhp', {
      headers: { Authorization: `Bearer ${VULTR_API_KEY}` },
    });
    const d2 = await r2.json();
    console.log("\\nChecking vhp (High Perf) plans in bom/blr/del:");
    d2.plans.filter(p => (p.locations.includes('bom') || p.locations.includes('blr') || p.locations.includes('del')) && p.ram <= 2048).forEach(p => {
      console.log(`- ${p.id}: $${p.monthly_cost}/mo, ${p.vcpu_count}vCPU, ${p.ram}MB RAM (${p.locations.join(',')})`);
    });

  } catch(e) {
    console.error(e.message);
  }
}
checkPlans();
