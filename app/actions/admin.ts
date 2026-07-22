"use server"

import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { revalidatePath } from "next/cache"

async function logAdminAction(
  supabase: Awaited<ReturnType<typeof createClient>>,
  adminId: string,
  actionType: string,
  targetTable: string,
  targetId: string,
  notes?: string
) {
  await supabase.from("admin_actions").insert({
    admin_id: adminId,
    action_type: actionType,
    target_table: targetTable,
    target_id: targetId,
    notes: notes
  })
}

// User Management
export async function toggleUserStatus(userId: string, currentStatus: string, reason?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: "Unauthorized" }
  
  const { data: adminUser } = await supabase.from("users").select("role").eq("id", user.id).single()
  if (adminUser?.role !== 'admin') return { error: "Forbidden: Admins only" }

  const newStatus = currentStatus === 'active' ? 'suspended' : 'active'
  const serviceClient = createServiceClient()

  const { error } = await serviceClient
    .from("users")
    .update({ is_active: newStatus === 'active' })
    .eq("id", userId)

  if (error) return { error: "Failed to update user status" }

  await logAdminAction(supabase, user.id, newStatus === 'active' ? 'reactivate_user' : 'suspend_user', 'users', userId, reason)
  revalidatePath("/admin/users")

  return { success: true }
}

// Product Approvals
export async function approveProduct(productId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  const { data: adminUser } = await supabase.from("users").select("role").eq("id", user.id).single()
  if (adminUser?.role !== 'admin') return { error: "Forbidden: Admins only" }

  const { error } = await supabase
    .from("products")
    .update({ status: 'available' })
    .eq("id", productId)

  if (error) return { error: "Failed to approve product" }

  await logAdminAction(supabase, user.id, 'approve_product', 'products', productId)
  revalidatePath("/admin/products")
  revalidatePath("/products")
  revalidatePath(`/products/${productId}`)

  return { success: true }
}

export async function rejectProduct(productId: string, reason: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  const { data: adminUser } = await supabase.from("users").select("role").eq("id", user.id).single()
  if (adminUser?.role !== 'admin') return { error: "Forbidden: Admins only" }

  const serviceClient = createServiceClient()
  const { error } = await supabase
    .from("products")
    .update({ status: 'rejected' })
    .eq("id", productId)

  if (error) return { error: "Failed to reject product" }

  // First get farmer_id
  const { data: product } = await supabase.from("products").select("farmer_id").eq("id", productId).single()
  if (product) {
    const { error: notificationErr } = await serviceClient.from("notifications").insert({
      user_id: product.farmer_id,
      message: `Your product listing was rejected. Reason: ${reason}`,
      type: "system"
    })

    if (notificationErr) return { error: "Product rejected, but farmer notification failed" }
  }

  await logAdminAction(supabase, user.id, 'reject_product', 'products', productId, reason)
  revalidatePath("/admin/products")

  return { success: true }
}

// Dispute Resolution
export async function resolveDispute(disputeId: string, orderId: string, resolution: string, notes: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  const { data: adminUser } = await supabase.from("users").select("role").eq("id", user.id).single()
  if (adminUser?.role !== 'admin') return { error: "Forbidden: Admins only" }

  const serviceClient = createServiceClient()

  const { data: order, error: orderFetchErr } = await serviceClient
    .from("orders")
    .select("buyer_id, farmer_id")
    .eq("id", orderId)
    .single()

  if (orderFetchErr || !order) return { error: "Order not found" }

  // Update dispute status
  const { error: disputeErr } = await serviceClient
    .from("disputes")
    .update({
      status: 'resolved',
      resolution_notes: notes
    })
    .eq("id", disputeId)

  if (disputeErr) return { error: "Failed to resolve dispute" }

  // Action based on resolution (refund_buyer, release_farmer)
  if (resolution === 'refund_buyer') {
    // Update escrow
    const { error: escrowErr } = await serviceClient.from("escrow_transactions").update({ status: 'refunded' }).eq("order_id", orderId)
    if (escrowErr) return { error: "Failed to refund escrow" }
    // Update order
    const { error: orderErr } = await serviceClient.from("orders").update({ status: 'cancelled' }).eq("id", orderId)
    if (orderErr) return { error: "Failed to update order" }
  } else if (resolution === 'release_farmer') {
    // Update escrow
    const { error: escrowErr } = await serviceClient
      .from("escrow_transactions")
      .update({ status: 'released', released_at: new Date().toISOString() })
      .eq("order_id", orderId)
    if (escrowErr) return { error: "Failed to release escrow" }
    // Update order
    const { error: orderErr } = await serviceClient.from("orders").update({ status: 'completed' }).eq("id", orderId)
    if (orderErr) return { error: "Failed to update order" }
  } else {
    return { error: "Invalid dispute resolution" }
  }

  await logAdminAction(supabase, user.id, `resolve_dispute_${resolution}`, 'disputes', disputeId, notes)
  revalidatePath("/admin/disputes")
  revalidatePath("/buyer/orders")
  revalidatePath("/farmer/orders")
  revalidatePath("/buyer/wallet")
  revalidatePath("/farmer/wallet")

  return { success: true }
}
