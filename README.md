# quickqr frontend

Svelte 5 + TypeScript + Vite, styled with plain CSS, and the API that goes with it: a TypeScript port of the Go server that
runs as a Cloudflare Pages Function on a D1 database (`edge/` and `functions/`; the design and limits are in
`docs/content/docs/self-hosting.mdx` in the parent repository).

## Scripts

- `bun run dev` — dev server (port 5186)
- `bun run build` — `svelte-check`, `tsc` for the app and for `edge/`, then the production build to `dist/`
- `bun run preview` — preview production build (port 5185)
- `bun run check` — `svelte-check --tsgo` (Svelte + project `.ts` via tsconfig `include`)
- `bun run check:ts` — `tsc --noEmit` (TypeScript 7 native; full `.ts` program in `tsconfig.app.json`)
- `bun run check:edge` — `tsc --noEmit` for the API (`tsconfig.edge.json`: Workers types, strict, `noUncheckedIndexedAccess`)
- `bun run test:edge` — the API's tests (`bun test edge`), including the access matrix and a check that the registered
  routes and `docs/openapi.yaml` list the same operations (skipped when this directory is cloned without `docs/`)
- `bun run test:e2e` — Playwright, against the dev server and whichever API is on port 8080
- `bun run deploy:staging` — build and deploy to the staging project (below)
- `bun scripts/gift.ts create|list|revoke --env local|staging|prod` — make, list, and revoke gift links straight against D1 (below)

The Vite dev/preview servers proxy `/api`, `/r`, `/qr.png`, and `/qr.svg` to port 8080. Put either backend there:

```sh
cd ../backend && PORT=8080 go run ./cmd/server        # the Go server, data in memory
# or the Cloudflare one, with a local D1 (needs .dev.vars, see below):
bun run build
bunx wrangler d1 migrations apply quickqr-prod --local
bunx wrangler pages dev dist --port 8080 --local
```

`.dev.vars` is git-ignored. For local sign-in it holds `OAUTH_REDIRECT_ORIGIN=http://localhost:5186`,
`APP_PUBLIC_URL=http://localhost:5186`, and `SCAN_HASH_KEY=<anything>`; two loopback origins turn the sign-in stand-in on.
`ADMIN_EMAILS=ada@example.com` makes the e2e fixture user an administrator, which `e2e/gifts.spec.ts` needs. `wrangler pages
dev` reads the file only when it starts, so restart it after a change.

## Cloudflare Pages

There are two Pages projects, each bound to its own D1 database.

| | Project | Database | Configured by | Deployed by |
| - | ------- | -------- | ------------- | ----------- |
| Production (`quickqr.app`) | `quickqr`, Git-connected | `quickqr-prod` | `wrangler.toml` | pushing `master` |
| Staging | `quickqr-staging`, direct upload | `quickqr-staging` | `staging/wrangler.toml` | `bun run deploy:staging` |

Pushing `master` is the production deploy, and any other branch builds a preview, so do not upload to `quickqr` by hand.
`master` was the old Astro and Supabase app; the Svelte rebuild was merged in with `-s ours`, so that history is kept but
the tree is the rebuild's. Git builds run `npm run build` on Cloudflare's image, whose bun (1.2.15) cannot read a
`bun.lock` written by bun 1.4 (`lockfileVersion: 2`), so `wrangler.toml` pins `BUN_VERSION` in `[vars]`. Keep it equal to
`bun --version` whenever `bun.lock` is regenerated, or the install step fails before anything builds.

Preview deployments (every other branch) are built from the same `wrangler.toml`. Without an `[env.preview]` section they
take the top-level binding, which is the production database, so the file has one: previews use the staging database and
get no Google client id, which leaves every sign-in provider off. `pages dev` cannot resolve that section locally (it has
no `--env` or `--branch`), so a change to it is tested by pushing a branch and reading the project's `deployment_configs`
back from the Pages API.

Pages does not take `--config`, which is why staging has its own directory. `bun run deploy:staging` builds, copies
`dist/` to `staging/out/`, compiles the same `functions/` directory to `staging/out/_worker.js/`, and deploys that from
`staging/` so `staging/wrangler.toml`, not the production file, decides the bindings. (Compiling `functions/` through a
symlink in `staging/` fails inside Wrangler, which is why the build happens here and the result is uploaded.)
`--branch main` matters: staging's production branch is `main`, and any other branch name is a preview deployment.

