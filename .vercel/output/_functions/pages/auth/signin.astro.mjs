import { e as createComponent, f as createAstro, k as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../../chunks/astro/server_Z1ggZnD5.mjs';
import 'piccolore';
import { $ as $$MainLayout } from '../../chunks/MainLayout_BrB7dypR.mjs';
/* empty css                                       */
export { renderers } from '../../renderers.mjs';

const $$Astro = createAstro();
const $$Signin = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Signin;
  let errorMessage = "";
  if (Astro2.request.method === "POST") {
    const formData = await Astro2.request.formData();
    const email = formData.get("email")?.toString() || "";
    const password = formData.get("password")?.toString() || "";
    const { supabase } = await import('../../chunks/MainLayout_BrB7dypR.mjs').then(n => n.a);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) {
      errorMessage = error.message;
    } else if (data.session) {
      return Astro2.redirect("/dashboard");
    }
  }
  return renderTemplate`${renderComponent($$result, "MainLayout", $$MainLayout, { "title": "Sign In - QuickQR" }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="auth-container"> <div class="auth-card"> <div class="auth-header"> <h1>Welcome back</h1> <p>Sign in to your QuickQR account</p> </div> ${errorMessage && renderTemplate`<div class="auth-error">${errorMessage}</div>`} <form class="auth-form" method="POST"> <div class="form-group"> <label for="email">Email</label> <input type="email" id="email" name="email" placeholder="you@example.com" required> </div> <div class="form-group"> <label for="password">Password</label> <input type="password" id="password" name="password" placeholder="Enter your password" required> </div> <button type="submit" class="auth-submit">Sign In</button> </form> <div class="auth-footer"> <p>Don't have an account? <a href="/auth/signup">Sign up</a></p> </div> </div> </div> ` })}`;
}, "/home/justin-lo/quickqr/src/pages/auth/signin.astro", void 0);

const $$file = "/home/justin-lo/quickqr/src/pages/auth/signin.astro";
const $$url = "/auth/signin";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Signin,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
