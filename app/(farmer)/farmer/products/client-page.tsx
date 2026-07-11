"use client";

import { useEffect, useState } from "react";
import { Product } from "@/lib/types";
import { useProductStore } from "@/lib/stores/product-store";
import { ProductForm } from "@/components/farmer/product-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { deleteProduct } from "../actions";
import { Plus, Edit, Trash2 } from "lucide-react";

export function ProductsClient({ initialProducts, farmerLocation }: { initialProducts: Product[], farmerLocation: string }) {
  const { products, setProducts, removeProduct } = useProductStore();
  const [isAdding, setIsAdding] = useState(false);
  const [editingProduct, setEditingProduct] = useState<(Product & { images?: { storage_path: string; is_primary: boolean }[] }) | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  useEffect(() => {
    setProducts(initialProducts);
  }, [initialProducts, setProducts]);

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to deactivate this product? It will be marked as 'sold' and hidden from buyers.")) {
      setIsDeleting(id);
      const res = await deleteProduct(id);
      if (res.success) {
        removeProduct(id);
      } else {
        alert(res.error || "Failed to delete product");
      }
      setIsDeleting(null);
    }
  };

  if (isAdding || editingProduct) {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold mb-6">
          {isAdding ? "Add New Product" : "Edit Product"}
        </h1>
        <ProductForm 
          initialData={editingProduct || undefined}
          defaultLocation={farmerLocation} 
          onCancel={() => {
            setIsAdding(false);
            setEditingProduct(null);
          }}
          onSuccess={() => {
            setIsAdding(false);
            setEditingProduct(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-primary">My Products</h1>
        <Button onClick={() => setIsAdding(true)}>
          <Plus className="w-4 h-4 mr-2" /> Add Product
        </Button>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-12 bg-muted/30 rounded-lg border border-dashed">
          <p className="text-muted-foreground mb-4">You haven&apos;t listed any products yet.</p>
          <Button onClick={() => setIsAdding(true)} variant="outline">
            Create your first listing
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <Card key={product.id} className="overflow-hidden flex flex-col">
              {product.product_images && product.product_images.length > 0 ? (
                <div className="h-48 w-full bg-muted relative">
                  <img 
                    src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${product.product_images.find((img) => img.is_primary)?.storage_path || product.product_images[0].storage_path}`}
                    alt={product.name}
                    className="object-cover w-full h-full"
                  />
                  <div className="absolute top-2 right-2 flex gap-2">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full bg-background/90 backdrop-blur ${
                      product.status === 'available' ? 'text-green-600' :
                      product.status === 'pending_approval' ? 'text-yellow-600' : 'text-gray-600'
                    }`}>
                      {product.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="h-48 w-full bg-muted flex items-center justify-center relative">
                  <span className="text-muted-foreground">No Image</span>
                  <div className="absolute top-2 right-2 flex gap-2">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full bg-background/90 backdrop-blur ${
                      product.status === 'available' ? 'text-green-600' :
                      product.status === 'pending_approval' ? 'text-yellow-600' : 'text-gray-600'
                    }`}>
                      {product.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>
              )}
              
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">{product.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{product.crop_type}</p>
                  </div>
                  <p className="font-bold text-lg text-primary">₦{product.price}</p>
                </div>
              </CardHeader>
              
              <CardContent className="pb-4 flex-1">
                <div className="grid grid-cols-2 gap-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Quantity:</span>
                    <p>{product.quantity} {product.unit}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Harvest:</span>
                    <p>{new Date(product.harvest_date).toLocaleDateString()}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Location:</span>
                    <p className="truncate">{product.location}</p>
                  </div>
                </div>
              </CardContent>
              
              <CardFooter className="pt-0 flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1" 
                  onClick={() => setEditingProduct({
                    ...product, 
                    images: product.product_images 
                  })}
                >
                  <Edit className="w-4 h-4 mr-2" /> Edit
                </Button>
                <Button 
                  variant="destructive" 
                  className="flex-1"
                  disabled={isDeleting === product.id}
                  onClick={() => handleDelete(product.id)}
                >
                  <Trash2 className="w-4 h-4 mr-2" /> 
                  {isDeleting === product.id ? "..." : "Remove"}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
