"use server"

import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { revalidatePath } from "next/cache"
import { generateOTP, encryptOTP, decryptOTP } from "@/lib/otp"
import crypto from "crypto"
import PDFDocument from "pdfkit"

export async function claimDelivery(orderId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: "Unauthorized" }

  const serviceClient = createServiceClient()

  // Verify order is still unassigned
  const { data: existingDeliveries } = await serviceClient
    .from("deliveries")
    .select("id")
    .eq("order_id", orderId)

  if (existingDeliveries && existingDeliveries.length > 0) {
    return { error: "Order has already been claimed or assigned" }
  }

  // Create delivery record
  const { error } = await serviceClient.from("deliveries").insert({
    order_id: orderId,
    agent_id: user.id,
    status: 'assigned'
  })

  if (error) return { error: "Failed to claim delivery" }

  revalidatePath("/agent/dashboard")
  return { success: true }
}

export async function markPickedUp(deliveryId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: "Unauthorized" }

  const { data: delivery, error: fetchErr } = await supabase
    .from("deliveries")
    .select("status, order_id, agent_id, orders(buyer_id)")
    .eq("id", deliveryId)
    .eq("agent_id", user.id)
    .single()

  if (fetchErr || !delivery) return { error: "Delivery not found" }
  if (delivery.status !== 'assigned' && delivery.status !== 'picked_up') return { error: "Delivery cannot be picked up (wrong status)" }

  // Update delivery status only if it is currently 'assigned'
  const { data: updatedDelivery, error: updateErr } = await supabase
    .from("deliveries")
    .update({ 
      status: 'in_transit',
      pickup_time: new Date().toISOString()
    })
    .eq("id", deliveryId)
    .eq("agent_id", user.id) // Ensure security
    .in("status", ["assigned", "picked_up"])
    .select()

  if (updateErr) return { error: "Failed to update delivery status" }
  if (!updatedDelivery || updatedDelivery.length === 0) {
    // If we didn't update any row, it was likely already picked up by a concurrent request
    return { success: true } 
  }

  // Update order status
  const serviceClient = createServiceClient()
  const { error: orderErr } = await serviceClient
    .from("orders")
    .update({ status: 'out_for_delivery' })
    .eq("id", delivery.order_id)

  if (orderErr) return { error: "Failed to update order status" }

  const otpResult = await ensurePendingOtpForDelivery(serviceClient, deliveryId, delivery.order_id)
  if (otpResult.error) return { error: otpResult.error }

  revalidatePath("/agent/dashboard")
  revalidatePath("/buyer/orders", "layout")
  return { success: true }
}

export async function updateAgentLocation(deliveryId: string, location: { lat: number; lng: number }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: "Unauthorized" }
  
  // Here we just update the current_location column in deliveries table
  // The client side will subscribe to this row using Supabase Realtime
  const { error: updateErr } = await supabase
    .from("deliveries")
    .update({ 
      current_location: location
    })
    .eq("id", deliveryId)
    .eq("agent_id", user.id) // Ensure security

  if (updateErr) return { error: "Failed to update location" }

  return { success: true }
}

