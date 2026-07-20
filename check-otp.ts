import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  const { data: verifications, error: vErr } = await supabase.from("delivery_verifications").select("*");
  console.log("Verifications:", verifications);

  const { data: notifications, error: nErr } = await supabase.from("notifications").select("*").eq("type", "out_for_delivery");
  console.log("Notifications:", notifications);
  
  const { data: deliveries, error: dErr } = await supabase.from("deliveries").select("*, orders(*)");
  console.log("Deliveries:", deliveries);
}

check();
