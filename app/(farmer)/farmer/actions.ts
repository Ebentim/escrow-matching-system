"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { ProductInput } from "@/lib/validators";

export async function createProduct(data: ProductInput) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  // Double check role
  const { data: userData } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (userData?.role !== "farmer") {
    return { error: "Unauthorized: Only farmers can create products." };
  }

  // Insert product
  const { data: product, error: productError } = await supabase
    .from("products")
    .insert({
      farmer_id: user.id,
      name: data.name,
      crop_type: data.crop_type,
      quantity: data.quantity,
      unit: data.unit,
      price: data.price,
      harvest_date: data.harvest_date,
      location: data.location,
      status: "pending_approval",
    })
    .select()
    .single();

  if (productError || !product) {
    return { error: productError?.message || "Failed to create product" };
  }

  // Insert product images
  const validImages = data.images.filter(img => img.path);
  if (validImages.length > 0) {
    const imagesToInsert = validImages.map((img) => ({
      product_id: product.id,
      storage_path: img.path!,
      is_primary: img.is_primary,
    }));

    const { error: imagesError } = await supabase
      .from("product_images")
      .insert(imagesToInsert);

    if (imagesError) {
      // Revert product creation if images fail (ideally use a transaction but this is a simple fallback)
      await supabase.from("products").delete().eq("id", product.id);
      return { error: imagesError.message };
    }
  }

  revalidatePath("/farmer/products");
  return { success: true, product };
}

export async function updateProduct(productId: string, data: Partial<ProductInput>) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  // Verify ownership
  const { data: existingProduct } = await supabase.from("products").select("farmer_id").eq("id", productId).single();
  if (existingProduct?.farmer_id !== user.id) {
    return { error: "Unauthorized: You do not own this product." };
  }

  const { error: updateError } = await supabase
    .from("products")
    .update({
      name: data.name,
      crop_type: data.crop_type,
      quantity: data.quantity,
      unit: data.unit,
      price: data.price,
      harvest_date: data.harvest_date,
      location: data.location,
    })
    .eq("id", productId);

  if (updateError) {
    return { error: updateError.message };
  }

  // Handle images update (simplified: delete existing, insert new if images provided)
  if (data.images && data.images.length > 0) {
    // Note: in a real production app we'd carefully diff the images to avoid deleting from storage
    // or just handle the DB rows. Here we just update the DB references.
    await supabase.from("product_images").delete().eq("product_id", productId);
    
    const validImages = data.images.filter(img => img.path);
    if (validImages.length > 0) {
      const imagesToInsert = validImages.map((img) => ({
        product_id: productId,
        storage_path: img.path!,
        is_primary: img.is_primary,
      }));
      await supabase.from("product_images").insert(imagesToInsert);
    }
  }

  revalidatePath("/farmer/products");
  return { success: true };
}

export async function deleteProduct(productId: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  // We do soft delete / status change per requirement:
  // "soft-delete or status change preferred over hard delete to preserve order history integrity"
  const { error } = await supabase
    .from("products")
    .update({ status: "sold" }) // Using 'sold' or reserved as a soft state, wait, maybe we need an 'inactive' or 'cancelled' status? 
                               // Requirements say: "Farmer can delete/deactivate a product; it disappears from public search"
                               // 'reserved' or 'sold' prevents it from showing in public search (which only shows 'available').
                               // Let's use 'sold' or maybe we can add a 'cancelled' status, but given existing enums:
                               // ('pending_approval', 'available', 'reserved', 'sold')
                               // We can set it to 'sold' (or technically we could just delete it if no orders exist, but let's just set to sold for now)
    .eq("id", productId)
    .eq("farmer_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/farmer/products");
  return { success: true };
}
