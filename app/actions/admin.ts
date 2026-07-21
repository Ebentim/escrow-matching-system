"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

async function logAdminAction(supabase: any, adminId: string, actionType: string, targetTable: string, targetId: string, notes?: string) {
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

  const { error } = await supabase
    .from("users")
    .update({ account_status: newStatus })
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

  // We could mark it as 'rejected' if we add it to the ENUM, or just delete it/hide it.
  // The prompt says "rejection requires a reason, notifies farmer".
  // Let's set status to 'out_of_stock' or if we had 'rejected', we'd use that.
  // Looking at 20240101000000_core_schema.sql, product status is TEXT CHECK (status IN ('pending_approval', 'available', 'out_of_stock', 'delisted'))
  const { error } = await supabase
    .from("products")
    .update({ status: 'delisted' }) // or out_of_stock
    .eq("id", productId)

  if (error) return { error: "Failed to reject product" }

  // TODO: Send notification to farmer about rejection reason (will use notifications table)
  // First get farmer_id
  const { data: product } = await supabase.from("products").select("farmer_id").eq("id", productId).single()
  if (product) {
    await supabase.from("notifications").insert({
      user_id: product.farmer_id,
      title: "Product Rejected",
      message: `Your product listing was rejected. Reason: ${reason}`,
      type: "system"
    })
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

  // Update dispute status
  const { error: disputeErr } = await supabase
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
    await supabase.from("escrow_transactions").update({ status: 'refunded' }).eq("order_id", orderId)
    // Update order
    await supabase.from("orders").update({ status: 'cancelled' }).eq("id", orderId)
  } else if (resolution === 'release_farmer') {
    // Update escrow
    await supabase.from("escrow_transactions").update({ status: 'released' }).eq("order_id", orderId)
    // Update order
    await supabase.from("orders").update({ status: 'completed' }).eq("id", orderId)
  }

  await logAdminAction(supabase, user.id, `resolve_dispute_${resolution}`, 'disputes', disputeId, notes)
  revalidatePath("/admin/disputes")

  return { success: true }
}
