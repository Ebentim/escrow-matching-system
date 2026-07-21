"use server"

import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { revalidatePath } from "next/cache"

export async function placeOrder(
  productId: string, 
  farmerId: string, 
  quantity: number, 
  pricePerUnit: number
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Unauthorized" }
  }

  // 1. Fetch product to check availability
  const { data: product, error: productErr } = await supabase
    .from("products")
    .select("quantity, status")
    .eq("id", productId)
    .single()

  if (productErr || !product) {
    return { error: "Product not found" }
  }

  if (product.status !== 'available' || Number(product.quantity) < quantity) {
    return { error: "Insufficient quantity available or product not available" }
  }

  // 2. Decrement quantity
  const newQuantity = Number(product.quantity) - quantity
  const newStatus = newQuantity <= 0 ? 'reserved' : 'available'

  const serviceClient = createServiceClient()
  const { data: updatedProduct, error: updateErr } = await serviceClient
    .from("products")
    .update({ quantity: newQuantity, status: newStatus })
    .eq("id", productId)
    .select()

  if (updateErr || !updatedProduct || updatedProduct.length === 0) {
    return { error: "Could not reserve product. Please try again." }
  }

  // 3. Create Order
  const totalPrice = quantity * pricePerUnit
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .insert({
      buyer_id: user.id,
      product_id: productId,
      farmer_id: farmerId,
      quantity_ordered: quantity,
      total_price: totalPrice,
      status: 'pending'
    })
    .select()
    .single()

  if (orderErr) {
    // Revert product if order creation fails
    await serviceClient.from("products").update({ quantity: product.quantity, status: product.status }).eq("id", productId)
    return { error: "Failed to create order" }
  }

  // 4. Notify farmer
  await serviceClient.from("notifications").insert({
    user_id: farmerId,
    type: 'new_order',
    message: `You have a new pending order for ${quantity} units.`
  })

  revalidatePath("/products")
  revalidatePath(`/products/${productId}`)
  
  return { success: true, orderId: order.id }
}

export async function acceptOrder(orderId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: "Unauthorized" }

  const { data: order, error: fetchErr } = await supabase
    .from("orders")
    .select("status, buyer_id")
    .eq("id", orderId)
    .eq("farmer_id", user.id)
    .single()

  if (fetchErr || !order) return { error: "Order not found" }
  if (order.status !== 'pending') return { error: "Order is not pending" }

  const { error: updateErr } = await supabase
    .from("orders")
    .update({ status: 'accepted' })
    .eq("id", orderId)

  if (updateErr) return { error: "Failed to accept order" }

  const serviceClient = createServiceClient()
  await serviceClient.from("notifications").insert({
    user_id: order.buyer_id,
    type: 'order_accepted',
    message: `Your order has been accepted and is awaiting payment.`
  })

  revalidatePath("/farmer/orders")
  revalidatePath("/buyer/orders")
  return { success: true }
}

export async function rejectOrder(orderId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: "Unauthorized" }

  const { data: order, error: fetchErr } = await supabase
    .from("orders")
    .select("status, buyer_id, product_id, quantity_ordered")
    .eq("id", orderId)
    .eq("farmer_id", user.id)
    .single()

  if (fetchErr || !order) return { error: "Order not found" }
  if (order.status !== 'pending') return { error: "Order is not pending" }

  const { error: updateErr } = await supabase
    .from("orders")
    .update({ status: 'cancelled' })
    .eq("id", orderId)

  if (updateErr) return { error: "Failed to reject order" }

  // Restore quantity
  const { data: product } = await supabase.from("products").select("quantity").eq("id", order.product_id).single()
  if (product) {
    const serviceClient = createServiceClient()
    await serviceClient.from("products").update({
      quantity: Number(product.quantity) + Number(order.quantity_ordered),
      status: 'available'
    }).eq("id", order.product_id)
  }

  const serviceClient = createServiceClient()
  await serviceClient.from("notifications").insert({
    user_id: order.buyer_id,
    type: 'order_rejected',
    message: `Your order was rejected by the farmer.`
  })

  revalidatePath("/farmer/orders")
  return { success: true }
}

