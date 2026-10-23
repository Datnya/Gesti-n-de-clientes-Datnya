import { createClient } from "@supabase/supabase-js";

// Read the callback before Supabase consumes and clears its URL parameters.
const callbackQuery = new URLSearchParams(window.location.search);
const callbackHash = new URLSearchParams(window.location.hash.slice(1));
export const passwordLinkPending =
  [callbackQuery.get("type"), callbackHash.get("type")].some((type) =>
    type === "invite" || type === "recovery",
  ) ||
  callbackQuery.has("code") ||
  callbackHash.has("access_token");

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const configured = Boolean(url && key);
export const supabase = configured
  ? createClient(url!, key!, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        storage: window.sessionStorage,
        detectSessionInUrl: true,
      },
    })
  : null;
