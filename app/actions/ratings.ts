"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function submitRating(orderId: string, revieweeId: string, rating: number, comment?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: "Unauthorized" }

  if (rating < 1 || rating > 5) {
    return { error: "Rating must be between 1 and 5" }
  }

  // Check if order exists and is completed
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .single()

  if (orderErr || !order) return { error: "Order not found" }
  if (order.status !== 'completed') return { error: "Can only rate completed orders" }

  // Insert rating
  const { error: insertErr } = await supabase
    .from("ratings_reviews")
    .insert({
      order_id: orderId,
      reviewer_id: user.id,
      reviewee_id: revieweeId,
      rating: rating,
      comment: comment
    })

  if (insertErr) {
    if (insertErr.code === '23505') { // Unique violation
      return { error: "You have already rated this user for this order" }
    }
    return { error: "Failed to submit rating" }
  }

  // Update rating_avg for the reviewee
  await updateRatingAverage(revieweeId)

  // Revalidate relevant pages
  revalidatePath("/buyer/orders")
  revalidatePath("/farmer/orders")
  revalidatePath(`/products`)

  return { success: true }
}

async function updateRatingAverage(userId: string) {
  const supabase = await createClient()

  // Calculate new average
  const { data: ratings, error } = await supabase
    .from("ratings_reviews")
    .select("rating")
    .eq("reviewee_id", userId)

  if (error || !ratings || ratings.length === 0) return

  const total = ratings.reduce((sum, r) => sum + r.rating, 0)
  const avg = (total / ratings.length).toFixed(2)

  // Try updating all possible profile tables (we don't know the role)
  // This is a naive approach; ideally we'd check their role or try all safely
  await Promise.all([
    supabase.from("farmer_profiles").update({ rating_avg: parseFloat(avg) }).eq("user_id", userId),
    supabase.from("buyer_profiles").update({ rating_avg: parseFloat(avg) }).eq("user_id", userId),
    supabase.from("delivery_agent_profiles").update({ rating_avg: parseFloat(avg) }).eq("user_id", userId)
  ])
}
