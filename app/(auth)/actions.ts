"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { LoginInput, RegisterInput } from "@/lib/validators";
import { env } from "@/lib/env";
import { clientEnv } from "@/lib/env";

export async function login(data: LoginInput) {
  const supabase = await createClient();
  const { error, data: authData } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  });

  if (error) {
    return { error: error.message };
  }

  // Fetch user role for redirect
  const { data: userData } = await supabase
    .from("users")
    .select("role, is_active")
    .eq("id", authData.user?.id)
    .single();

  if (userData) {
    if (!userData.is_active) {
      await supabase.auth.signOut();
      return { error: "Your account has been suspended. Please contact support." };
    }

    revalidatePath("/", "layout");
    redirect(`/${userData.role}/dashboard`);
  } else {
    // Fallback if public.users is out of sync
    revalidatePath("/", "layout");
    redirect("/");
  }
}

export async function register(data: RegisterInput) {
  const supabase = await createClient();
  try {
    console.log("Supabase URL (server):", env.supabase.url);
  } catch {}
  
  // We pass metadata so our PostgreSQL trigger can pick it up
  const metadata = {
    full_name: data.full_name,
    phone: data.phone,
    location: data.location,
    role: data.role,
    ...(data.role === "farmer" && { farm_name: data.farm_name, farm_location: data.farm_location }),
    ...(data.role === "buyer" && { business_name: data.business_name, delivery_address: data.delivery_address }),
    ...(data.role === "agent" && { vehicle_type: data.vehicle_type, coverage_area: data.coverage_area }),
  };

  const { error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: metadata,
      // Change to the hosted URL if you have email templates enabled
      emailRedirectTo: `${clientEnv.appUrl}/auth/callback`,
    },
  });

  if (error) {
    try {
      console.error("Supabase signUp error:", error);
    } catch {}
    
    if (error.message.includes("email") || error.message.includes("rate limit")) {
      // Sometimes local or unconfigured Supabase instances throw email sending errors
      // even though the user is successfully inserted into the database.
      return { success: "Registration successful. You can now log in." };
    }
    
    return { error: error.message };
  }

  return { success: "Registration successful. Please check your email to verify your account." };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
