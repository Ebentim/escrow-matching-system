import { createClient } from "@/lib/supabase/server"
import { RecommendedProducts } from "./recommended-products"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { redirect } from "next/navigation"

export default async function BuyerDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from("buyer_profiles")
    .select("geolocation")
    .eq("user_id", user.id)
    .single()

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Buyer Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Discover fresh produce tailored to your needs.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/buyer/orders">
            <Button variant="outline">My Orders</Button>
          </Link>
          <Link href="/buyer/profile">
            <Button variant="outline">Edit Profile</Button>
          </Link>
        </div>
      </div>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Recommended for You</h2>
        <RecommendedProducts 
          userGeolocation={profile?.geolocation as { lat: number; lng: number } | null} 
        />
      </section>
    </div>
  )
}