export async function agentVerifyDelivery(deliveryId: string, rawOtp: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: "Unauthorized" }

  const serviceClient = createServiceClient()
  const { data: delivery, error: deliveryErr } = await serviceClient
    .from("deliveries")
    .select("id, order_id, agent_id, status, order:orders ( buyer_id )")
    .eq("id", deliveryId)
    .single()

  if (deliveryErr || !delivery) {
    return { error: "Delivery not found" }
  }

  if (delivery.agent_id !== user.id) {
    return { error: "Unauthorized agent for this delivery" }
  }

  if (delivery.status === 'delivered') {
    return { error: "Already verified" }
  }

  if (delivery.status !== 'in_transit') {
    return { error: "Delivery is not ready for OTP verification" }
  }

  const otp = rawOtp.trim()
  const { data: verifications, error: vErr } = await serviceClient
    .from("delivery_verifications")
    .select("id, code_hash, status")
    .eq("delivery_id", deliveryId)
    .eq("method", "otp")
    .eq("status", "pending")

  if (vErr) {
    console.error("Failed to load verification record:", vErr)
    return { error: "Failed to load verification record" }
  }

  let matchedVerificationId: string | null = null

  if (verifications && verifications.length > 0) {
    const matchedVerification = verifications.find((verification) =>
      verificationMatchesOtp(verification.code_hash, otp)
    )

    if (!matchedVerification) {
      return { error: "Invalid verification code" }
    }

    matchedVerificationId = matchedVerification.id
  } else {
    const buyerId = getOrderBuyerId(delivery.order)
    const matchesNotification = buyerId
      ? await otpMatchesBuyerNotification(serviceClient, buyerId, delivery.order_id, otp)
      : false

    if (!matchesNotification) {
      console.error("Pending OTP verification record not found", { deliveryId, orderId: delivery.order_id })
      return { error: "Verification record not found" }
    }

    const { data: repairedVerification, error: repairErr } = await serviceClient
      .from("delivery_verifications")
      .insert({
        delivery_id: deliveryId,
        method: 'otp',
        code_hash: encryptOTP(otp),
        verified_by: user.id,
        verified_at: new Date().toISOString(),
        status: 'verified'
      })
      .select("id")
      .single()

    if (repairErr || !repairedVerification) {
      console.error("Failed to repair missing verification record:", repairErr)
      return { error: "Failed to save verification record" }
    }

    matchedVerificationId = repairedVerification.id
  }

  if (!matchedVerificationId) {
    return { error: "Verification record not found" }
  }

  // Mark verification as successful
  const { error: verifyUpdateErr } = await serviceClient
    .from("delivery_verifications")
    .update({ status: 'verified', verified_by: user.id, verified_at: new Date().toISOString() })
    .eq("id", matchedVerificationId)

  if (verifyUpdateErr) {
    console.error("Failed to update verification record:", verifyUpdateErr)
    return { error: "Failed to update verification record" }
  }

  await serviceClient
    .from("delivery_verifications")
    .update({ status: 'failed' })
    .eq("delivery_id", deliveryId)
    .eq("method", "otp")
    .eq("status", "pending")
    .neq("id", matchedVerificationId)

  // Update delivery status using serviceClient to bypass potential RLS restrictions
  const { error: deliveryUpdateErr } = await serviceClient
    .from("deliveries")
    .update({ status: 'delivered' })
    .eq("id", deliveryId)
  
  if (deliveryUpdateErr) {
    console.error("Failed to update delivery status:", deliveryUpdateErr)
    return { error: "Failed to update delivery status" }
  }

  // Since the agent verified the OTP provided by the buyer, this serves as buyer authorization.
  const releaseResult = await releaseEscrow(delivery.order_id)
  if (releaseResult?.error) {
    return releaseResult
  }

  revalidatePath("/agent/dashboard")
  revalidatePath("/buyer/orders", "layout")
  return { success: true }
}

async function ensurePendingOtpForDelivery(
  serviceClient: ReturnType<typeof createServiceClient>,
  deliveryId: string,
  orderId: string
) {
  const { data: existingVerifications, error: existingErr } = await serviceClient
    .from("delivery_verifications")
    .select("id, code_hash")
    .eq("delivery_id", deliveryId)
    .eq("method", "otp")
    .eq("status", "pending")

  if (existingErr) {
    console.error("Failed to check existing verification record:", existingErr)
    return { error: "Failed to check verification record" }
  }

  const reusableVerification = existingVerifications?.find((verification) => decryptOTP(verification.code_hash))
  const reusableOtp = reusableVerification ? decryptOTP(reusableVerification.code_hash) : null

  if (reusableOtp) {
    return { otp: reusableOtp }
  }

  if (existingVerifications && existingVerifications.length > 0) {
    const pendingIds = existingVerifications.map((verification) => verification.id)
    const { error: staleErr } = await serviceClient
      .from("delivery_verifications")
      .update({ status: 'failed' })
      .in("id", pendingIds)

    if (staleErr) {
      console.error("Failed to retire stale verification records:", staleErr)
      return { error: "Failed to reset stale verification records" }
    }
  }

  const rawOtp = generateOTP()
  const { error: verifyErr } = await serviceClient
    .from("delivery_verifications")
    .insert({
      delivery_id: deliveryId,
      method: 'otp',
      code_hash: encryptOTP(rawOtp),
      status: 'pending'
    })

  if (verifyErr) {
    console.error("Failed to create verification record:", verifyErr)
    return { error: "Failed to create verification record" }
  }

  const { data: orderDetails, error: orderErr } = await serviceClient
    .from("orders")
    .select("buyer_id")
    .eq("id", orderId)
    .single()

  if (orderErr || !orderDetails?.buyer_id) {
    console.error("Failed to load buyer for OTP notification:", orderErr)
    return { error: "Failed to notify buyer of verification code" }
  }

  const { error: notificationErr } = await serviceClient.from("notifications").insert({
    user_id: orderDetails.buyer_id,
    type: 'out_for_delivery',
    message: `Your order (${orderId}) is on the way! Your verification code is ${rawOtp}. Present this or its QR code to the agent.`
  })

  if (notificationErr) {
    console.error("Failed to send OTP notification:", notificationErr)
    return { error: "Failed to notify buyer of verification code" }
  }

  return { otp: rawOtp }
}

