import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateBuyerProfile } from "@/app/actions/profile"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export default async function BuyerProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("buyer_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single()

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Buyer Profile</CardTitle>
          <CardDescription>Update your delivery details and business info.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateBuyerProfile} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="business_name">Business/Full Name</Label>
              <Input id="business_name" name="business_name" defaultValue={profile?.business_name || ""} required />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="delivery_address">Default Delivery Address</Label>
              <Input id="delivery_address" name="delivery_address" defaultValue={profile?.delivery_address || ""} required />
            </div>

            <Button type="submit" className="w-full">Save Changes</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
