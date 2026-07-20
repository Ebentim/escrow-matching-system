import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export async function ActiveDeliveries({ userId }: { userId: string }) {
  const supabase = await createClient();

  const { data: activeOrders } = await supabase
    .from("orders")
    .select(`
      id, 
      status, 
      total_price,
      product:products ( name ),
      delivery:deliveries ( id, status )
    `)
    .eq("buyer_id", userId)
    .in("status", ["out_for_delivery"]);

  if (!activeOrders || activeOrders.length === 0) {
    return null;
  }

  // Fetch notifications for OTP
  const { data: notifications } = await supabase
    .from("notifications")
    .select("message")
    .eq("user_id", userId)
    .eq("type", "out_for_delivery")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold mb-4 text-primary">Active Deliveries & Verification Codes</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {activeOrders.map((order) => {
          let otp = "N/A";
          if (notifications) {
            // Find notification related to this specific order ID
            const notif = notifications.find(n => n.message.includes(order.id) && n.message.includes("Your verification code is"));
            if (notif) {
              const match = notif.message.match(/code is (\d{6})/);
              if (match) otp = match[1];
            } else {
              // Fallback for older notifications that didn't include order_id
              const oldNotif = notifications.find(n => n.message.includes("Your verification code is"));
              if (oldNotif) {
                const match = oldNotif.message.match(/code is (\d{6})/);
                if (match) otp = match[1];
              }
            }
          }

          const productName = Array.isArray(order.product) ? order.product[0]?.name : order.product?.name;

          return (
            <div key={order.id} className="border border-border/50 bg-card rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="font-semibold text-lg">{productName || "Product"}</h3>
              <p className="text-sm text-muted-foreground mb-4">Status: Out for Delivery</p>
              
              <div className="bg-primary/5 border border-primary/20 rounded p-3 mb-4 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Verification OTP</p>
                <p className="text-3xl font-mono font-bold tracking-widest text-primary">{otp}</p>
              </div>

              <Link href={`/buyer/orders/${order.id}/tracking`}>
                <Button className="w-full" variant="outline">Track Delivery</Button>
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