function verificationMatchesOtp(codeHash: string, rawOtp: string) {
  const decryptedOtp = decryptOTP(codeHash)

  if (decryptedOtp) {
    return decryptedOtp === rawOtp
  }

  const inputHash = crypto.createHash('sha256').update(rawOtp).digest('hex')
  return codeHash === inputHash
}

async function otpMatchesBuyerNotification(
  serviceClient: ReturnType<typeof createServiceClient>,
  buyerId: string,
  orderId: string,
  rawOtp: string
) {
  const { data: notifications, error } = await serviceClient
    .from("notifications")
    .select("message")
    .eq("user_id", buyerId)
    .eq("type", "out_for_delivery")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Failed to load OTP notifications:", error)
    return false
  }

  return Boolean(notifications?.some((notification) => {
    const message = notification.message || ""
    if (!message.includes(orderId) || !message.includes("Your verification code is")) {
      return false
    }

    const match = message.match(/code is (\d{6})/)
    return match?.[1] === rawOtp
  }))
}

function getOrderBuyerId(order: unknown) {
  if (Array.isArray(order)) {
    return order[0]?.buyer_id
  }

  if (order && typeof order === "object" && "buyer_id" in order) {
    return (order as { buyer_id?: string }).buyer_id
  }

  return null
}

export async function buyerConfirmDelivery(orderId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: "Unauthorized" }

  const serviceClient = createServiceClient()
  const { data: order } = await supabase.from("orders").select("status").eq("id", orderId).eq("buyer_id", user.id).single()
  
  if (!order || order.status !== 'out_for_delivery') {
    return { error: "Order is not ready for confirmation" }
  }

  const { data: delivery, error: deliveryErr } = await serviceClient
    .from("deliveries")
    .select("id, status, delivery_verifications!inner(id)")
    .eq("order_id", orderId)
    .eq("delivery_verifications.status", "verified")
    .maybeSingle()

  if (deliveryErr) {
    console.error("Failed to check OTP verification before buyer confirmation:", deliveryErr)
    return { error: "Failed to check delivery verification" }
  }

  if (!delivery) {
    return { error: "Delivery must be OTP verified before escrow can be released" }
  }

  if (delivery.status !== 'delivered') {
    const { error: deliveryUpdateErr } = await serviceClient
      .from("deliveries")
      .update({ status: 'delivered' })
      .eq("id", delivery.id)

    if (deliveryUpdateErr) {
      console.error("Failed to update delivery status:", deliveryUpdateErr)
      return { error: "Failed to update delivery status" }
    }
  }

  const releaseResult = await releaseEscrow(orderId)
  if (releaseResult?.error) return releaseResult

  revalidatePath("/buyer/orders")
  revalidatePath("/agent/dashboard")
  return { success: true }
}

