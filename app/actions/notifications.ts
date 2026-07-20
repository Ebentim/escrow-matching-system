"use server"

import { createClient } from "@/lib/supabase/server"

export async function markNotificationsAsRead(notificationIds: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: "Unauthorized" }

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .in("id", notificationIds)
    .eq("user_id", user.id)

  if (error) return { error: "Failed to update notifications" }
  
  return { success: true }
}
