import { createClient } from "@/lib/supabase/server";
import { ProductsClient } from "./client-page";

export default async function AdminProductsPage() {
  const supabase = await createClient();

  const { data: products, error } = await supabase
    .from("products")
    .select(`
      *,
      farmer:users!products_farmer_id_fkey (
        farmer_profiles (farm_name)
      ),
      product_images (storage_path, is_primary)
    `)
    .eq("status", "pending_approval")
    .order("created_at", { ascending: false });

  if (error) {
    return <div>Failed to load pending products: {error.message} - {error.details} - {error.hint}</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Product Approvals</h1>
      <p className="text-muted-foreground">Review and approve new product listings from farmers.</p>
      
      <ProductsClient products={products || []} />
    </div>
  );
}
