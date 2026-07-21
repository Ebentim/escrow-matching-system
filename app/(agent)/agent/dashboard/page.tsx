import { createClient } from "@/lib/supabase/server";
import { AgentDashboardClient } from "./client-page";
import { redirect } from "next/navigation";

export default async function AgentDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { createServiceClient } = await import("@/lib/supabase/service");
  const serviceClient = createServiceClient();

  const { data: deliveries } = await serviceClient
    .from("deliveries")
    .select(`
      id, status, pickup_time, current_location,
      order:orders (
        id, quantity_ordered, total_price,
        product:products ( name, location ),
        buyer:users!orders_buyer_id_fkey ( full_name, phone ),
        farmer:users!orders_farmer_id_fkey ( full_name, phone )
      )
    `)
    .eq("agent_id", user.id)
    .order("id", { ascending: false });

  const { data: allEscrowOrders } = await serviceClient
    .from("orders")
    .select(`
      id, quantity_ordered, total_price, created_at,
      product:products ( name, location ),
      buyer:users!orders_buyer_id_fkey ( full_name, phone ),
      farmer:users!orders_farmer_id_fkey ( full_name, phone ),
      deliveries ( id )
    `)
    .eq("status", "in_escrow")
    .order("created_at", { ascending: false });

  // Filter out those that already have a delivery record
  const unassignedOrders = allEscrowOrders?.filter(o => !o.deliveries || o.deliveries.length === 0) || [];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Delivery Agent Dashboard</h1>
      <AgentDashboardClient deliveries={deliveries || []} unassignedOrders={unassignedOrders} />
    </div>
  );
}
