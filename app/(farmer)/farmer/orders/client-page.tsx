"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { Download, Star, Loader2, Package, CheckCircle, Clock, ShieldCheck, XCircle, Truck, Info, Phone } from "lucide-react";
import { submitRating } from "@/app/actions/ratings";
import { Textarea } from "@/components/ui/textarea";
import { acceptOrder, rejectOrder, cancelOrder } from "@/app/actions/orders";
import { useRouter } from "next/navigation";
import { useModal } from "@/components/ui/modal-provider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function FarmerOrdersClient({ orders: initialOrders }: { orders: any[] }) {
  const router = useRouter();
  const { alert, confirm } = useModal();
  const [orders, setOrders] = useState(initialOrders);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [ratingTarget, setRatingTarget] = useState<{orderId: string, role: string, revieweeId: string} | null>(null);
  const [ratingForm, setRatingForm] = useState({ rating: 5, comment: '' });
  const [activeTab, setActiveTab] = useState('active');

  const handleAccept = async (orderId: string) => {
    setLoadingId(`accept-${orderId}`);
    const res = await acceptOrder(orderId);
    if (res?.error) await alert(res.error);
    router.refresh();
    setLoadingId(null);
  };

  const handleReject = async (orderId: string) => {
    if (!(await confirm("Rejecting will cancel the order and return the reserved quantity to stock. Proceed?"))) return;
    setLoadingId(`reject-${orderId}`);
    const res = await cancelOrder(orderId, 'farmer');
    if (res?.error) await alert(res.error);
    router.refresh();
    setLoadingId(null);
  };

  const handleCancel = async (orderId: string) => {
    if (!(await confirm("Are you sure you want to cancel this order?"))) return;
    setLoadingId(`cancel-${orderId}`);
    const res = await cancelOrder(orderId, 'farmer');
    if (res?.error) await alert(res.error);
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
      await alert("Failed to download receipt");
    }
  };

  const handleRate = async () => {
    if (!ratingTarget) return;
    setLoadingId(`rating-${ratingTarget.orderId}-${ratingTarget.role}`);
    const res = await submitRating(ratingTarget.orderId, ratingTarget.revieweeId, ratingForm.rating, ratingForm.comment);
    if (res?.error) {
      await alert(res.error);
    } else {
      await alert("Rating submitted successfully!");
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
        <p className="text-muted-foreground">No orders received yet.</p>
      </Card>
    );
  }

  const activeOrders = orders.filter(o => ['pending', 'accepted', 'in_escrow', 'out_for_delivery', 'in_transit'].includes(o.status));
  const historyOrders = orders.filter(o => ['delivered', 'verified', 'completed', 'cancelled', 'disputed'].includes(o.status));

  const renderOrders = (orderList: any[]) => {
    if (orderList.length === 0) {
      return (
        <Card className="p-12 text-center border-dashed mt-4">
          <p className="text-muted-foreground">No orders found in this category.</p>
        </Card>
      );
    }
    return (
      <div className="space-y-4 mt-4">
        {orderList.map((order) => {
          const product = order.products;
          const buyer = order.buyer?.buyer_profiles;
          const buyerUser = order.users;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mainImage = product.product_images?.find((img: any) => img.is_primary)?.storage_path || product.product_images?.[0]?.storage_path;
        const isProcessing = loadingId === order.id;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const receiptPath = Array.isArray(order.digital_receipts) ? order.digital_receipts[0]?.pdf_storage_path : (order.digital_receipts as any)?.pdf_storage_path;
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const reviews = Array.isArray(order.ratings_reviews) ? order.ratings_reviews : [order.ratings_reviews].filter(Boolean);
        const hasRatedBuyer = reviews.some((r: any) => r && r.reviewee_id === order.buyer_id);

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
                    <p className="text-muted-foreground text-sm">Buyer: {buyer?.business_name || buyerUser?.full_name}</p>
                    {buyerUser?.phone && (
                      <p className="text-sm text-muted-foreground flex items-center mt-1">
                        <Phone className="w-3 h-3 mr-1" /> {buyerUser.phone}
                      </p>
                    )}
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
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <p className="font-semibold text-primary">₦{order.total_price}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Order Date</p>
                    <p className="font-semibold">{new Date(order.created_at).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="mt-auto bg-muted/30 p-3 rounded-md text-sm text-muted-foreground mb-4">
                  {order.status === 'pending' && "A buyer wants to order this. Please review and accept to proceed to escrow."}
                  {order.status === 'accepted' && "Waiting for buyer to complete escrow payment."}
                  {order.status === 'in_escrow' && "Payment secured in escrow! Please prepare the goods for delivery agent pickup."}
                  {order.status === 'out_for_delivery' && "Agent has picked up the goods."}
                  {order.status === 'cancelled' && "This order was cancelled."}
                  {order.status === 'completed' && "Order completed successfully!"}
                </div>

                <div className="flex flex-wrap gap-3">
                  {order.status === 'pending' && (
                    <>
                      <Button onClick={() => handleAccept(order.id)} disabled={isProcessing} className="bg-green-600 hover:bg-green-700">
                        {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                        Accept Order
                      </Button>
                      <Button variant="destructive" onClick={() => handleReject(order.id)} disabled={isProcessing}>
                        {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
                        Reject
                      </Button>
                    </>
                  )}
                  {order.status === 'accepted' && (
                    <Button variant="destructive" onClick={() => handleCancel(order.id)} disabled={isProcessing}>
                      {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Cancel Order"}
                    </Button>
                  )}
                  {receiptPath && (
                    <Button variant="outline" onClick={() => handleDownloadReceipt(receiptPath)}>
                      <Download className="w-4 h-4 mr-2" /> Download Receipt
                    </Button>
                  )}
                  {order.status === 'completed' && !hasRatedBuyer && (
                    <Button variant="outline" onClick={() => setRatingTarget({orderId: order.id, role: 'Buyer', revieweeId: order.buyer_id})}>
                      <Star className="w-4 h-4 mr-2 text-yellow-500" /> Rate Buyer
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
                          className={`w-6 h-6 cursor-pointer ${star <= ratingForm.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                          onClick={() => setRatingForm({...ratingForm, rating: star})}
                        />
                      ))}
                    </div>
                    <textarea 
                      className="w-full border rounded-md p-2 text-sm mb-3 min-h-[80px]"
                      placeholder="Share your experience (optional)"
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
              </div>
            </CardContent>
          </Card>
        );
      })}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-2 max-w-[400px]">
          <TabsTrigger value="active">Active Orders</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="active">
          {renderOrders(activeOrders)}
        </TabsContent>
        <TabsContent value="history">
          {renderOrders(historyOrders)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
