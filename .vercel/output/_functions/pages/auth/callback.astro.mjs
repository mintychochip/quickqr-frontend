import { e as createComponent, f as createAstro, k as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../../chunks/astro/server_Z1ggZnD5.mjs';
import 'piccolore';
import { $ as $$MainLayout } from '../../chunks/MainLayout_DrlpgbZt.mjs';
/* empty css                                       */
export { renderers } from '../../renderers.mjs';

const $$Astro = createAstro();
const $$Callback = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Callback;
  const url = Astro2.request.url;
  const code = new URL(url).searchParams.get("code");
  if (code) {
    const { supabase } = await import('../../chunks/MainLayout_DrlpgbZt.mjs').then(n => n.a);
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return Astro2.redirect("/dashboard");
    }
  }
  return renderTemplate`${renderComponent($$result, "MainLayout", $$MainLayout, { "title": "Signing In - QuickQR" }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="auth-container"> <div class="auth-card"> <div class="auth-loading"> <div class="spinner"></div> <p>Signing you in...</p> </div> </div> </div> ` })}`;
}, "/home/justin-lo/quickqr/src/pages/auth/callback.astro", void 0);

const $$file = "/home/justin-lo/quickqr/src/pages/auth/callback.astro";
const $$url = "/auth/callback";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Callback,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
