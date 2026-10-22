import { createApp } from '../edge/app';
import type { Env } from '../edge/env';

/**
 * The whole API runs here. public/_routes.json decides which requests reach it (the API, the scan gateway, the /qr
 * embeds, and /healthz); everything else is static files, which cost nothing and never touch the Worker quota.
 */
const app = createApp();

export const onRequest: PagesFunction<Env> = (context) => app.dispatch(context.request, context.env, context);
