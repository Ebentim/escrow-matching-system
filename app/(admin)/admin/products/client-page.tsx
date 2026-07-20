"use client";

import { useState } from "react";
import { useModal } from "@/components/ui/modal-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { approveProduct, rejectProduct } from "@/app/actions/admin";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

export function ProductsClient({ products: initialProducts }: { products: any[] }) {
  const [products, setProducts] = useState(initialProducts);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const { alert } = useModal();

  const handleApprove = async (productId: string) => {
    setLoadingId(`approve-${productId}`);
    const result = await approveProduct(productId);
    if (result.error) await alert(result.error);
    else setProducts((prev) => prev.filter((p) => p.id !== productId));
    setLoadingId(null);
  };

  const handleReject = async (productId: string) => {
    const reason = prompt("Enter reason for rejection (this will be sent to the farmer):");
    if (!reason) return;

    setLoadingId(`reject-${productId}`);
    const result = await rejectProduct(productId, reason);
    if (result.error) await alert(result.error);
    setLoadingId(null);
  };

  if (products.length === 0) {
    return (
      <Card className="p-12 text-center border-dashed">
        <p className="text-muted-foreground">No pending products to approve.</p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.map((product) => {
        const mainImage = product.product_images?.find((img: any) => img.is_primary)?.storage_path || product.product_images?.[0]?.storage_path;

        return (
          <Card key={product.id} className="overflow-hidden flex flex-col">
            <div className="aspect-video bg-muted relative">
              {mainImage ? (
                <img 
                  src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${mainImage}`}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">No Image</div>
              )}
            </div>
            <CardContent className="p-4 flex-1 flex flex-col">
              <h3 className="font-bold text-lg">{product.name}</h3>
              <p className="text-sm text-muted-foreground mb-4">Farm: {product.farmer?.farmer_profiles?.farm_name || 'Unknown'}</p>
              
              <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                <div>
                  <span className="text-muted-foreground">Crop:</span> <span className="font-medium">{product.crop_type}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Price:</span> <span className="font-medium">₦{product.price}/{product.unit}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Quantity:</span> <span className="font-medium">{product.quantity}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Location:</span> <span className="font-medium truncate block">{product.location}</span>
                </div>
              </div>
              
              <div className="mt-auto pt-4 border-t flex gap-2">
                <Button 
                  className="flex-1 bg-green-600 hover:bg-green-700" 
                  onClick={() => handleApprove(product.id)}
                  disabled={loadingId === `approve-${product.id}` || loadingId === `reject-${product.id}`}
                >
                  {loadingId === `approve-${product.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4 mr-2" /> Approve</>}
                </Button>
                <Button 
                  variant="destructive" 
                  className="flex-1"
                  onClick={() => handleReject(product.id)}
                  disabled={loadingId === `approve-${product.id}` || loadingId === `reject-${product.id}`}
                >
                  {loadingId === `reject-${product.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <><XCircle className="w-4 h-4 mr-2" /> Reject</>}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
