// Cloudflare Pages Function  —  POST /api/claude
// ------------------------------------------------
// SAME-ORIGIN proxy: the page calls "/api/claude", this runs server-side on
// Cloudflare Pages, attaches your secret key, and forwards to Anthropic.
// Because it's the same origin there is NO CORS to configure, and the key
// never reaches the browser.
//
// Setup (one time, no command line):
//   1. Cloudflare dashboard -> Workers & Pages -> Create -> Pages ->
//      "Connect to Git" -> pick this repo -> Save and Deploy.
//   2. In the new Pages project: Settings -> Environment variables ->
//      add  ANTHROPIC_API_KEY = sk-ant-...  (click "Encrypt") -> Save.
//   3. Redeploy. In index.html set:  const PROXY_URL = "/api/claude";
// Visitors then need nothing. See proxy/README.md for the full guide.

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.ANTHROPIC_API_KEY) {
    return json({ error: { message: "Server is missing the ANTHROPIC_API_KEY environment variable" } }, 500);
  }

  let body;
  try {
    body = await request.text();
  } catch (_) {
    return json({ error: { message: "Could not read request body" } }, 400);
  }

  let upstream;
  try {
    upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body,
    });
  } catch (e) {
    return json({ error: { message: "Upstream fetch to Anthropic failed: " + (e && e.message) } }, 502);
  }

  // Pass Anthropic's response straight through.
  const text = await upstream.text();
  return new Response(text, { status: upstream.status, headers: { "Content-Type": "application/json" } });
}

// Anything other than POST gets a clear, small response.
export function onRequestGet() {
  return json({ error: { message: "POST only — this endpoint proxies the Anthropic Messages API" } }, 405);
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });
}
