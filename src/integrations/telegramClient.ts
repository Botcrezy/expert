import { createClient } from "@supabase/supabase-js";

/**
 * Telegram features must always point to the primary backend project.
 *
 * NOTE: This is intentionally isolated from the auto-generated `supabase` client
 * to prevent environment mismatches from breaking Telegram linking.
 */
// IMPORTANT: Use the current project's env so the integration is domain/project-agnostic.
// (No hardcoded project URLs/keys.)
const TELEGRAM_BACKEND_URL = import.meta.env.VITE_SUPABASE_URL as string;
const TELEGRAM_BACKEND_ANON_KEY = import.meta.env
  .VITE_SUPABASE_PUBLISHABLE_KEY as string;

if (!TELEGRAM_BACKEND_URL || !TELEGRAM_BACKEND_ANON_KEY) {
  // eslint-disable-next-line no-console
  console.error(
    "Telegram client env is missing. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are configured."
  );
}

export const telegramClient = createClient(
  TELEGRAM_BACKEND_URL,
  TELEGRAM_BACKEND_ANON_KEY,
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);
