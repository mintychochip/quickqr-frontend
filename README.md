# quickqr frontend

Svelte 5 + TypeScript + Vite + Tailwind CSS 4.

## Scripts

- `bun run dev` — dev server (port 5186)
- `bun run build` — `svelte-check` + production build to `dist/`
- `bun run preview` — preview production build (port 5185)
- `bun run check` — `svelte-check --tsgo` (Svelte + project `.ts` via tsconfig `include`)
- `bun run check:ts` — `tsc --noEmit` (TypeScript 7 native; full `.ts` program in `tsconfig.app.json`)
- `bun run build` runs both checks before Vite
- `bun run ui:add -- <component>` — add shadcn-svelte UI via `components.json` (installs `.svelte`, not React)

**Do not** run `bunx shadcn@latest` (React). Use `bunx shadcn-svelte@latest add <name>` or `bun run ui:add -- <name>`.

The Vite dev/preview servers proxy `/api` and `/r` to the Go backend on `localhost:8080`.

## Cloudflare Pages

There are two Pages projects. `quickqr` is production (quickqr.app) and is connected to Git
(`mintychochip/quickqr-frontend`), so do not upload to it by hand: pushing `master` is the production deploy, and any
other branch builds a preview. `master` was the old Astro and Supabase app; the Svelte rebuild was merged in with
`-s ours`, so that history is kept but the tree is the rebuild's. `quickqr-staging` is a direct-upload project;
`staging.quickqr.app` reaches it through the proxy worker in `staging-worker/`.

Git builds run `npm run build` on Cloudflare's image, whose bun (1.2.15) cannot read a `bun.lock` written by bun 1.4
(`lockfileVersion: 2`). `wrangler.toml` is the source of truth for the build's env vars, so its `[vars]` pins
`BUN_VERSION`. Keep it equal to `bun --version` whenever `bun.lock` is regenerated, or the install step fails before
anything builds.

Deploy to staging with Wrangler:

```sh
bun run build
wrangler pages deploy dist --project-name quickqr-staging --branch main
```

`--branch main` matters. Staging's production branch is `main`, and Cloudflare treats any other branch name (this
checkout is on `svelte-rebuild`) as a preview deployment, which `staging.quickqr.app` does not serve. When the working
tree is ahead of the last commit, add `--commit-dirty=true --commit-message "..."` so the dashboard says what is there.

The Pages deployment includes `_redirects` for SPA routing and `_worker.js`, which returns a JSON 404 for `/api/*` and `/r/*` until the Go backend is hosted separately. Dashboard authentication and dynamic redirects require that backend; the marketing page and static QR generator work without it.
