import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testQueries() {
  console.log("Testing Products join...");
  const { data: d1, error: e1 } = await supabase
    .from("products")
    .select(`
      id,
      farmer:users!products_farmer_id_fkey (
        full_name,
        farmer_profiles (farm_name)
      )
    `)
    .limit(1);
  console.log("Q1 Error:", e1?.message);
  console.log("Q1 Data:", JSON.stringify(d1, null, 2));

  console.log("Testing Admin Products join...");
  const { data: d2, error: e2 } = await supabase
    .from("products")
    .select(`
      *,
      farmer_profiles (farm_name),
      product_images (storage_path, is_primary)
    `)
    .eq("status", "pending_approval")
    .limit(1);
  console.log("Q2 Error:", e2?.message);

  console.log("Testing Disputes join...");
  const { data: d3, error: e3 } = await supabase
    .from("disputes")
    .select(`
      *,
      orders (
        id,
        quantity_ordered,
        total_price,
        status,
        products (name),
        buyer_profiles (business_name),
        farmer_profiles (farm_name)
      )
    `)
    .limit(1);
  console.log("Q3 Error:", e3?.message);
}

testQueries();
