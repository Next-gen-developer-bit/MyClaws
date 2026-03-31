const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  const testId = 'e693365f-0b9b-457f-9f37-6d7bcc08c4e7';
  
  console.log('Testing reading from profiles...');
  const { data: readData, error: readError } = await supabase
    .from('profiles')
    .select('*')
    .limit(1);
    
  console.log('Read Result:', { data: readData, error: readError?.message, code: readError?.code });

  console.log('\nTesting writing to users? Maybe they use users table?');
  const { data: uData, error: uError } = await supabase
    .from('users')
    .select('*')
    .limit(1);
    
  console.log('Users Result:', { data: !!uData, error: uError?.message });
}
main();
