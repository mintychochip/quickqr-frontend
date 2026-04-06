import { e as createComponent, f as createAstro, k as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_Z1ggZnD5.mjs';
import 'piccolore';
import { $ as $$MainLayout } from '../chunks/MainLayout_D_v9-u5d.mjs';
/* empty css                                  */
export { renderers } from '../renderers.mjs';

const $$Astro = createAstro();
const $$Create = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Create;
  const { supabase } = await import('../chunks/MainLayout_D_v9-u5d.mjs').then(n => n.a);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Astro2.redirect("/auth/signin");
  }
  let errorMessage = "";
  let success = false;
  if (Astro2.request.method === "POST") {
    try {
      const formData = await Astro2.request.formData();
      const name = formData.get("name")?.toString() || "";
      const type = formData.get("type")?.toString() || "url";
      const content = formData.get("content")?.toString() || "";
      const dotsColor = formData.get("dotsColor")?.toString() || "#000000";
      const bgColor = formData.get("bgColor")?.toString() || "#ffffff";
      if (!name.trim()) {
        errorMessage = "Please enter a name for your QR code";
      } else if (!content.trim()) {
        errorMessage = "Please enter content for your QR code";
      } else {
        let contentObj = {};
        if (type === "url") {
          contentObj = { url: content };
        } else if (type === "email") {
          contentObj = { email: content };
        } else if (type === "sms") {
          contentObj = { number: content };
        } else {
          contentObj = { text: content };
        }
        const styling = {
          dotsType: "square",
          dotsColor,
          bgColor,
          cornerSquareType: "square",
          cornerSquareColor: dotsColor,
          cornerDotType: "square",
          cornerDotColor: dotsColor
        };
        const { error } = await supabase.from("qrcodes").insert({
          user_id: user.id,
          name,
          type,
          content: contentObj,
          styling,
          mode: "static",
          expirytime: null
        });
        if (error) {
          errorMessage = error.message;
        } else {
          success = true;
          return Astro2.redirect("/dashboard");
        }
      }
    } catch (e) {
      errorMessage = "An unexpected error occurred";
    }
  }
  return renderTemplate`${renderComponent($$result, "MainLayout", $$MainLayout, { "title": "Create QR Code - QuickQR" }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="create-container"> <div class="create-header"> <a href="/dashboard" class="back-link"> <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"> <line x1="19" y1="12" x2="5" y2="12"></line> <polyline points="12 19 5 12 12 5"></polyline> </svg>
Back to Dashboard
</a> <h1>Create QR Code</h1> </div> ${errorMessage && renderTemplate`<div class="error-message">${errorMessage}</div>`} <form class="create-form" method="POST"> <div class="form-section"> <h2>Content Type</h2> <div class="type-selector"> <label class="type-option"> <input type="radio" name="type" value="url" checked> <span class="type-card"> <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"> <circle cx="12" cy="12" r="10"></circle> <line x1="2" y1="12" x2="22" y2="12"></line> <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path> </svg> <span>Link</span> </span> </label> <label class="type-option"> <input type="radio" name="type" value="email"> <span class="type-card"> <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"> <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path> <polyline points="22,6 12,13 2,6"></polyline> </svg> <span>Email</span> </span> </label> <label class="type-option"> <input type="radio" name="type" value="sms"> <span class="type-card"> <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"> <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path> </svg> <span>SMS</span> </span> </label> <label class="type-option"> <input type="radio" name="type" value="text"> <span class="type-card"> <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"> <polyline points="4 7 4 4 20 4 20 7"></polyline> <line x1="9" y1="20" x2="15" y2="20"></line> <line x1="12" y1="4" x2="12" y2="20"></line> </svg> <span>Text</span> </span> </label> </div> </div> <div class="form-section"> <h2>Content</h2> <div class="form-group"> <label for="name">QR Code Name</label> <input type="text" id="name" name="name" placeholder="My QR Code" required> </div> <div class="form-group"> <label for="content">Content</label> <input type="text" id="content" name="content" placeholder="https://example.com" required> </div> </div> <div class="form-section"> <h2>Style</h2> <div class="style-grid"> <div class="form-group"> <label for="dotsColor">Dots Color</label> <div class="color-input"> <input type="color" id="dotsColor" name="dotsColor" value="#000000"> <input type="text" name="dotsColor" value="#000000"> </div> </div> <div class="form-group"> <label for="bgColor">Background</label> <div class="color-input"> <input type="color" id="bgColor" name="bgColor" value="#ffffff"> <input type="text" name="bgColor" value="#ffffff"> </div> </div> </div> </div> <button type="submit" class="submit-btn"> <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"> <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path> <polyline points="17 21 17 13 7 13 7 21"></polyline> <polyline points="7 3 7 8 15 8"></polyline> </svg>
Save QR Code
</button> </form> </div> ` })}`;
}, "/home/justin-lo/quickqr/src/pages/create.astro", void 0);

const $$file = "/home/justin-lo/quickqr/src/pages/create.astro";
const $$url = "/create";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Create,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
