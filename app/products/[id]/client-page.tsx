"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Calendar, Scale, Star, ArrowLeft, ShoppingCart, Info, User, AlertCircle, X } from "lucide-react";
import { placeOrder } from "@/app/actions/orders";

interface ProductDetailProps {
  product: Product & { product_images?: { storage_path: string; is_primary: boolean }[] };
  farmer: {
    farm_name: string;
    farm_location: string;
    bio: string;
    rating_avg: number;
    users?: { full_name: string; phone?: string };
  } | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  reviews: any[];
}

export function ProductDetailClient({ product, farmer, reviews }: ProductDetailProps) {
  const router = useRouter();
  const [mainImage, setMainImage] = useState(
    product.product_images?.find(img => img.is_primary)?.storage_path || 
    product.product_images?.[0]?.storage_path
  );
  
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderError, setOrderError] = useState("");

  const handlePlaceOrder = async () => {
    if (orderQuantity <= 0 || orderQuantity > Number(product.quantity)) {
      setOrderError("Invalid quantity");
      return;
    }
    
    setOrderLoading(true);
    setOrderError("");
    
    try {
      const result = await placeOrder(product.id, product.farmer_id, orderQuantity, Number(product.price));
      
      if (result?.error) {
        setOrderError(result.error);
        setOrderLoading(false);
      } else if (result?.success) {
        setShowOrderModal(false);
        router.push("/buyer/orders");
      }
    } catch {
      setOrderError("Failed to place order");
      setOrderLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <Link href="/products" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Marketplace
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Image Gallery */}
        <div className="space-y-4">
          <div className="aspect-square bg-muted rounded-2xl overflow-hidden border">
            {mainImage ? (
              <img 
                src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${mainImage}`}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                No Image Available
              </div>
            )}
          </div>
          
          {product.product_images && product.product_images.length > 1 && (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {product.product_images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setMainImage(img.storage_path)}
                  className={`relative w-24 h-24 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${
                    mainImage === img.storage_path ? "border-primary shadow-md" : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                >
                  <img 
                    src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${img.storage_path}`}
                    alt={`${product.name} thumbnail ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="flex flex-col">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="px-3 py-1 bg-primary/10 text-primary text-sm font-medium rounded-full">
                {product.crop_type}
              </span>
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                product.status === 'available' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {product.status.replace('_', ' ').toUpperCase()}
              </span>
            </div>
            
            <h1 className="text-4xl font-bold tracking-tight mb-2">{product.name}</h1>
            <p className="text-3xl font-bold text-primary mb-6">₦{product.price} <span className="text-lg text-muted-foreground font-normal">/ {product.unit}</span></p>
            
            <div className="grid grid-cols-2 gap-4 py-6 border-y border-border/50">
              <div className="flex items-start">
                <Scale className="w-5 h-5 mr-3 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Available Quantity</p>
                  <p className="font-medium">{product.quantity} {product.unit}</p>
                </div>
              </div>
              <div className="flex items-start">
                <MapPin className="w-5 h-5 mr-3 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-medium">{product.location}</p>
                </div>
              </div>
              <div className="flex items-start">
                <Calendar className="w-5 h-5 mr-3 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Harvest Date</p>
                  <p className="font-medium">{new Date(product.harvest_date).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-auto space-y-4">
            <Button 
              size="lg" 
              className="w-full h-14 text-lg" 
              disabled={product.status !== 'available'}
              onClick={() => setShowOrderModal(true)}
            >
              <ShoppingCart className="w-5 h-5 mr-2" />
              Place Order
            </Button>
            <p className="text-sm text-center text-muted-foreground flex items-center justify-center">
              <Info className="w-4 h-4 mr-1" />
              Payment is held securely in escrow until delivery is verified.
            </p>
          </div>
        </div>
      </div>

      {/* Order Modal Overlay */}
      {showOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-background w-full max-w-md rounded-xl shadow-xl overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="font-bold text-lg">Place Order</h3>
              <button onClick={() => setShowOrderModal(false)} className="p-1 hover:bg-muted rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="font-semibold text-lg">{product.name}</p>
                <p className="text-muted-foreground">₦{product.price} / {product.unit}</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="qty">Quantity Needed ({product.unit})</Label>
                <Input 
                  id="qty" 
                  type="number" 
                  min="1" 
                  max={Number(product.quantity)} 
                  value={orderQuantity} 
                  onChange={(e) => setOrderQuantity(Number(e.target.value))} 
                />
                <p className="text-xs text-muted-foreground">{product.quantity} available max.</p>
              </div>

              {orderError && (
                <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  {orderError}
                </div>
              )}

              <div className="pt-4 border-t flex justify-between items-center">
                <span className="font-medium text-muted-foreground">Total Price:</span>
                <span className="font-bold text-xl text-primary">₦{orderQuantity * Number(product.price)}</span>
              </div>
            </div>
            
            <div className="p-4 border-t bg-muted/20 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowOrderModal(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handlePlaceOrder} disabled={orderLoading}>
                {orderLoading ? "Processing..." : "Confirm Order"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Farmer Profile Section */}
      <div className="mt-16 pt-12 border-t grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <div>
            <h2 className="text-2xl font-bold mb-6">About the Farmer</h2>
            <Card>
              <CardContent className="p-6">
                {farmer ? (
                  <div className="flex flex-col md:flex-row gap-8 items-start">
                    <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border-4 border-background shadow-sm">
                      <User className="w-10 h-10 text-primary" />
                    </div>
                    <div className="flex-1 space-y-4">
                      <div>
                        <h3 className="text-xl font-bold">{farmer.farm_name}</h3>
                        <p className="text-muted-foreground">{farmer.users?.full_name}</p>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center">
                          <Star className="w-4 h-4 text-yellow-500 mr-1 fill-yellow-500" />
                          <span className="font-medium">{farmer.rating_avg > 0 ? farmer.rating_avg.toFixed(1) : 'New'}</span>
                          <span className="text-muted-foreground ml-1">Rating</span>
                        </div>
                        <div className="flex items-center text-muted-foreground">
                          <MapPin className="w-4 h-4 mr-1" />
                          {farmer.farm_location}
                        </div>
                      </div>
                      
                      {farmer.bio && (
                        <div className="pt-4 border-t">
                          <p className="text-sm leading-relaxed">{farmer.bio}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">Farmer information is currently unavailable.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-6">Recent Reviews</h2>
            {reviews.length > 0 ? (
              <div className="space-y-4">
                {reviews.map((review, idx) => (
                  <Card key={idx}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold">{review.reviewer?.full_name || 'Anonymous'}</p>
                          <div className="flex items-center mt-1">
                            {[1,2,3,4,5].map(star => (
                              <Star key={star} className={`w-3 h-3 ${star <= review.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} />
                            ))}
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">{new Date(review.created_at).toLocaleDateString()}</span>
                      </div>
                      {review.comment && (
                        <p className="text-sm mt-3 text-muted-foreground">{review.comment}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8 border rounded-md border-dashed">No reviews yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
