import { renderers } from './renderers.mjs';
import { c as createExports, s as serverEntrypointModule } from './chunks/_@astrojs-ssr-adapter_BM7Qj3_s.mjs';
import { manifest } from './manifest_CWtbKM0a.mjs';

const serverIslandMap = new Map();;

const _page0 = () => import('./pages/_image.astro.mjs');
const _page1 = () => import('./pages/admin.astro.mjs');
const _page2 = () => import('./pages/auth/callback.astro.mjs');
const _page3 = () => import('./pages/auth/signin.astro.mjs');
const _page4 = () => import('./pages/auth/signup.astro.mjs');
const _page5 = () => import('./pages/code/_slug_.astro.mjs');
const _page6 = () => import('./pages/create.astro.mjs');
const _page7 = () => import('./pages/dashboard.astro.mjs');
const _page8 = () => import('./pages/pricing.astro.mjs');
const _page9 = () => import('./pages/index.astro.mjs');
const pageMap = new Map([
    ["node_modules/astro/dist/assets/endpoint/generic.js", _page0],
    ["src/pages/admin.astro", _page1],
    ["src/pages/auth/callback.astro", _page2],
    ["src/pages/auth/signin.astro", _page3],
    ["src/pages/auth/signup.astro", _page4],
    ["src/pages/code/[slug].astro", _page5],
    ["src/pages/create.astro", _page6],
    ["src/pages/dashboard.astro", _page7],
    ["src/pages/pricing.astro", _page8],
    ["src/pages/index.astro", _page9]
]);

const _manifest = Object.assign(manifest, {
    pageMap,
    serverIslandMap,
    renderers,
    actions: () => import('./noop-entrypoint.mjs'),
    middleware: () => import('./_noop-middleware.mjs')
});
const _args = {
    "middlewareSecret": "ddfa2189-4706-4d9c-88a5-e1d598d6672d",
    "skewProtection": false
};
const _exports = createExports(_manifest, _args);
const __astrojsSsrVirtualEntry = _exports.default;
const _start = 'start';
if (Object.prototype.hasOwnProperty.call(serverEntrypointModule, _start)) ;

export { __astrojsSsrVirtualEntry as default, pageMap };
