"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { payOrder, cancelOrder } from "@/app/actions/orders";
import { Loader2, Package, CheckCircle, Clock, ShieldCheck, XCircle, Truck, Info } from "lucide-react";
import Link from "next/link";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function BuyerOrdersClient({ orders }: { orders: any[] }) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handlePay = async (orderId: string) => {
    setLoadingId(orderId);
    await payOrder(orderId);
    setLoadingId(null);
  };

  const handleCancel = async (orderId: string) => {
    if (!confirm("Are you sure you want to cancel this order?")) return;
    setLoadingId(orderId);
    await cancelOrder(orderId, 'buyer');
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
        const farmer = order.farmer_profiles;
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
                  <Link href={`/products/${order.product_id}`}>
                    <Button variant="outline">View Product</Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
