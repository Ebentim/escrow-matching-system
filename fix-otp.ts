import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as crypto from "crypto";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function fix() {
  const { data: verifications } = await supabase.from("delivery_verifications").select("*, deliveries(orders(buyer_id))").eq("status", "pending");
  if (!verifications) return;

  for (const v of verifications) {
    const rawOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = crypto.createHash('sha256').update(rawOtp).digest('hex');

    // Update code hash
    await supabase.from("delivery_verifications").update({ code_hash: codeHash }).eq("id", v.id);

    const buyerId = Array.isArray(v.deliveries?.orders) 
      ? v.deliveries?.orders[0]?.buyer_id 
      : v.deliveries?.orders?.buyer_id;

    if (buyerId) {
      const { error } = await supabase.from("notifications").insert({
        user_id: buyerId,
        type: 'out_for_delivery',
        message: `Your order (${v.deliveries?.orders?.id || v.deliveries?.orders?.[0]?.id}) is on the way! Your verification code is ${rawOtp}. Present this or its QR code to the agent.`
      });
      console.log(`Inserted notification for ${buyerId}, error:`, error);
    } else {
      console.log(`Could not find buyerId for verification ${v.id}`, v.deliveries);
    }
  }
}

fix();
