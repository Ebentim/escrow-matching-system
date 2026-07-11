"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function updateFarmerProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return

  const farm_name = formData.get("farm_name") as string
  const farm_location = formData.get("farm_location") as string
  const bio = formData.get("bio") as string

  const { error } = await supabase
    .from("farmer_profiles")
    .update({ farm_name, farm_location, bio })
    .eq("user_id", user.id)

  if (error) return

  revalidatePath("/farmer/profile")
  redirect("/farmer/dashboard")
}

export async function updateBuyerProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return

  const business_name = formData.get("business_name") as string
  const delivery_address = formData.get("delivery_address") as string

  const { error } = await supabase
    .from("buyer_profiles")
    .update({ business_name, delivery_address })
    .eq("user_id", user.id)

  if (error) return

  revalidatePath("/buyer/profile")
  redirect("/buyer/dashboard")
}
