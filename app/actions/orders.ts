"use server"

import { createClient } from "@/lib/supabase/server"
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

  const { error: updateErr } = await supabase
    .from("products")
    .update({ quantity: newQuantity, status: newStatus })
    .eq("id", productId)
    // simplistic optimistic concurrency control
    .eq("quantity", product.quantity)

  if (updateErr) {
    return { error: "Could not reserve product. Someone else might have bought it. Try again." }
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
    await supabase.from("products").update({ quantity: product.quantity, status: product.status }).eq("id", productId)
    return { error: "Failed to create order" }
  }

  // 4. Notify farmer
  await supabase.from("notifications").insert({
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

  await supabase.from("notifications").insert({
    user_id: order.buyer_id,
    type: 'order_accepted',
    message: `Your order has been accepted and is awaiting payment.`
  })

  revalidatePath("/farmer/orders")
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
    await supabase.from("products").update({
      quantity: Number(product.quantity) + Number(order.quantity_ordered),
      status: 'available'
    }).eq("id", order.product_id)
  }

  await supabase.from("notifications").insert({
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
  const { error: escrowErr } = await supabase
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

  await supabase.from("notifications").insert({
    user_id: order.farmer_id,
    type: 'payment_received',
    message: `Payment received in escrow. Order is ready for delivery.`
  })

  revalidatePath("/buyer/orders")
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
    await supabase.from("products").update({
      quantity: Number(product.quantity) + Number(order.quantity_ordered),
      status: 'available'
    }).eq("id", order.product_id)
  }

  // Notify other party
  const notifyUserId = asRole === 'buyer' ? order.farmer_id : order.buyer_id
  await supabase.from("notifications").insert({
    user_id: notifyUserId,
    type: 'order_cancelled',
    message: `Order was cancelled by the ${asRole}.`
  })

  revalidatePath(`/${asRole}/orders`)
  return { success: true }
}
