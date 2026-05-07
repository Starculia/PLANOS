import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MIDTRANS_SERVER_KEY = Deno.env.get("MIDTRANS_SERVER_KEY") ?? "";
const ALL_THEMES = JSON.stringify(["Default", "cyberpunk", "matrix", "gold"]);

serve(async (req) => {
  // Midtrans sends POST; respond to GET/HEAD for URL verification
  if (req.method !== "POST") {
    return new Response("PLANOS Webhook OK", { status: 200 });
  }

  try {
    const notification = await req.json();

    const {
      order_id,
      status_code,
      gross_amount,
      transaction_status,
      signature_key,
      custom_field1: tier,
      custom_field2: userId,
    } = notification;

    // ── 1. Verify Midtrans signature ──
    const rawString   = `${order_id}${status_code}${gross_amount}${MIDTRANS_SERVER_KEY}`;
    const hashBuffer  = await crypto.subtle.digest("SHA-512", new TextEncoder().encode(rawString));
    const computedSig = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0")).join("");

    if (computedSig !== signature_key) {
      console.error("[webhook] Invalid signature");
      return new Response("Invalid signature", { status: 403 });
    }

    // ── 2. Act on successful payment ──
    const isSuccess =
      transaction_status === "settlement" ||
      transaction_status === "capture";

    if (!isSuccess) {
      console.log(`[webhook] Ignoring status: ${transaction_status}`);
      return new Response("OK", { status: 200 });
    }

    if (!userId || !tier || !["Pro", "Elite"].includes(tier)) {
      console.error("[webhook] Missing/invalid custom fields", { userId, tier });
      return new Response("Bad fields", { status: 400 });
    }

    // ── 3. Update profiles via service role ──
    const sbAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const updatePayload: Record<string, unknown> = { tier };
    if (tier === "Elite") {
      updatePayload.unlocked_themes = ALL_THEMES;
    }

    const { error: profileErr } = await sbAdmin
      .from("profiles")
      .update(updatePayload)
      .eq("id", userId);

    if (profileErr) {
      console.error("[webhook] Profile update error:", profileErr);
      return new Response("DB error", { status: 500 });
    }

    // ── 4. Mark payment as settled ──
    await sbAdmin
      .from("payments")
      .update({ status: "settled", settled_at: new Date().toISOString() })
      .eq("order_id", order_id);

    console.log(`[webhook] ✅ ${userId} upgraded to ${tier}`);
    return new Response("OK", { status: 200 });

  } catch (err) {
    console.error("[webhook] Uncaught error:", err);
    return new Response(err.message, { status: 500 });
  }
});
