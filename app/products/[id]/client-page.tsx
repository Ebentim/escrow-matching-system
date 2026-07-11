"use client";

import { useState } from "react";
import Link from "next/link";
import { Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Calendar, Scale, Star, ArrowLeft, ShoppingCart, Info, User } from "lucide-react";

interface ProductDetailProps {
  product: Product & { product_images?: { storage_path: string; is_primary: boolean }[] };
  farmer: {
    farm_name: string;
    farm_location: string;
    bio: string;
    rating_avg: number;
    users?: { full_name: string; phone?: string };
  } | null;
}

export function ProductDetailClient({ product, farmer }: ProductDetailProps) {
  const [mainImage, setMainImage] = useState(
    product.product_images?.find(img => img.is_primary)?.storage_path || 
    product.product_images?.[0]?.storage_path
  );

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
                  className={`relative w-24 h-24 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-all ${
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
            <Button size="lg" className="w-full h-14 text-lg" disabled={product.status !== 'available'}>
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

      {/* Farmer Profile Section */}
      <div className="mt-16 pt-12 border-t">
        <h2 className="text-2xl font-bold mb-6">About the Farmer</h2>
        <Card>
          <CardContent className="p-6">
            {farmer ? (
              <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 border-4 border-background shadow-sm">
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
    </div>
  );
}
