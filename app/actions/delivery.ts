"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

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
  if (delivery.status !== 'assigned') return { error: "Delivery cannot be picked up (wrong status)" }

  // Update delivery status
  const { error: updateErr } = await supabase
    .from("deliveries")
    .update({ 
      status: 'out_for_delivery',
      pickup_time: new Date().toISOString()
    })
    .eq("id", deliveryId)

  if (updateErr) return { error: "Failed to update delivery" }

  // Update order status
  const { error: orderErr } = await supabase
    .from("orders")
    .update({ status: 'out_for_delivery' })
    .eq("id", delivery.order_id)

  if (orderErr) return { error: "Failed to update order status" }

  // Phase 8: Generate OTP
  const rawOtp = Math.floor(100000 + Math.random() * 900000).toString()
  // Simple hash for prototype (in production, use bcrypt or crypto)
  const crypto = require('crypto')
  const codeHash = crypto.createHash('sha256').update(rawOtp).digest('hex')

  // Store in delivery_verifications
  const { error: verifyErr } = await supabase
    .from("delivery_verifications")
    .insert({
      delivery_id: deliveryId,
      method: 'otp',
      code_hash: codeHash,
      status: 'pending'
    })

  if (verifyErr) return { error: "Failed to create verification record" }

  // Notify buyer
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buyerId = (delivery.orders as any)?.buyer_id
  if (buyerId) {
    await supabase.from("notifications").insert({
      user_id: buyerId,
      type: 'out_for_delivery',
      message: `Your order is on the way! Your verification code is ${rawOtp}. Present this or its QR code to the agent.`
    })
  }

  revalidatePath("/agent/dashboard")
  revalidatePath("/buyer/orders")
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

  // Hash the input OTP
  const crypto = require('crypto')
  const inputHash = crypto.createHash('sha256').update(rawOtp).digest('hex')

  const { data: verification, error: vErr } = await supabase
    .from("delivery_verifications")
    .select("id, code_hash, status, delivery_id, deliveries(order_id)")
    .eq("delivery_id", deliveryId)
    .eq("method", "otp")
    .single()

  if (vErr || !verification) return { error: "Verification record not found" }
  if (verification.status === 'verified') return { error: "Already verified" }

  if (verification.code_hash !== inputHash) {
    // Log failed attempt logic could go here (e.g. tracking retries in a new column)
    return { error: "Invalid verification code" }
  }

  // Mark verification as successful
  await supabase
    .from("delivery_verifications")
    .update({ status: 'verified', verified_by: user.id, verified_at: new Date().toISOString() })
    .eq("id", verification.id)

  // Update delivery status
  await supabase.from("deliveries").update({ status: 'delivered' }).eq("id", deliveryId)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orderId = (verification.deliveries as any)?.order_id
  
  // Check if buyer has also confirmed (order status 'delivered')
  const { data: order } = await supabase.from("orders").select("status").eq("id", orderId).single()
  
  if (order?.status === 'delivered') {
    // Both confirmed! Release escrow
    await releaseEscrow(orderId)
  } else {
    // Agent confirmed, wait for buyer
    await supabase.from("orders").update({ status: 'verified' }).eq("id", orderId)
  }

  revalidatePath("/agent/dashboard")
  return { success: true }
}

export async function buyerConfirmDelivery(orderId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: "Unauthorized" }

  const { data: order } = await supabase.from("orders").select("status").eq("id", orderId).single()
  
  if (!order || (order.status !== 'out_for_delivery' && order.status !== 'verified')) {
    return { error: "Order is not ready for confirmation" }
  }

  if (order.status === 'verified') {
    // Agent already verified OTP. Both confirmed! Release escrow
    await releaseEscrow(orderId)
  } else {
    // Buyer confirmed first, wait for agent
    await supabase.from("orders").update({ status: 'delivered' }).eq("id", orderId)
  }

  revalidatePath("/buyer/orders")
  return { success: true }
}

async function releaseEscrow(orderId: string) {
  const supabase = await createClient()
  // Update order to completed
  await supabase.from("orders").update({ status: 'completed' }).eq("id", orderId)
  
  // Update escrow to released
  await supabase.from("escrow_transactions").update({ status: 'released', released_at: new Date().toISOString() }).eq("order_id", orderId)
  
  // Fetch order data for receipt
  const { data: order } = await supabase.from("orders").select(`
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

  if (order?.farmer?.id) {
    await supabase.from("notifications").insert({
      user_id: order.farmer.id,
      type: 'escrow_released',
      message: `Delivery completed and escrow funds have been released for order ${orderId}!`
    })
  }

  // Phase 9: Generate Receipt
  if (order) {
    try {
      await generateReceipt(order, supabase);
    } catch (e) {
      console.error("Failed to generate receipt:", e);
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function generateReceipt(order: any, supabase: any) {
  const PDFDocument = require('pdfkit');

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
