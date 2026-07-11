import { createBrowserClient } from "@supabase/ssr";
import { clientEnv } from "@/lib/env";

export function createClient() {
  return createBrowserClient(
    clientEnv.supabase.url,
    clientEnv.supabase.anonKey
  );
}
