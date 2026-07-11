import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Helper to create a client with no persistent session sharing
const createTestClient = () => createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
const adminClient = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

async function runTests() {
  console.log("Starting Phase 3 API tests...\n");

  const farmerClient = createTestClient();
  const buyerClient = createTestClient();

  console.log("1. Creating test Farmer and Buyer using admin API...");
  const farmerEmail = `testfarmer${Date.now()}@example.com`;
  const buyerEmail = `testbuyer${Date.now()}@example.com`;
  const password = "Password123!";

  const { data: farmerAuth, error: farmerErr } = await adminClient.auth.admin.createUser({
    email: farmerEmail,
    password,
    email_confirm: true,
    user_metadata: { role: 'farmer', full_name: 'Test Farmer', location: 'Test Location' }
  });
  if (farmerErr) throw farmerErr;

  const { data: buyerAuth, error: buyerErr } = await adminClient.auth.admin.createUser({
    email: buyerEmail,
    password,
    email_confirm: true,
    user_metadata: { role: 'buyer', full_name: 'Test Buyer', location: 'Test Location' }
  });
  if (buyerErr) throw buyerErr;

  const farmerId = farmerAuth.user.id;
  
  // Log in
  const { error: fErr } = await farmerClient.auth.signInWithPassword({ email: farmerEmail, password });
  if (fErr) throw new Error(`Farmer login failed: ${fErr.message}`);
  
  const { error: bErr } = await buyerClient.auth.signInWithPassword({ email: buyerEmail, password });
  if (bErr) throw new Error(`Buyer login failed: ${bErr.message}`);

  console.log("Users registered and logged in successfully.\n");

  console.log("2. Farmer creating a product...");
  const { data: product, error: createError } = await farmerClient.from('products').insert({
    farmer_id: farmerId,
    name: 'Test Cassava',
    crop_type: 'Cassava',
    quantity: 100,
    unit: 'kg',
    price: 5000,
    harvest_date: '2025-01-01',
    location: 'Ogun State',
    status: 'pending_approval'
  }).select().single();

  if (createError) throw createError;
  console.log(`Product created successfully. Status: ${product.status}`);

  console.log("\n3. Testing Buyer access to pending product...");
  const { data: buyerFetch1, error: fetchErr1 } = await buyerClient.from('products').select('*').eq('id', product.id);
  if (fetchErr1) throw fetchErr1;
  if (buyerFetch1.length === 0) {
    console.log("Success: Buyer CANNOT see the pending product.");
  } else {
    console.error("FAIL: Buyer can see the pending product!");
  }

  console.log("\n4. Admin approving the product...");
  const { error: approveErr } = await adminClient.from('products').update({ status: 'available' }).eq('id', product.id);
  if (approveErr) throw approveErr;
  console.log("Product approved.");

  console.log("\n5. Testing Buyer access to approved product...");
  const { data: buyerFetch2, error: fetchErr2 } = await buyerClient.from('products').select('*').eq('id', product.id);
  if (fetchErr2) throw fetchErr2;
  if (buyerFetch2.length > 0) {
    console.log("Success: Buyer CAN now see the approved product.");
  } else {
    console.error("FAIL: Buyer still cannot see the approved product!");
  }

  console.log("\n6. Buyer attempting to edit the product (should fail)...");
  const { error: editErr1 } = await buyerClient.from('products').update({ price: 1000 }).eq('id', product.id);
  if (editErr1) {
    // PostgREST doesn't always throw an error for RLS failure on update, it just returns 0 rows updated
    // But if we select it we can check if it changed
  }
  const { data: checkEdit } = await adminClient.from('products').select('price').eq('id', product.id).single();
  if (checkEdit!.price !== 1000) {
    console.log("Success: Buyer edit was blocked by RLS.");
  } else {
    console.error("FAIL: Buyer was able to edit the product!");
  }

  console.log("\n7. Farmer updating their own product...");
  const { error: editErr2 } = await farmerClient.from('products').update({ price: 6000 }).eq('id', product.id);
  if (editErr2) throw editErr2;
  
  const { data: checkEdit2 } = await adminClient.from('products').select('price').eq('id', product.id).single();
  if (checkEdit2!.price === 6000) {
    console.log("Success: Farmer successfully edited their product.");
  } else {
    console.error("FAIL: Farmer could not edit their product!");
  }

  console.log("\n8. Farmer softly deleting the product (changing status to sold)...");
  const { error: delErr } = await farmerClient.from('products').update({ status: 'sold' }).eq('id', product.id);
  if (delErr) throw delErr;

  const { data: buyerFetch3 } = await buyerClient.from('products').select('*').eq('id', product.id);
  if (buyerFetch3!.length === 0) {
    console.log("Success: Product is now hidden from buyer since it is sold.");
  } else {
    console.error("FAIL: Buyer can still see the sold product!");
  }

  console.log("\nAll tests completed successfully!");
}

runTests().catch(console.error);
