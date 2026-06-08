/*
 * Anthropic API proxy — Cloudflare Worker
 * ----------------------------------------
 * Lets the Heat Pump Boiler Sizer call the Claude API from a public/static host
 * (e.g. GitHub Pages) WITHOUT putting an API key in the page.
 *
 * Your Anthropic key is stored as an encrypted Worker secret named
 * ANTHROPIC_API_KEY, so the browser never sees it. Requests are accepted only
 * from the origins listed in ALLOWED_ORIGINS below.
 *
 * Deploy: see proxy/README.md
 */

// Only these origins may use the proxy (prevents others spending your quota).
const ALLOWED_ORIGINS = [
  "https://dannyfworks-wq.github.io",
  // Add more if you host the page elsewhere, e.g.:
  // "http://localhost:8000",
  // "http://127.0.0.1:5500",
];

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

function corsHeaders(origin) {
  // Echo the request origin back when it's allowed; otherwise fall back to the
  // first allowed origin so the browser still receives a well-formed header.
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function jsonError(message, status, origin) {
  return new Response(JSON.stringify({ error: { message } }), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (request.method !== "POST") {
      return jsonError("Method not allowed — POST only", 405, origin);
    }
    // Reject browsers from origins we don't recognise.
    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
      return jsonError("Origin not allowed: " + origin, 403, origin);
    }
    if (!env.ANTHROPIC_API_KEY) {
      return jsonError("Proxy is missing the ANTHROPIC_API_KEY secret", 500, origin);
    }

    let payload;
    try {
      payload = await request.text();
    } catch (_) {
      return jsonError("Could not read request body", 400, origin);
    }

    let upstream;
    try {
      upstream = await fetch(ANTHROPIC_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": ANTHROPIC_VERSION,
        },
        body: payload,
      });
    } catch (e) {
      return jsonError("Upstream fetch to Anthropic failed: " + (e && e.message), 502, origin);
    }

    // Pass the Anthropic response straight through, adding CORS headers.
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
    });
  },
};
