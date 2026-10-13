import { createClient } from "@supabase/supabase-js";
import { SUPABASE_KEY, SUPABASE_URL } from "@/api/rest";

let sequence = 0;

export async function subscribeToOrderChanges(accessToken: string, onChange: () => void) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return () => undefined;
  const client = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    realtime: { params: { eventsPerSecond: 10 } }
  });
  client.realtime.setAuth(accessToken);
  let refreshTimer: ReturnType<typeof setTimeout> | undefined;
  const scheduleRefresh = () => {
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(onChange, 180);
  };
  const channel = client.channel(`orders-mobile-${++sequence}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, scheduleRefresh)
    .subscribe();
  return () => {
    if (refreshTimer) clearTimeout(refreshTimer);
    void client.removeChannel(channel);
    client.realtime.disconnect();
  };
}
