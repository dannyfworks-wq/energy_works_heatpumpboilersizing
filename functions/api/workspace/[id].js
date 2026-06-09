// Cloudflare Pages Function  —  /api/workspace/:id
// -------------------------------------------------
// Cloud storage for Heat Pump Boiler Sizer "workspaces" (all projects +
// scenarios saved as one JSON blob), backed by Workers KV. It runs on the same
// origin as the page, so there is NO CORS to configure.
//
//   GET  /api/workspace/<id>   -> returns the saved JSON   (404 if none yet)
//   PUT  /api/workspace/<id>   -> saves the JSON body
//   POST /api/workspace/<id>   -> same as PUT (used by sendBeacon on tab close)
//
// One-time setup in the Cloudflare dashboard (no command line):
//   1. Workers & Pages -> KV -> Create a namespace (e.g. "HP_WORKSPACES").
//   2. Your Pages project -> Settings -> Functions ->
//      "KV namespace bindings" -> Add binding:
//          Variable name = HP_KV
//          KV namespace  = the one you just made
//   3. Deployments -> Retry deployment.
// See proxy/README.md for the full walkthrough.

const MAX_BYTES = 1_000_000;          // ~1 MB ceiling per workspace
const KEY = (id) => "ws:" + id;

export async function onRequestGet({ env, params }) {
  if (!env.HP_KV) return notConfigured();
  const id = clean(params.id);
  if (!id) return json({ error: { message: "Bad workspace id" } }, 400);
  const data = await env.HP_KV.get(KEY(id));
  if (data === null) return json({ error: { message: "No such workspace" } }, 404);
  return new Response(data, { status: 200, headers: { "Content-Type": "application/json" } });
}

// PUT and POST both save (POST lets the page use navigator.sendBeacon on unload).
export const onRequestPut = save;
export const onRequestPost = save;

async function save({ request, env, params }) {
  if (!env.HP_KV) return notConfigured();
  const id = clean(params.id);
  if (!id) return json({ error: { message: "Bad workspace id" } }, 400);

  let body;
  try { body = await request.text(); } catch (_) {
    return json({ error: { message: "Could not read request body" } }, 400);
  }
  if (body.length > MAX_BYTES) return json({ error: { message: "Workspace too large" } }, 413);
  try { JSON.parse(body); } catch (_) {
    return json({ error: { message: "Body must be JSON" } }, 400);
  }

  await env.HP_KV.put(KEY(id), body);
  return json({ ok: true }, 200);
}

// Only our own id charset, bounded length — keeps junk keys out of KV.
function clean(id) {
  return (typeof id === "string" && /^[A-Za-z0-9_-]{8,64}$/.test(id)) ? id : "";
}
function notConfigured() {
  return json({ error: { message: "Cloud storage is not set up on the server yet (missing HP_KV binding). See proxy/README.md." } }, 501);
}
function json(obj, status) {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });
}
