"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { productSchema, ProductInput } from "@/lib/validators";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, ImagePlus, X } from "lucide-react";
import { createProduct, updateProduct } from "@/app/(farmer)/farmer/actions";
import { useProductStore } from "@/lib/stores/product-store";
import { Product } from "@/lib/types";

interface ProductFormProps {
  initialData?: Product & { images?: { storage_path: string; is_primary: boolean }[] };
  defaultLocation?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ProductForm({ initialData, defaultLocation, onSuccess, onCancel }: ProductFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const { addProduct, updateProduct: updateProductInStore } = useProductStore();

  const supabase = createClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(productSchema) as any,
    defaultValues: initialData ? {
      name: initialData.name,
      crop_type: initialData.crop_type,
      quantity: initialData.quantity,
      unit: initialData.unit,
      price: initialData.price,
      harvest_date: initialData.harvest_date,
      location: initialData.location,
      images: initialData.images?.map(img => ({ path: img.storage_path, is_primary: img.is_primary })) || [],
    } : {
      location: defaultLocation || "",
      images: [],
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...filesArray]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: ProductInput) => {
    setIsPending(true);
    setError(null);

    try {
      // 1. Upload new images if any
      const uploadedImages = [];
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const filePath = `${initialData ? initialData.id : 'new'}/${fileName}`;

        const { error: uploadError, data: uploadData } = await supabase.storage
          .from('product-images')
          .upload(filePath, file);

        if (uploadError) throw new Error(`Image upload failed: ${uploadError.message}`);
        
        uploadedImages.push({
          path: uploadData.path,
          is_primary: i === 0 && (!initialData || !initialData.images?.length),
        });
      }

      // Combine existing unchanged images with new ones
      const allImages = [...(data.images || []), ...uploadedImages];
      
      if (allImages.length === 0) {
        throw new Error("At least one image is required.");
      }

      data.images = allImages;

      // 2. Save product
      if (initialData) {
        const res = await updateProduct(initialData.id, data);
        if (res.error) throw new Error(res.error);
        
        // Optimistic UI update
        updateProductInStore(initialData.id, {
          name: data.name,
          crop_type: data.crop_type,
          quantity: data.quantity,
          unit: data.unit,
          price: data.price,
          harvest_date: data.harvest_date,
          location: data.location,
        });
      } else {
        const res = await createProduct(data);
        if (res.error) throw new Error(res.error);
        if (res.product) {
          addProduct(res.product as Product);
        }
      }

      if (onSuccess) onSuccess();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsPending(false);
    }
  };

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6">
      {error && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md flex items-center">
          <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Product Name</Label>
          <Input id="name" {...register("name")} />
          {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="crop_type">Crop Type</Label>
          <Input id="crop_type" {...register("crop_type")} placeholder="e.g. Cassava, Maize" />
          {errors.crop_type && <p className="text-destructive text-xs">{errors.crop_type.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="space-y-2 col-span-1 md:col-span-2">
          <Label htmlFor="quantity">Quantity</Label>
          <Input id="quantity" type="number" step="0.01" {...register("quantity")} />
          {errors.quantity && <p className="text-destructive text-xs">{errors.quantity.message}</p>}
        </div>
        <div className="space-y-2 col-span-1 md:col-span-2">
          <Label htmlFor="unit">Unit</Label>
          <Input id="unit" {...register("unit")} placeholder="e.g. kg, bags, tubers" />
          {errors.unit && <p className="text-destructive text-xs">{errors.unit.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="price">Price (NGN)</Label>
          <Input id="price" type="number" step="0.01" {...register("price")} />
          {errors.price && <p className="text-destructive text-xs">{errors.price.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="harvest_date">Harvest Date</Label>
          <Input id="harvest_date" type="date" {...register("harvest_date")} />
          {errors.harvest_date && <p className="text-destructive text-xs">{errors.harvest_date.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">Farm Location</Label>
        <Input id="location" {...register("location")} placeholder="City, State" />
        {errors.location && <p className="text-destructive text-xs">{errors.location.message}</p>}
      </div>

      <div className="space-y-4">
        <Label>Product Images</Label>
        
        {/* Existing Images Display */}
        {initialData?.images && initialData.images.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {initialData.images.map((img, idx) => (
              <div key={idx} className="relative w-24 h-24 bg-muted rounded-md overflow-hidden border">
                <img 
                  src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${img.storage_path}`} 
                  alt="Product" 
                  className="object-cover w-full h-full"
                />
              </div>
            ))}
          </div>
        )}

        {/* New Images Selection */}
        <div className="flex flex-wrap gap-2">
          {selectedFiles.map((file, idx) => (
            <div key={idx} className="relative w-24 h-24 bg-muted rounded-md flex items-center justify-center overflow-hidden border">
              <span className="text-xs text-center truncate px-2">{file.name}</span>
              <button 
                type="button" 
                onClick={() => removeFile(idx)}
                className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-black/80"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          
          <label className="w-24 h-24 flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/30 rounded-md cursor-pointer hover:bg-muted/50 transition">
            <ImagePlus className="w-6 h-6 text-muted-foreground mb-1" />
            <span className="text-xs text-muted-foreground">Add Image</span>
            <input 
              type="file" 
              multiple 
              accept="image/*" 
              className="hidden" 
              onChange={handleFileSelect}
            />
          </label>
        </div>
        {(errors.images || selectedFiles.length === 0 && !initialData?.images?.length) && (
          <p className="text-destructive text-xs">At least one image is required.</p>
        )}
      </div>

      <div className="flex justify-end space-x-2 pt-4 border-t">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : (initialData ? "Update Product" : "Create Product")}
        </Button>
      </div>
    </form>
  );
}