export async function payOrder(orderId: string) {
  // Mock payment/escrow logic
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: "Unauthorized" }

  const { data: order, error: fetchErr } = await supabase
    .from("orders")
    .select("status, farmer_id, total_price")
    .eq("id", orderId)
    .eq("buyer_id", user.id)
    .single()

  if (fetchErr || !order) return { error: "Order not found" }
  if (order.status !== 'accepted') return { error: "Order is not ready for payment" }

  // Insert into escrow
  const serviceClient = createServiceClient()
  const { error: escrowErr } = await serviceClient
    .from("escrow_transactions")
    .insert({
      order_id: orderId,
      amount: order.total_price,
      status: 'held'
    })

  if (escrowErr) return { error: "Failed to capture payment to escrow" }

  // Update order status
  const { error: updateErr } = await supabase
    .from("orders")
    .update({ status: 'in_escrow' })
    .eq("id", orderId)

  if (updateErr) return { error: "Failed to update order status" }

  await serviceClient.from("notifications").insert({
    user_id: order.farmer_id,
    type: 'payment_received',
    message: `Payment received in escrow. Order is ready for delivery.`
  })

  // Phase 7: Delivery Assignment
  // Instead of assigning to a specific agent using Round-Robin, we leave the order in 'in_escrow' state.
  // Agents can view all unassigned orders and claim them manually.
  
  // Notify all available agents about the new order (optional but helpful)
  const { data: agents } = await supabase
    .from("delivery_agent_profiles")
    .select("user_id")
    .eq("availability_status", true)

  if (agents && agents.length > 0) {
    const notifications = agents.map(agent => ({
      user_id: agent.user_id,
      type: 'delivery_assigned',
      message: `A new order is ready for delivery. Claim it now!`
    }))
    await serviceClient.from("notifications").insert(notifications)
  }

  revalidatePath("/buyer/orders", "layout")
  revalidatePath("/agent/dashboard")
  return { success: true }
}

export async function cancelOrder(orderId: string, asRole: 'buyer' | 'farmer') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: "Unauthorized" }

  const { data: order, error: fetchErr } = await supabase
    .from("orders")
    .select("status, buyer_id, farmer_id, product_id, quantity_ordered")
    .eq("id", orderId)
    .eq(asRole === 'buyer' ? "buyer_id" : "farmer_id", user.id)
    .single()

  if (fetchErr || !order) return { error: "Order not found" }
  if (order.status !== 'pending' && order.status !== 'accepted') {
    return { error: "Can only cancel pending or accepted orders. Escrowed orders require a dispute." }
  }

  const { error: updateErr } = await supabase
    .from("orders")
    .update({ status: 'cancelled' })
    .eq("id", orderId)

  if (updateErr) return { error: "Failed to cancel order" }

  // Restore quantity
  const { data: product } = await supabase.from("products").select("quantity").eq("id", order.product_id).single()
  if (product) {
    const serviceClient = createServiceClient()
    await serviceClient.from("products").update({
      quantity: Number(product.quantity) + Number(order.quantity_ordered),
      status: 'available'
    }).eq("id", order.product_id)
  }

  // Notify other party
  const notifyUserId = asRole === 'buyer' ? order.farmer_id : order.buyer_id
  const serviceClient = createServiceClient()
  await serviceClient.from("notifications").insert({
    user_id: notifyUserId,
    type: 'order_cancelled',
    message: `Order was cancelled by the ${asRole}.`
  })

  revalidatePath(`/${asRole}/orders`)
  return { success: true }
}

export async function raiseDispute(orderId: string, reason: string, description: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: "Unauthorized" }

  const { data: order, error: fetchErr } = await supabase
    .from("orders")
    .select("status, farmer_id")
    .eq("id", orderId)
    .eq("buyer_id", user.id)
    .single()

  if (fetchErr || !order) return { error: "Order not found" }

  // Update order status to disputed
  const { error: updateErr } = await supabase
    .from("orders")
    .update({ status: 'disputed' })
    .eq("id", orderId)

  if (updateErr) return { error: "Failed to update order status" }

  // Insert dispute record
  const { error: insertErr } = await supabase
    .from("disputes")
    .insert({
      order_id: orderId,
      raised_by: user.id,
      reason: reason,
      description: description,
      status: 'open'
    })

  if (insertErr) return { error: "Failed to log dispute" }

  const serviceClient = createServiceClient()
  await serviceClient.from("notifications").insert({
    user_id: order.farmer_id,
    type: 'order_disputed',
    message: `A dispute was raised for an order.`
  })

  revalidatePath("/buyer/orders")
  return { success: true }
}
