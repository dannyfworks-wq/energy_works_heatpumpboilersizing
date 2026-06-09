# Make the AI work for everyone — no key prompt

The AI features (nameplate photo + cut-sheet PDF reading) call Anthropic's
Claude. A web page can't call Claude without a key *somewhere*. To let **visitors
use it without entering anything**, your key lives on a tiny backend you set up
**once**; the browser only ever talks to that backend.

```
visitor's browser  ──►  your backend (holds the key)  ──►  api.anthropic.com
```

Pick **one** of the two options below. Both are free and neither puts your key in
the page. **No key = stop here** — there is no secure way to run Claude on a
public page without a key on a backend.

---

## Option A — Cloudflare Pages  ★ easiest, no command line

Best if you're OK serving the site from a `*.pages.dev` URL (you can add a custom
domain later). Cloudflare hosts the page **and** runs the key-holding function
(`functions/api/claude.js`) on the same origin — so there's nothing to copy/paste
between them.

1. [Cloudflare dashboard](https://dash.cloudflare.com) → **Workers & Pages** →
   **Create** → **Pages** → **Connect to Git** → choose this repo →
   **Save and Deploy**.
2. Open the new project → **Settings → Environment variables** → **Add variable**
   → name `ANTHROPIC_API_KEY`, value your `sk-ant-…` key → click **Encrypt** →
   **Save**.
3. **Deployments → Retry deployment** (so it picks up the key).

**Done — visitors need nothing.** On a `*.pages.dev` URL the page auto-detects the
same-origin `/api/claude` function, so there's no code to edit. (Only if you put
it on a **custom domain** do you need to set `const PROXY_URL = "/api/claude";` in
`index.html`.)

---

## Option B — Cloudflare Worker  (keep your current GitHub Pages URL)

Best if you want to stay on `dannyfworks-wq.github.io`. You deploy a small Worker
that holds the key; the GitHub Pages site calls it.

**Dashboard (no command line):**
1. [Cloudflare dashboard](https://dash.cloudflare.com) → **Workers & Pages** →
   **Create** → **Workers** → **Create Worker** → **Deploy** → **Edit code**.
2. Replace the sample with the contents of [`proxy/worker.js`](worker.js) → **Deploy**.
3. The Worker's page → **Settings → Variables and Secrets** → **Add** →
   type **Secret**, name `ANTHROPIC_API_KEY`, value your `sk-ant-…` key → **Deploy**.
4. Copy the Worker URL (e.g. `https://hp-sizer-proxy.<you>.workers.dev`) and set it
   in `index.html`:
   ```js
   const PROXY_URL = "https://hp-sizer-proxy.<you>.workers.dev";
   ```
   Commit & push. **Done.**

**Command line instead (if you prefer):**
```bash
npm install -g wrangler
cd proxy
wrangler login
wrangler secret put ANTHROPIC_API_KEY   # paste your sk-ant-… key
wrangler deploy                          # prints your Worker URL
```

`worker.js` only accepts requests from the origins in its `ALLOWED_ORIGINS` list
(preset to `https://dannyfworks-wq.github.io`). Edit that list if you host the
page elsewhere, then redeploy.

---

## Test before committing

On the live site, open **⚙ AI settings** and paste your backend URL into the
**AI proxy URL** box (Worker URL, or `/api/claude` for Option A). It's saved in
your browser only and overrides `PROXY_URL`, so you can confirm it works, then
bake the value into `PROXY_URL` for everyone.

## Just need it working for *yourself* right now?

Open **⚙ AI settings** and paste your `sk-ant-…` key into the **API key** box. It
works immediately and is held in memory only (never saved). This is per-person,
so it's not the "visitors need nothing" answer — but it's the fastest way to
verify the tool end-to-end.

## Cloud sync across devices (save projects in the cloud)

Separate from the AI: this lets your **projects & scenarios** save to the cloud so
you can open them on your phone, another PC, or share them with a coworker by
link. It's backed by **Cloudflare KV** (a free key-value store) and the
same-origin function `functions/api/workspace/[id].js` — no extra server.

```
your browser  ──►  /api/workspace/<id>  ──►  Cloudflare KV (holds the JSON)
```

**One-time setup (Cloudflare dashboard, no command line):**
1. **Workers & Pages → KV → Create a namespace.** Name it anything (e.g.
   `HP_WORKSPACES`).
2. Open your **Pages project → Settings → Functions → KV namespace bindings →
   Add binding.** Set **Variable name** = `HP_KV` and pick the namespace from
   step 1. **Save.**
3. **Deployments → Retry deployment** (so the function picks up the binding).

**How to use it (in the app):**
* The **Cloud** row in the workspace bar → **☁ Turn on cloud sync.** Your current
  projects upload and a **share link is copied to your clipboard**. From then on
  this device auto-syncs every change.
* Open that link on any other device (or send it to a coworker) → same projects,
  kept in sync. **Anyone with the link can view and edit**, like a Google Doc
  share link — so only share it with people you trust.
* **Open shared…** lets you paste a link/ID to jump into someone else's workspace.
  **Turn off** goes back to saving only on that device.

Notes:
* Until the `HP_KV` binding exists, the Cloud row shows *"not set up on the
  server yet"* — finish the 3 steps above and Retry deployment.
* Edits are last-write-wins (no live multi-user merge). Fine for one estimator
  moving between devices or handing a project to a coworker; don't have two
  people type into the same workspace at the same instant.
* Each workspace is capped at ~1 MB (plenty for many projects).

## Cost & limits

* Cloudflare free tier: 100k requests/day — far more than this tool needs.
* You pay Anthropic for tokens used. Nameplate/cut-sheet reads are small
  (typically a fraction of a cent each). Use a spend-limited key for safety.

## Troubleshooting (messages shown in the app)

| Message | Fix |
|---|---|
| "Couldn't reach the AI proxy (…)" | URL wrong or backend not deployed yet |
| "Forbidden (403) … rejected this site's origin" | Add your origin to `ALLOWED_ORIGINS` in `worker.js` (Option B) |
| "Proxy / API server error (5xx) … ANTHROPIC_API_KEY" | Secret/variable not set on the backend |
| "Anthropic rejected the key (401)" | The key value is invalid or revoked |
| Cloud row: "not set up on the server yet" | Add the `HP_KV` binding (see Cloud sync setup) and Retry deployment |
| Cloud row stuck on "Offline" | No network, or the function didn't deploy — check Deployments |
