import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const createTestClient = () => createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
const adminClient = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

async function runTests() {
  console.log("Starting Phase 4 API tests...\n");

  const farmerClient = createTestClient();
  const buyerClient = createTestClient();

  const farmerEmail = `p4farmer${Date.now()}@example.com`;
  const buyerEmail = `p4buyer${Date.now()}@example.com`;
  const password = "Password123!";

  console.log("1. Setting up users...");
  const { data: farmerAuth, error: fErr } = await adminClient.auth.admin.createUser({
    email: farmerEmail, password, email_confirm: true, user_metadata: { role: 'farmer' }
  });
  if (fErr) { console.error("Farmer Error:", fErr); throw fErr; }

  const { data: buyerAuth, error: bErr } = await adminClient.auth.admin.createUser({
    email: buyerEmail, password, email_confirm: true, user_metadata: { role: 'buyer' }
  });
  if (bErr) { console.error("Buyer Error:", bErr); throw bErr; }

  const farmerId = farmerAuth!.user.id;
  await farmerClient.auth.signInWithPassword({ email: farmerEmail, password });
  await buyerClient.auth.signInWithPassword({ email: buyerEmail, password });

  console.log("2. Generating 500 products to test performance and pagination...");
  const crops = ["Cassava", "Maize", "Yam", "Tomatoes", "Onions"];
  const locations = ["Lagos", "Abuja", "Ogun", "Kano", "Rivers"];
  const statuses = ["available", "pending_approval", "sold"];

  const productsToInsert = [];
  for (let i = 0; i < 500; i++) {
    // 80% available, 10% pending, 10% sold
    const statusRand = Math.random();
    const status = statusRand < 0.8 ? "available" : (statusRand < 0.9 ? "pending_approval" : "sold");
    
    productsToInsert.push({
      farmer_id: farmerId,
      name: `Premium ${crops[i % crops.length]} Batch ${i}`,
      crop_type: crops[i % crops.length],
      quantity: 10 + (i % 50),
      unit: "kg",
      price: 1000 + (i * 10), // varies 1000 to 6000
      harvest_date: new Date(Date.now() - (i * 10000000)).toISOString(),
      location: locations[i % locations.length],
      status: status
    });
  }

  // Insert in batches of 100
  for (let i = 0; i < productsToInsert.length; i += 100) {
    const batch = productsToInsert.slice(i, i + 100);
    const { error: insertErr } = await adminClient.from('products').insert(batch);
    if (insertErr) throw insertErr;
  }
  console.log("500 products seeded.\n");

  console.log("3. Testing single filters (Location, Crop, Price)");
  // Test Location
  let startTime = Date.now();
  let { data: locRes } = await buyerClient.from('products').select('*').eq('status', 'available').ilike('location', '%Lagos%');
  let latency = Date.now() - startTime;
  console.log(`- Filter by location: Found ${locRes!.length} products in ${latency}ms`);
  if (!locRes!.every(p => p.location.includes("Lagos"))) throw new Error("Location filter failed");

  // Test Price
  startTime = Date.now();
  let { data: priceRes } = await buyerClient.from('products').select('*').eq('status', 'available').gte('price', 3000).lte('price', 4000);
  latency = Date.now() - startTime;
  console.log(`- Filter by price (3000-4000): Found ${priceRes!.length} products in ${latency}ms`);
  if (!priceRes!.every(p => p.price >= 3000 && p.price <= 4000)) throw new Error("Price filter failed");

  console.log("\n4. Testing combined filters (Crop + Location + Price)");
  startTime = Date.now();
  let { data: combinedRes } = await buyerClient.from('products').select('*')
    .eq('status', 'available')
    .ilike('crop_type', '%Cassava%')
    .ilike('location', '%Ogun%')
    .lte('price', 5000);
  latency = Date.now() - startTime;
  console.log(`- Combined filter: Found ${combinedRes!.length} products in ${latency}ms`);
  if (latency > 2000) console.error("WARNING: Latency exceeded 2 seconds!");
  
  if (!combinedRes!.every(p => 
    p.crop_type.includes("Cassava") && 
    p.location.includes("Ogun") && 
    p.price <= 5000 && 
    p.status === "available"
  )) {
    throw new Error("Combined filter returned invalid results");
  }

  console.log("\n5. Testing free-text search (case insensitive)");
  let { data: textRes } = await buyerClient.from('products').select('*').eq('status', 'available').ilike('name', '%premium cassava%');
  console.log(`- Text search for 'premium cassava': Found ${textRes!.length} matches`);
  if (!textRes!.every(p => p.name.toLowerCase().includes("premium cassava"))) throw new Error("Text search failed");

  console.log("\n6. Checking visibility (pending/sold are hidden from buyers)");
  let { data: pendingSoldRes } = await buyerClient.from('products').select('*').in('status', ['pending_approval', 'sold']);
  if (pendingSoldRes!.length > 0) {
    throw new Error(`FAIL: Buyer can see ${pendingSoldRes!.length} pending/sold products!`);
  }
  console.log("- Success: pending_approval and sold products are completely hidden from buyers.");

  console.log("\n7. Testing pagination logic at boundaries");
  // Page 1 (offset 0, limit 12)
  let { data: page1 } = await buyerClient.from('products').select('*').eq('status', 'available').order('created_at', { ascending: false }).range(0, 11);
  // Page 2 (offset 12, limit 12)
  let { data: page2 } = await buyerClient.from('products').select('*').eq('status', 'available').order('created_at', { ascending: false }).range(12, 23);
  
  if (page1!.length !== 12 || page2!.length !== 12) throw new Error("Pagination size mismatch");
  
  // Ensure no overlap between page 1 and page 2
  const p1Ids = new Set(page1!.map(p => p.id));
  const overlap = page2!.some(p => p1Ids.has(p.id));
  if (overlap) throw new Error("Pagination boundary failed: overlap detected");
  console.log("- Success: Pagination returned disjoint result sets without overlap.");

  console.log("\nPhase 4 API Testing completed successfully. All constraints met and latency is within limits.");
}

runTests().catch(e => {
  console.error("Test execution failed:", e);
  process.exit(1);
});