async function releaseEscrow(orderId: string) {
  if (!orderId) {
    console.error("Cannot release escrow without an order id")
    return { error: "Order not found" }
  }

  const serviceClient = createServiceClient()
  
  // Check if already completed to prevent double-release
  const { data: existingOrder, error: existingOrderErr } = await serviceClient.from("orders").select("status").eq("id", orderId).single()
  if (existingOrderErr || !existingOrder) {
    console.error("Failed to load order before escrow release:", existingOrderErr)
    return { error: "Order not found" }
  }

  const { data: escrow, error: escrowFetchErr } = await serviceClient
    .from("escrow_transactions")
    .select("id, status")
    .eq("order_id", orderId)
    .maybeSingle()

  if (escrowFetchErr) {
    console.error("Failed to load escrow before release:", escrowFetchErr)
    return { error: "Failed to load escrow" }
  }

  if (!escrow) {
    console.error("Cannot release escrow because no escrow transaction exists", { orderId })
    return { error: "Escrow transaction not found" }
  }

  if (existingOrder.status === 'completed' && escrow.status === 'released') {
    return { success: true }
  }

  if (escrow.status !== 'released') {
    const { data: releasedEscrow, error: escrowErr } = await serviceClient
      .from("escrow_transactions")
      .update({ status: 'released', released_at: new Date().toISOString() })
      .eq("id", escrow.id)
      .select("id")
      .single()

    if (escrowErr || !releasedEscrow) {
      console.error("Failed to release escrow:", escrowErr)
      return { error: "Failed to release escrow" }
    }
  }

  // Update order to completed
  if (existingOrder.status !== 'completed') {
    const { error: orderErr } = await serviceClient.from("orders").update({ status: 'completed' }).eq("id", orderId)
    if (orderErr) {
      console.error("Failed to complete order:", orderErr)
      return { error: "Failed to complete order" }
    }
  }
  
  // Fetch order data for receipt
  const { data: order } = await serviceClient.from("orders").select(`
    id, quantity_ordered, total_price, created_at,
    product:products ( name, unit, price ),
    farmer:users!orders_farmer_id_fkey ( id, full_name, phone ),
    buyer:users!orders_buyer_id_fkey ( id, full_name, phone ),
    delivery:deliveries ( 
      id, pickup_time, 
      agent:users!deliveries_agent_id_fkey ( full_name ),
      verifications:delivery_verifications ( method, verified_at )
    )
  `).eq("id", orderId).single()

  const farmer = Array.isArray(order?.farmer) ? order?.farmer[0] : order?.farmer;
  if (farmer?.id) {
    await serviceClient.from("notifications").insert({
      user_id: farmer.id,
      type: 'escrow_released',
      message: `Delivery completed and escrow funds have been released for order ${orderId}!`
    })
  }

  // Phase 9: Generate Receipt
  if (order) {
    try {
      await generateReceipt(order, serviceClient);
    } catch (e) {
      console.error("Failed to generate receipt:", e);
    }
  }

  revalidatePath("/buyer/wallet")
  revalidatePath("/farmer/wallet")

  return { success: true }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function generateReceipt(order: any, supabase: any) {
  return new Promise<void>((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      
      const receiptNumber = `RCPT-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;
      const issuedAt = new Date().toISOString();

      doc.on('end', async () => {
        const pdfData = Buffer.concat(buffers);
        const fileName = `${order.id}/${receiptNumber}.pdf`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase
          .storage
          .from('receipts')
          .upload(fileName, pdfData, { contentType: 'application/pdf', upsert: true });

        if (uploadError) {
          console.error("Storage upload error", uploadError);
          return reject(uploadError);
        }

        // Save record in digital_receipts
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const verification = Array.isArray(order.delivery) ? order.delivery[0]?.verifications?.[0] : (order.delivery as any)?.verifications?.[0];

        const summary = {
          productName: order.product?.name,
          quantity: order.quantity_ordered,
          totalPrice: order.total_price,
          buyerName: order.buyer?.full_name,
          farmerName: order.farmer?.full_name,
          verificationMethod: verification?.method || 'unknown',
          verifiedAt: verification?.verified_at || new Date().toISOString()
        };

        await supabase.from("digital_receipts").insert({
          order_id: order.id,
          receipt_number: receiptNumber,
          issued_at: issuedAt,
          summary: summary,
          pdf_storage_path: fileName
        });

        resolve();
      });

      // PDF Content
      doc.fontSize(20).text('Digital Receipt', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Receipt No: ${receiptNumber}`);
      doc.text(`Date Issued: ${new Date(issuedAt).toLocaleString()}`);
      doc.text(`Order ID: ${order.id}`);
      doc.moveDown();
      
      doc.fontSize(14).text('Parties');
      doc.fontSize(12).text(`Buyer: ${order.buyer?.full_name} (${order.buyer?.phone || 'N/A'})`);
      doc.text(`Farmer: ${order.farmer?.full_name} (${order.farmer?.phone || 'N/A'})`);
      doc.moveDown();

      doc.fontSize(14).text('Order Summary');
      doc.fontSize(12).text(`Product: ${order.product?.name}`);
      doc.text(`Quantity: ${order.quantity_ordered} ${order.product?.unit}`);
      doc.text(`Total Price: NGN ${order.total_price}`);
      doc.moveDown();

      doc.fontSize(14).text('Verification Details');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const agent = Array.isArray(order.delivery) ? order.delivery[0]?.agent : (order.delivery as any)?.agent;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const verification = Array.isArray(order.delivery) ? order.delivery[0]?.verifications?.[0] : (order.delivery as any)?.verifications?.[0];
      doc.fontSize(12).text(`Agent: ${agent?.full_name || 'N/A'}`);
      doc.text(`Method: ${verification?.method?.toUpperCase() || 'N/A'}`);
      doc.text(`Verified At: ${verification?.verified_at ? new Date(verification.verified_at).toLocaleString() : 'N/A'}`);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
