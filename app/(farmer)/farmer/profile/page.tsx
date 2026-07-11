import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { updateFarmerProfile } from "@/app/actions/profile"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export default async function FarmerProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("farmer_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single()

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Farmer Profile</CardTitle>
          <CardDescription>Update your public farm details.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateFarmerProfile} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="farm_name">Farm Name</Label>
              <Input id="farm_name" name="farm_name" defaultValue={profile?.farm_name || ""} required />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="farm_location">Farm Location</Label>
              <Input id="farm_location" name="farm_location" defaultValue={profile?.farm_location || ""} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea 
                id="bio" 
                name="bio" 
                rows={4}
                defaultValue={profile?.bio || ""} 
                placeholder="Tell buyers about your farm and practices..."
              />
            </div>

            <Button type="submit" className="w-full">Save Changes</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
