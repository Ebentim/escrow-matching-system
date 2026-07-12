import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function seedAdmin() {
  console.log("Creating admin user...");

  const email = "admin@alpinesbolt.com";
  const password = "1234567890";
  const fullName = "System Administrator";

  // 1. Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role: "admin"
    }
  });

  if (authError) {
    if (authError.message.includes("already registered") || (authError as any).code === "email_exists") {
      console.log("Admin user already exists in auth.users.");
    } else {
      console.error("Error creating auth user:", authError);
      return;
    }
  }

  // Find the user if it already existed
  let userId = authData?.user?.id;
  
  if (!userId) {
    const { data: users } = await supabase.auth.admin.listUsers();
    const existingUser = users.users.find(u => u.email === email);
    if (existingUser) userId = existingUser.id;
  }

  if (!userId) {
    console.error("Could not find or create user ID.");
    return;
  }

  // 2. Insert into public.users table (it might already be there via trigger, but trigger sets role = 'buyer' by default sometimes)
  // Let's upsert the correct role.
  const { error: dbError } = await supabase.from("users").upsert({
    id: userId,
    email: email,
    full_name: fullName,
    role: "admin",
    is_active: true
  });

  if (dbError) {
    console.error("Error updating public.users table:", dbError);
  } else {
    console.log("Successfully seeded admin user!");
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
  }
}

seedAdmin();
