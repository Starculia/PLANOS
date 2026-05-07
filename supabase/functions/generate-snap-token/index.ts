import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── Auth: verify the calling user via JWT ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { tier } = await req.json();
    if (!["Pro", "Elite"].includes(tier)) {
      return new Response(JSON.stringify({ error: "Invalid tier" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const MIDTRANS_SERVER_KEY = Deno.env.get("MIDTRANS_SERVER_KEY") ?? "";
    const MIDTRANS_BASE_URL   = Deno.env.get("MIDTRANS_SANDBOX") === "false"
      ? "https://app.midtrans.com/snap/v1/transactions"
      : "https://app.sandbox.midtrans.com/snap/v1/transactions";

    const amount    = tier === "Elite" ? 35000 : 25000;
    const orderId   = `PLANOS-${user.id}-${tier}-${Date.now()}`;

    const payload = {
      transaction_details: { order_id: orderId, gross_amount: amount },
      credit_card: { secure: true },
      customer_details: {
        email: user.email,
        first_name: user.user_metadata?.username ?? "User",
      },
      custom_field1: tier,       // used by webhook to know which tier to grant
      custom_field2: user.id,    // used by webhook to find the profile row
    };

    const midRes = await fetch(MIDTRANS_BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${btoa(MIDTRANS_SERVER_KEY + ":")}`,
      },
      body: JSON.stringify(payload),
    });

    if (!midRes.ok) {
      const errBody = await midRes.text();
      console.error("[generate-snap-token] Midtrans error:", errBody);
      return new Response(JSON.stringify({ error: "Midtrans error", detail: errBody }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const midData = await midRes.json();

    // ── Record pending payment in DB ──
    const sbAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    await sbAdmin.from("payments").insert({
      order_id: orderId,
      user_id: user.id,
      tier,
      status: "pending",
      amount,
    });

    return new Response(
      JSON.stringify({ snap_token: midData.token, order_id: orderId, redirect_url: midData.redirect_url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("[generate-snap-token] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