Secrets are set on each project, never in a file: `GOOGLE_CLIENT_SECRET`, `SCAN_HASH_KEY` (required; scans are not
recorded without it), and `ADMIN_EMAILS` (below). `bunx wrangler pages secret put NAME --project-name quickqr` (or
`quickqr-staging`). Run `bunx wrangler d1 migrations apply quickqr-prod --remote` (from `frontend/`; `quickqr-staging` from
`staging/`) after a change to `edge/migrations/`, before the code that needs it is deployed. For `0002_gifts.sql` code that
gets there first breaks nothing that worked: scans and `GET /api/auth/me` keep working (a plan that cannot be read counts
as Free, and the failure is logged as `plan lookup failed`). The gift routes answer 500 and a gifted plan has no effect
until the migration is applied. `bunx wrangler d1 migrations list quickqr-prod
--remote` shows what is still pending. Pin the account when running Wrangler, because a stale one cached under
`node_modules/.cache/wrangler` can send it to the wrong one: `CLOUDFLARE_ACCOUNT_ID=<the account that owns quickqr.app>`.

`public/_routes.json` sends only `/api/*`, `/r/*`, `/R/*`, `/qr`, `/qr.png`, `/qr.svg`, and `/healthz` to the Function;
everything else is a static file, which costs nothing. Pages serves `index.html` for any other path.

### Gift links

A gift link gives a signed-in person a Plus or Pro plan for a number of days; it holds only a random token, and the plan,
the days, and the number of uses stay in D1 (only the token's SHA-256 is stored). An administrator is a signed-in account
whose email is in `ADMIN_EMAILS`, a comma-separated secret; unset means nobody. Gifts are made on `/dashboard/gifts` or
from a terminal, which needs no admin session because your Cloudflare login is the credential:

```sh
CLOUDFLARE_ACCOUNT_ID=<the account> bun scripts/gift.ts create --plan plus --days 30 --note "Sam" --env prod
bun scripts/gift.ts list --env prod
bun scripts/gift.ts revoke gft-abc12345 --env prod
```

`--env` is `local`, `staging`, or `prod` and has no default, so a gift is never made on production by accident; `local` needs
no account id. `create` prints the link once and it cannot be shown again. Design: `docs/superpowers/specs/2026-10-22-gift-grants-design.md`
in the parent repository. Guide: `docs/content/docs/gift-links.mdx`.

### Staging hostname

The backend answers at `https://quickqr-staging.pages.dev`, and `staging.quickqr.app` reaches it too. That hostname is the
proxy Worker in `staging-worker/` (deployed with `wrangler deploy` from that directory). It has had no backend of its own
since the Go server on odin and its Workers VPC service were deleted on 2026-10-22, so its binding was removed and it now
passes every path to this Pages project. It does not follow redirects, so a scan's or a sign-in's redirect reaches the
browser. The cost: the Function reads the visitor's address from `CF-Connecting-IP` and nothing else, and through the
Worker that header carries a Cloudflare address, so scans made through `staging.quickqr.app` are logged under Cloudflare's
network (`2a06:98c0:3600::/48` on 2026-10-22, against the visitor's own `/24` for a scan sent straight to
`quickqr-staging.pages.dev`). The cleaner arrangement is to point the hostname at the Pages project itself: remove the
Worker's custom domain, then add the hostname under the project's Custom domains in the dashboard (with a proxied CNAME to
`quickqr-staging.pages.dev` if the dashboard does not create it). The Wrangler login cannot write DNS, so that step is
made in the dashboard. Until then this hostname is a stopgap that mis-records scan networks. Once it is done, delete
`staging-worker/` and the Worker.

The site reader (`POST /api/qr/context`) on the Pages backend refuses literal private addresses, `localhost`, `.local`, and
`.internal`, checks every redirect hop, and times out after 8 seconds. It cannot see where a hostname points, so a name that
resolves to a private address is left to Cloudflare, which refuses the connection: on 2026-10-22 `localtest.me` and `nip.io`
names resolving to 127.0.0.1, 10.0.0.1, 192.168.0.1, and 169.254.169.254 each came back `That site returned 530` from the
deployed staging project. That is five names with one hop each, not a proof for every internal address. The route is still
an anonymous GET fetcher.
