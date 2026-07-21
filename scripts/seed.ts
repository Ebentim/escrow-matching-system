import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://sswzommkholhudcgufkb.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzd3pvbW1raG9saHVkY2d1ZmtiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mzc2MTQyOSwiZXhwIjoyMDk5MzM3NDI5fQ.vBA3-6XORYHPFu1YTjHw-Qy-K-HX68sWa-OWWJ4hK98";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function run() {
  const { data: usersData } = await supabase.auth.admin.listUsers();
  
  if (usersData && usersData.users) {
      for (const user of usersData.users) {
        console.log(`Deleting auth user ${user.id} (${user.email})...`);
        const { error } = await supabase.auth.admin.deleteUser(user.id);
        if (error) {
          console.error(`Error deleting user ${user.id}:`, error);
        }
      }
  }

  const profiles = [
    {
      email: "banjodavid001@gmail.com",
      password: "1234567890",
      role: "agent",
      metadata: {
        full_name: "Banjo David",
        phone: "08012345678",
        location: "Lagos",
        role: "agent",
        vehicle_type: "Truck",
        coverage_area: "Lagos & Ogun"
      }
    },
    {
      email: "timileyinolayuwa@gmail.com",
      password: "1234567890",
      role: "farmer",
      metadata: {
        full_name: "Timileyin Olayuwa",
        phone: "08023456789",
        location: "Oyo",
        role: "farmer",
        farm_name: "Timi Farms",
        farm_location: "Oyo North"
      }
    },
    {
      email: "ebentim4@gmail.com",
      password: "1234567890",
      role: "buyer",
      metadata: {
        full_name: "Eben Tim",
        phone: "08034567890",
        location: "Abuja",
        role: "buyer",
        business_name: "Eben Groceries",
        delivery_address: "12 Abuja Way"
      }
    },
    {
      email: "admin@alpinesbolt.com",
      password: "1234567890",
      role: "admin",
      metadata: {
        full_name: "System Admin",
        phone: "08045678901",
        location: "HQ",
        role: "admin"
      }
    }
  ];

  for (const profile of profiles) {
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const exists = existingUsers.users.find(u => u.email === profile.email);
    if (exists) {
        console.log(`${profile.email} exists, skipping creation or you can update.`);
        // Let's ensure the public table is correct for existing
        await supabase.from("users").upsert({
            id: exists.id,
            email: profile.email,
            full_name: profile.metadata.full_name,
            phone: profile.metadata.phone,
            role: profile.role,
        });
        continue;
    }

    console.log(`Creating user ${profile.email} (${profile.role})...`);
    const { data: newUser, error } = await supabase.auth.admin.createUser({
      email: profile.email,
      password: profile.password,
      email_confirm: true,
      user_metadata: profile.metadata,
    });
    
    if (error) {
      console.error(`Error creating ${profile.email}:`, error.message);
    } else {
      console.log(`Created ${profile.email} successfully.`);
      if (newUser.user) {
        await supabase.from("users").upsert({
          id: newUser.user.id,
          email: profile.email,
          full_name: profile.metadata.full_name,
          phone: profile.metadata.phone,
          role: profile.role,
        });
        if (profile.role === 'agent') {
            await supabase.from("delivery_agent_profiles").upsert({
                user_id: newUser.user.id,
                vehicle_type: profile.metadata.vehicle_type,
                coverage_area: profile.metadata.coverage_area,
                availability_status: true
            });
        }
      }
    }
  }

  console.log("Done.");
}

run();
