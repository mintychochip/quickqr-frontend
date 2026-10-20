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

The static frontend deploys with Wrangler:

```sh
bun run build
wrangler pages deploy dist --project-name quickqr-frontend
```

The Pages deployment includes `_redirects` for SPA routing and `_worker.js`, which returns a JSON 404 for `/api/*` and `/r/*` until the Go backend is hosted separately. Dashboard authentication and dynamic redirects require that backend; the marketing page and static QR generator work without it.
