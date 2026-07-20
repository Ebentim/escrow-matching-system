"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { payOrder, cancelOrder, raiseDispute } from "@/app/actions/orders";
import { Loader2, Package, CheckCircle, Clock, ShieldCheck, XCircle, Truck, Info } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { Download, Star } from "lucide-react";
import { submitRating } from "@/app/actions/ratings";
import { Textarea } from "@/components/ui/textarea";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function BuyerOrdersClient({ orders }: { orders: any[] }) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [ratingTarget, setRatingTarget] = useState<{orderId: string, role: string, revieweeId: string} | null>(null);
  const [ratingForm, setRatingForm] = useState({ rating: 5, comment: '' });
  const [disputeTarget, setDisputeTarget] = useState<string | null>(null);
  const [disputeForm, setDisputeForm] = useState({ reason: '', description: '' });

  const handlePay = async (orderId: string) => {
    setLoadingId(orderId);
    const res = await payOrder(orderId);
    if (res?.error) {
      alert(res.error);
    }
    router.refresh();
    setLoadingId(null);
  };

  const handleCancel = async (orderId: string) => {
    if (!confirm("Are you sure you want to cancel this order?")) return;
    setLoadingId(orderId);
    const res = await cancelOrder(orderId, 'buyer');
    if (res?.error) {
      alert(res.error);
    }
    router.refresh();
    setLoadingId(null);
  };

  const handleDispute = async () => {
    if (!disputeTarget || !disputeForm.reason) return;
    setLoadingId(`dispute-${disputeTarget}`);
    const res = await raiseDispute(disputeTarget, disputeForm.reason, disputeForm.description);
    if (res?.error) {
      alert(res.error);
    } else {
      alert("Dispute raised successfully. An admin will review it.");
      setDisputeTarget(null);
      setDisputeForm({ reason: '', description: '' });
    }
    router.refresh();
    setLoadingId(null);
  };

  const handleDownloadReceipt = async (path: string) => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.storage.from('receipts').download(path);
      if (error) throw error;
      
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = path.split('/').pop() || 'receipt.pdf';
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      a.remove();
    } catch (e) {
      console.error(e);
      alert("Failed to download receipt");
    }
  };

  const handleRate = async () => {
    if (!ratingTarget) return;
    setLoadingId(`rating-${ratingTarget.orderId}-${ratingTarget.role}`);
    const res = await submitRating(ratingTarget.orderId, ratingTarget.revieweeId, ratingForm.rating, ratingForm.comment);
    if (res.error) {
      alert(res.error);
    } else {
      alert("Rating submitted successfully!");
      setRatingTarget(null);
      setRatingForm({ rating: 5, comment: '' });
      router.refresh();
    }
    setLoadingId(null);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'accepted': return <CheckCircle className="w-5 h-5 text-blue-500" />;
      case 'in_escrow': return <ShieldCheck className="w-5 h-5 text-purple-500" />;
      case 'out_for_delivery': return <Truck className="w-5 h-5 text-orange-500" />;
      case 'delivered': 
      case 'verified': 
      case 'completed': return <Package className="w-5 h-5 text-green-500" />;
      case 'cancelled': 
      case 'disputed': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  if (!orders || orders.length === 0) {
    return (
      <Card className="p-12 text-center border-dashed">
        <p className="text-muted-foreground mb-4">You have not placed any orders yet.</p>
        <Link href="/products">
          <Button>Browse Marketplace</Button>
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => {
        const product = order.products;
        const farmer = order.farmer?.farmer_profiles;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mainImage = product.product_images?.find((img: any) => img.is_primary)?.storage_path || product.product_images?.[0]?.storage_path;
        const isProcessing = loadingId === order.id;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const receiptPath = Array.isArray(order.digital_receipts) ? order.digital_receipts[0]?.pdf_storage_path : (order.digital_receipts as any)?.pdf_storage_path;
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const reviews = Array.isArray(order.ratings_reviews) ? order.ratings_reviews : [order.ratings_reviews].filter(Boolean);
        const hasRatedFarmer = reviews.some((r: any) => r && r.reviewee_id === order.farmer_id);
        const agentId = Array.isArray(order.deliveries) ? order.deliveries[0]?.agent_id : (order.deliveries as any)?.agent_id;
        const hasRatedAgent = agentId && reviews.some((r: any) => r && r.reviewee_id === agentId);

        return (
          <Card key={order.id} className="overflow-hidden">
            <CardContent className="p-0 sm:flex">
              <div className="w-full sm:w-48 h-48 bg-muted shrink-0">
                {mainImage ? (
                  <img 
                    src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${mainImage}`} 
                    alt={product.name} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">No Image</div>
                )}
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-xl">{product.name}</h3>
                    <p className="text-muted-foreground text-sm">Farm: {farmer?.farm_name || 'Unknown Farm'}</p>
                  </div>
                  <Badge variant="outline" className="flex items-center gap-1 py-1 px-3 text-sm capitalize">
                    {getStatusIcon(order.status)}
                    {order.status.replace(/_/g, ' ')}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4 my-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Quantity Ordered</p>
                    <p className="font-semibold">{order.quantity_ordered} {product.unit}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Price</p>
                    <p className="font-semibold text-primary">₦{order.total_price}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Order Date</p>
                    <p className="font-semibold">{new Date(order.created_at).toLocaleDateString()}</p>
                  </div>
                </div>

                {/* Timeline description */}
                <div className="mt-auto bg-muted/30 p-3 rounded-md text-sm text-muted-foreground mb-4">
                  {order.status === 'pending' && "Waiting for the farmer to accept your order."}
                  {order.status === 'accepted' && "Order accepted! Please complete payment to securely hold funds in escrow."}
                  {order.status === 'in_escrow' && "Payment secured in escrow. Awaiting delivery agent assignment."}
                  {order.status === 'out_for_delivery' && "Your order is on the way!"}
                  {order.status === 'cancelled' && "This order was cancelled."}
                  {order.status === 'completed' && "Order completed successfully!"}
                </div>

                <div className="flex flex-wrap gap-3">
                  {order.status === 'accepted' && (
                    <Button onClick={() => handlePay(order.id)} disabled={isProcessing}>
                      {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                      Pay securely with Escrow
                    </Button>
                  )}
                  {(order.status === 'pending' || order.status === 'accepted') && (
                    <Button variant="destructive" onClick={() => handleCancel(order.id)} disabled={isProcessing}>
                      {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Cancel Order"}
                    </Button>
                  )}
                  {(order.status === 'out_for_delivery' || order.status === 'in_transit') && (
                    <Link href={`/buyer/orders/${order.id}/tracking`}>
                      <Button variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-200">
                        <Truck className="w-4 h-4 mr-2" /> Track Delivery
                      </Button>
                    </Link>
                  )}
                  {receiptPath && (
                    <Button variant="default" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleDownloadReceipt(receiptPath)}>
                      <Download className="w-4 h-4 mr-2" /> Download Digital Receipt
                    </Button>
                  )}
                  {order.status === 'completed' && !hasRatedFarmer && (
                    <Button variant="outline" onClick={() => setRatingTarget({orderId: order.id, role: 'Farmer', revieweeId: order.farmer_id})}>
                      <Star className="w-4 h-4 mr-2 text-yellow-500" /> Rate Farmer
                    </Button>
                  )}
                  {order.status === 'completed' && agentId && !hasRatedAgent && (
                    <Button variant="outline" onClick={() => setRatingTarget({orderId: order.id, role: 'Agent', revieweeId: agentId})}>
                      <Star className="w-4 h-4 mr-2 text-yellow-500" /> Rate Agent
                    </Button>
                  )}
                  <Link href={`/products/${order.product_id}`}>
                    <Button variant="outline">View Product</Button>
                  </Link>
                  {(order.status === 'completed' || order.status === 'in_escrow' || order.status === 'out_for_delivery') && (
                    <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => setDisputeTarget(order.id)}>
                      <XCircle className="w-4 h-4 mr-2" /> Raise Dispute
                    </Button>
                  )}
                </div>

                {ratingTarget?.orderId === order.id && (
                  <div className="mt-4 p-4 border rounded-md bg-slate-50">
                    <h4 className="font-semibold mb-2">Rate {ratingTarget?.role}</h4>
                    <div className="flex gap-2 mb-3">
                      {[1,2,3,4,5].map(star => (
                        <Star 
                          key={star} 
                          className={`w-6 h-6 cursor-pointer ${star <= ratingForm.rating ? 'fill-yellow-500 text-yellow-500' : 'text-gray-300'}`} 
                          onClick={() => setRatingForm({...ratingForm, rating: star})}
                        />
                      ))}
                    </div>
                    <Textarea 
                      placeholder="Optional comment..." 
                      className="mb-3"
                      value={ratingForm.comment}
                      onChange={e => setRatingForm({...ratingForm, comment: e.target.value})}
                    />
                    <div className="flex gap-2">
                      <Button onClick={() => handleRate()} disabled={loadingId === `rating-${order.id}-${ratingTarget?.role}`}>
                        {loadingId === `rating-${order.id}-${ratingTarget?.role}` ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Submit Rating"}
                      </Button>
                      <Button variant="outline" onClick={() => setRatingTarget(null)}>Cancel</Button>
                    </div>
                  </div>
                )}

                {disputeTarget === order.id && (
                  <div className="mt-4 p-4 border rounded-md bg-red-50 border-red-200">
                    <h4 className="font-semibold mb-2 text-red-800">Raise a Dispute</h4>
                    <p className="text-sm text-red-600 mb-3">Only raise a dispute if there is a severe issue with your order (e.g. wrong item, never arrived). This will pause escrow payments until an admin resolves it.</p>
                    <input 
                      type="text" 
                      placeholder="Reason (e.g. Item not delivered)" 
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mb-3"
                      value={disputeForm.reason}
                      onChange={e => setDisputeForm({...disputeForm, reason: e.target.value})}
                    />
                    <Textarea 
                      placeholder="Detailed description of the issue..." 
                      className="mb-3"
                      value={disputeForm.description}
                      onChange={e => setDisputeForm({...disputeForm, description: e.target.value})}
                    />
                    <div className="flex gap-2">
                      <Button variant="destructive" onClick={() => handleDispute()} disabled={loadingId === `dispute-${order.id}` || !disputeForm.reason}>
                        {loadingId === `dispute-${order.id}` ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Submit Dispute"}
                      </Button>
                      <Button variant="outline" onClick={() => setDisputeTarget(null)}>Cancel</Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
