import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ProductDetailClient } from "./client-page";

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { id } = await params;

  // Fetch product with images
  const { data: product, error } = await supabase
    .from("products")
    .select(`
      *,
      product_images (storage_path, is_primary)
    `)
    .eq("id", id)
    .single();

  if (error || !product) {
    notFound();
  }

  // Fetch farmer profile
  const { data: farmer } = await supabase
    .from("farmer_profiles")
    .select("farm_name, farm_location, bio, rating_avg, users(full_name, phone)")
    .eq("user_id", product.farmer_id)
    .single();

  return (
    <div className="min-h-screen bg-muted/10">
      <ProductDetailClient 
        product={product} 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        farmer={farmer as any} 
      />
    </div>
  );
}
