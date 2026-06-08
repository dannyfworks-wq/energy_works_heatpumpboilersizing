# AI proxy (Cloudflare Worker)

This tiny Worker lets the **Heat Pump Boiler Sizer** call the Anthropic (Claude)
API from a public page like GitHub Pages **without putting your API key in the
page**. The key lives on the Worker as an encrypted secret; the browser only ever
talks to the Worker, never directly to Anthropic.

```
browser (github.io)  ──►  Cloudflare Worker (holds key)  ──►  api.anthropic.com
```

You only set this up **once**. After that, "Identify with AI" and the cut-sheet
reader work for anyone who opens the page — no key prompt.

---

## 1. Deploy the Worker

You need a free [Cloudflare](https://dash.cloudflare.com/sign-up) account and
[Node.js](https://nodejs.org). Then:

```bash
npm install -g wrangler          # Cloudflare's CLI (one-time)
cd proxy
wrangler login                   # opens a browser to authorize
wrangler secret put ANTHROPIC_API_KEY   # paste your sk-ant-… key when prompted
wrangler deploy
```

`wrangler deploy` prints your Worker URL, e.g.:

```
https://hp-sizer-proxy.<your-subdomain>.workers.dev
```

> **Prefer no CLI?** In the Cloudflare dashboard: **Workers & Pages → Create →
> Start from Hello World**, paste the contents of `worker.js`, then under
> **Settings → Variables and Secrets** add a **Secret** named `ANTHROPIC_API_KEY`
> with your key, and **Deploy**.

---

## 2. Point the page at the Worker

Open `index.html`, find this line near the top of the `<script>`:

```js
const PROXY_URL = "";   // e.g. "https://hp-sizer-proxy.yourname.workers.dev"
```

Paste your Worker URL between the quotes, commit, and push. Done — the AI
features now work for every visitor with no key.

> **Want to test before pushing?** On the live site open **⚙ AI settings** and
> paste the Worker URL into the **AI proxy URL** box. It's saved in your browser
> only (localStorage) and overrides `PROXY_URL`, so you can confirm it works,
> then bake it into `PROXY_URL` for everyone.

---

## 3. Lock it down

`worker.js` only accepts requests from the origins in `ALLOWED_ORIGINS`. It's
preset to `https://dannyfworks-wq.github.io`. If you host the page anywhere else
(another domain, local testing), add those origins and `wrangler deploy` again.

Because the key never leaves the Worker and the origin allowlist blocks other
sites, a leaked Worker URL can't be used to run up charges from another origin.

---

## Cost & limits

* Cloudflare Workers free tier: 100,000 requests/day — far more than this tool needs.
* You still pay Anthropic for the tokens each call uses (nameplate + cut-sheet
  reads are small — typically well under a cent each).
* Use an Anthropic key scoped/limited to your expected spend for peace of mind.

## Troubleshooting

| Symptom in the app | Likely cause |
|---|---|
| "Couldn't reach the AI proxy (…)" | Worker URL wrong, or not deployed yet |
| "Forbidden (403). The proxy rejected this site's origin" | Your page's origin isn't in `ALLOWED_ORIGINS` |
| "Proxy / API server error (5xx) … ANTHROPIC_API_KEY" | Secret not set — run `wrangler secret put ANTHROPIC_API_KEY` |
| "Anthropic rejected the key (401)" | The key in the secret is invalid or revoked |
