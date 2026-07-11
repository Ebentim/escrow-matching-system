import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProductsClient } from "./client-page";

export default async function FarmerProductsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: userData } = await supabase
    .from("users")
    .select("location")
    .eq("id", user.id)
    .single();

  // Fetch products with their images
  const { data: products, error } = await supabase
    .from("products")
    .select(`
      *,
      product_images (
        storage_path,
        is_primary
      )
    `)
    .eq("farmer_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load products:", error);
  }

  // Cast product_images and format for client
  const initialProducts = products?.map(p => ({
    ...p,
    product_images: p.product_images || [],
  })) || [];

  return (
    <div className="min-h-screen bg-muted/20">
      <ProductsClient 
        initialProducts={initialProducts} 
        farmerLocation={userData?.location || ""}
      />
    </div>
  );
}
