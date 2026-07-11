"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { acceptOrder, rejectOrder, cancelOrder } from "@/app/actions/orders";
import { Loader2, Package, CheckCircle, Clock, ShieldCheck, XCircle, Truck, Info, Phone } from "lucide-react";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function FarmerOrdersClient({ orders }: { orders: any[] }) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleAccept = async (orderId: string) => {
    setLoadingId(orderId);
    await acceptOrder(orderId);
    setLoadingId(null);
  };

  const handleReject = async (orderId: string) => {
    if (!confirm("Rejecting will cancel the order and return the reserved quantity to stock. Proceed?")) return;
    setLoadingId(orderId);
    await rejectOrder(orderId);
    setLoadingId(null);
  };

  const handleCancel = async (orderId: string) => {
    if (!confirm("Are you sure you want to cancel this order?")) return;
    setLoadingId(orderId);
    await cancelOrder(orderId, 'farmer');
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

  return (
    <div className="space-y-4">
      {orders.map((order) => {
        const product = order.products;
        const buyer = order.buyer_profiles;
        const buyerUser = order.users;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mainImage = product.product_images?.find((img: any) => img.is_primary)?.storage_path || product.product_images?.[0]?.storage_path;
        const isProcessing = loadingId === order.id;

        return (
          <Card key={order.id} className="overflow-hidden">
            <CardContent className="p-0 sm:flex">
              <div className="w-full sm:w-48 h-48 bg-muted flex-shrink-0">
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
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
