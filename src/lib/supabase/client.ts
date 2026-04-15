import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/supabase";
import { getSupabaseBrowserEnv } from "@/lib/supabase/env";

let browserClient: ReturnType<typeof createClient<Database>> | null = null;

export function getSupabaseBrowserClient() {
  if (browserClient) {
    return browserClient;
  }

  const { url, anonKey } = getSupabaseBrowserEnv();
  browserClient = createClient<Database>(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return browserClient;
}
