import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type OutboxRecord = {
  id: number;
  profile_id: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  attempts: number;
};

type WebhookPayload = { type: "INSERT"; table: "notification_outbox"; record: OutboxRecord };

Deno.serve(async (request) => {
  const webhookSecret = Deno.env.get("PUSH_WEBHOOK_SECRET");
  if (!webhookSecret || request.headers.get("x-webhook-secret") !== webhookSecret) {
    return new Response("Unauthorized", { status: 401 });
  }

  const payload = await request.json() as WebhookPayload;
  const record = payload.record;
  if (!record?.id || !record.profile_id) return new Response("Invalid payload", { status: 400 });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  await supabase.from("notification_outbox").update({ status: "processing", attempts: record.attempts + 1 }).eq("id", record.id);
  const { data: tokens, error: tokenError } = await supabase
    .from("device_push_tokens")
    .select("expo_push_token")
    .eq("profile_id", record.profile_id)
    .eq("enabled", true);

  if (tokenError) return finish(supabase, record.id, false, tokenError.message);
  if (!tokens?.length) return finish(supabase, record.id, true);

  const messages = tokens.map(({ expo_push_token }) => ({
    to: expo_push_token,
    title: record.title,
    body: record.body,
    data: record.data,
    sound: "default",
    channelId: "orders",
    priority: "high"
  }));

  const expoAccessToken = Deno.env.get("EXPO_ACCESS_TOKEN");
  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(expoAccessToken ? { Authorization: `Bearer ${expoAccessToken}` } : {})
    },
    body: JSON.stringify(messages)
  });
  const result = await response.json().catch(() => null) as { data?: Array<{ status: string; details?: { error?: string }; message?: string }> } | null;
  if (!response.ok) return finish(supabase, record.id, false, JSON.stringify(result));

  const tickets = result?.data ?? [];
  const invalidTokens = tokens.filter((_, index) => tickets[index]?.details?.error === "DeviceNotRegistered").map(({ expo_push_token }) => expo_push_token);
  if (invalidTokens.length) await supabase.from("device_push_tokens").update({ enabled: false }).in("expo_push_token", invalidTokens);
  const failures = tickets.filter((ticket) => ticket.status === "error");
  return finish(supabase, record.id, failures.length === 0, failures.map((ticket) => ticket.message ?? ticket.details?.error).join("; "));
});

async function finish(supabase: ReturnType<typeof createClient>, id: number, sent: boolean, error?: string) {
  await supabase.from("notification_outbox").update({
    status: sent ? "sent" : "failed",
    processed_at: sent ? new Date().toISOString() : null,
    last_error: error?.slice(0, 1000) ?? null
  }).eq("id", id);
  return Response.json({ ok: sent }, { status: sent ? 200 : 502 });
}
