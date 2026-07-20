import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TrackingClientPage } from "./client-page";

export default async function BuyerTrackingPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const id = resolvedParams.id;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get order and delivery info using service role to bypass complex nested RLS joins
  const { createServiceClient } = require("@/lib/supabase/service");
  const serviceClient = createServiceClient();
  const { data: order } = await serviceClient
    .from("orders")
    .select(`
      id, status, quantity_ordered, total_price,
      product:products ( name ),
      farmer:users!orders_farmer_id_fkey ( full_name, phone ),
      delivery:deliveries ( id, status, current_location, agent:users!deliveries_agent_id_fkey ( full_name, phone ) )
    `)
    .eq("id", id)
    .eq("buyer_id", user.id)
    .single();

  if (!order || !order.delivery || order.delivery.length === 0) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold mb-4">Tracking Not Available</h1>
        <p className="text-muted-foreground">This order does not have an active delivery yet.</p>
      </div>
    );
  }

  const delivery = Array.isArray(order.delivery) ? order.delivery[0] : order.delivery;

  // Phase 8: Fetch OTP from notifications
  const { data: notifications } = await supabase
    .from("notifications")
    .select("message")
    .eq("user_id", user.id)
    .eq("type", "out_for_delivery")
    .order("created_at", { ascending: false });

  let otp = null;
  if (notifications && notifications.length > 0) {
    const notif = notifications.find(n => n.message.includes(id) && n.message.includes("Your verification code is"));
    if (notif) {
      const match = notif.message.match(/code is (\d{6})/);
      if (match) otp = match[1];
    } else {
      // Fallback
      const oldNotif = notifications.find(n => n.message.includes("Your verification code is"));
      if (oldNotif) {
        const match = oldNotif.message.match(/code is (\d{6})/);
        if (match) otp = match[1];
      }
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Live Delivery Tracking</h1>
      <TrackingClientPage 
        order={order} 
        delivery={delivery} 
        otp={otp}
        supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL || ""} 
        supabaseAnonKey={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""} 
      />
    </div>
  );
}
