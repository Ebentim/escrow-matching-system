import { createClient } from "@/lib/supabase/server";
import { UsersClient } from "./client-page";

export default async function AdminUsersPage() {
  const supabase = await createClient();

  const { data: users, error } = await supabase
    .from("users")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return <div>Failed to load users.</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
      <UsersClient users={users || []} />
    </div>
  );
}
