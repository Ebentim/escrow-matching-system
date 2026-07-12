import { createClient } from "@/lib/supabase/server";
import { DisputesClient } from "./client-page";

export default async function AdminDisputesPage() {
  const supabase = await createClient();

  const { data: disputes, error } = await supabase
    .from("disputes")
    .select(`
      *,
      orders (
        *,
        products (name, price, unit),
        buyer:users!orders_buyer_id_fkey (buyer_profiles (business_name)),
        farmer:users!orders_farmer_id_fkey (farmer_profiles (farm_name)),
        escrow_transactions (amount, status)
      ),
      users!disputes_raised_by_fkey (full_name, role)
    `)
    .eq("status", "open")
    .order("created_at", { ascending: false });

  if (error) {
    return <div>Failed to load open disputes.</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Dispute Resolution</h1>
      <p className="text-muted-foreground">Review and resolve disputes raised by users. Resolutions trigger escrow actions automatically.</p>
      
      <DisputesClient disputes={disputes || []} />
    </div>
  );
}
