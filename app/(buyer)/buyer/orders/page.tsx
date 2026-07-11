import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { BuyerOrdersClient } from "./client-page"

export default async function BuyerOrdersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: orders } = await supabase
    .from("orders")
    .select(`
      *,
      products (name, crop_type, unit, product_images(storage_path, is_primary)),
      farmer_profiles!orders_farmer_id_fkey(farm_name)
    `)
    .eq("buyer_id", user.id)
    .order("created_at", { ascending: false })

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold mb-8">My Orders</h1>
      <BuyerOrdersClient orders={orders || []} />
    </div>
  )
}
