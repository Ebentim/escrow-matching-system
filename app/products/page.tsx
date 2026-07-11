import { createClient } from "@/lib/supabase/server";
import { ProductsClient } from "./client-page";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await createClient();
  const params = await searchParams;
  
  const page = typeof params.page === 'string' ? parseInt(params.page, 10) : 1;
  const limit = 12;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("products")
    .select(`
      *,
      product_images (storage_path, is_primary)
    `, { count: 'exact' })
    .eq("status", "available");

  // Apply filters
  if (typeof params.q === 'string' && params.q) {
    query = query.ilike('name', `%${params.q}%`);
  }
  if (typeof params.crop === 'string' && params.crop) {
    query = query.ilike('crop_type', `%${params.crop}%`);
  }
  if (typeof params.loc === 'string' && params.loc) {
    query = query.ilike('location', `%${params.loc}%`);
  }
  if (typeof params.minPrice === 'string' && params.minPrice) {
    query = query.gte('price', params.minPrice);
  }
  if (typeof params.maxPrice === 'string' && params.maxPrice) {
    query = query.lte('price', params.maxPrice);
  }
  if (typeof params.harvestFrom === 'string' && params.harvestFrom) {
    query = query.gte('harvest_date', params.harvestFrom);
  }
  if (typeof params.harvestTo === 'string' && params.harvestTo) {
    query = query.lte('harvest_date', params.harvestTo);
  }

  // Pagination
  query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false });

  const { data: products, error, count } = await query;

  if (error) {
    console.error("Error fetching products:", error);
  }

  return (
    <div className="min-h-screen bg-muted/10">
      <ProductsClient 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        initialProducts={(products as any[]) || []} 
        totalCount={count || 0}
        currentPage={page}
        searchParams={params as Record<string, string>}
      />
    </div>
  );
}
