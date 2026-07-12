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
    .select("role")
    .eq("id", authData.user?.id)
    .single();

  if (userData) {
    revalidatePath("/", "layout");
    redirect(`/${userData.role}/dashboard`);
  } else {
    // Fallback if public.users is out of sync
    revalidatePath("/", "layout");
    redirect("/");
  }
}

export async function loginWithOTP(phone: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    phone,
  });

  if (error) {
    return { error: error.message };
  }
  return { success: "OTP sent successfully" };
}

export async function verifyOTP(phone: string, token: string) {
  const supabase = await createClient();
  const { error, data: authData } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: "sms",
  });

  if (error) {
    return { error: error.message };
  }

  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", authData.user?.id)
    .single();

  if (userData) {
    revalidatePath("/", "layout");
    redirect(`/${userData.role}/dashboard`);
  }

  return { success: true };
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

  const { data: authData, error } = await supabase.auth.signUp({
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
