# Sticker Party

A Mario Party-style board game for 2 to 16 friends, played in the browser. One **host screen** is shared on Discord
(or shown on a TV); everyone plays on their own phone or laptop. Nothing to install.

- **Host:** open the site → **Host a game**. Screen-share that window. Press **Play from this computer or your phone**
  to get your personal player link (opens in its own window, or scan a QR on your phone).
- **Friends:** open the site and type the 4-letter code, or scan the QR on the shared screen.

**What's in it:** a procedurally generated board with simultaneous turns, stars, items, hidden traps, duels
with spectator bets, a shop, a last-place twist and bonus stars; 33 mini games across free-for-all, team,
1 vs many and co-op; stream-delay calibration so phones never spoil results; and, for big rooms, team board
mode, movement cards and deck editing. Sound is synthesised live (music on the host screen only), and all
art is hand-drawn SVG, so there are no asset downloads.

**Accessibility:** controls adapt to touch, mouse and keyboard (gamepads work for d-pad and button games). The phone menu has
**Preferences** (reduced motion, high contrast, extra key bindings including an AZERTY preset). Identity is
carried by the animal, not only the colour.

**Dev pages:** `/dev/input-lab` (try every control on your device), `/dev/minigame/<id>?n=8` (one game against
bots), `/dev/board?n=16&team=1&cards=1&tutorial=1` (a board game with options), `/credits`.

## Stack

| Part | Tech |
| --- | --- |
| Server | Cloudflare Workers + one SQLite-backed Durable Object per room (free plan) |
| Engine | Pure TypeScript state machine in `packages/engine` (runs in the DO, in tests and as bots) |
| Client | Vite + React 19 in `apps/web/src`; the Worker lives in `apps/web/worker` |
| Shared | Protocol, clock sync, seeded RNG, rules and theme in `packages/shared` |

## Develop

```bash
pnpm install
pnpm dev          # Vite + Worker + Durable Objects on http://localhost:5173 (and your LAN IP for phones)
pnpm check        # typecheck + unit tests
pnpm e2e          # Playwright: host + several player devices
```

Phones on the same Wi-Fi can open `http://<your LAN IP>:5173`. For friends elsewhere during development,
`cloudflared tunnel --url http://localhost:5173` gives a free temporary public URL.

## Deploy (free)

Live at **https://partygame.harryjameschapman.com** (production, from `main`). Staging, from `staging`, is at
https://partygame-staging.harryjameschapman.workers.dev.

GitHub Actions deploys after every check and e2e test has passed (the `deploy` job in `.github/workflows/ci.yml`):
a push to `main` deploys production and a push to `staging` deploys staging. It needs one repository secret,
`CLOUDFLARE_API_TOKEN`: in Cloudflare, go to My Profile → API Tokens → Create Token → "Edit Cloudflare Workers",
then run `gh secret set CLOUDFLARE_API_TOKEN`. Without the secret the job skips the deploy with a warning.

To deploy by hand (with `npx wrangler login` done once):

```bash
pnpm build && cd apps/web && npx wrangler deploy                            # production
CLOUDFLARE_ENV=staging pnpm build && cd apps/web && npx wrangler deploy     # staging
```

The custom domain is declared in `apps/web/wrangler.jsonc` (`routes` with `custom_domain`). Cloudflare creates the
DNS record and certificate on deploy. Optional: `wrangler secret put ADMIN_KEY` to read playtest feedback at
`/api/admin/feedback?key=…`.

Durable Object Workers don't get per-version preview URLs, which is why staging is a separate Worker.

### Free-tier budget

Workers free plan: 100k requests/day (WebSocket messages count 20:1, static assets are free) and 13,000 GB-s/day
of Durable Object time. A 45-minute, 16-player game uses roughly 350 GB-s, so dozens of games a day fit.
