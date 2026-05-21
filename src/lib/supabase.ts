import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const url = "https://pixeqpezgahkpjiisjih.supabase.co";
const anonKey = "sb_publishable__8KMmd5FQXXDBvP_7GL_uQ_ohBjjElm";

export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: localStorage,
  },
});
