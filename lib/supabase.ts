import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anon) {
  // Fail loudly during dev so Replit logs it clearly.
  // The login screen also shows a friendly banner if the client is missing.
  // eslint-disable-next-line no-console
  console.error(
    "[supabase] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. " +
      "Set them in Replit Secrets AND in the Environment Variables pane."
  );
}

export const supabase = createClient(url ?? "https://placeholder.supabase.co", anon ?? "placeholder", {
  auth: {
    storage: Platform.OS === "web" ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === "web",
  },
});

export const supabaseConfigured = Boolean(url && anon);
