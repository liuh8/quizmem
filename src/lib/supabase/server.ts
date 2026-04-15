import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/supabase";
import { getSupabaseBrowserEnv } from "@/lib/supabase/env";

export function getSupabaseServerClient() {
  const { url, anonKey } = getSupabaseBrowserEnv();

  return createClient<Database>(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
