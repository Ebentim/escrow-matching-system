import { createClient } from '@supabase/supabase-js'; 
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function test() {
  const { data, error } = await supabase.from('orders').select('id, delivery:deliveries(*)');
  console.log('Orders:', JSON.stringify(data, null, 2));
  console.log('Error:', error);
}
test();
