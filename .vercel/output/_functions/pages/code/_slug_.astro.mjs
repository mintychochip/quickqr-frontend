import { e as createComponent, f as createAstro } from '../../chunks/astro/server_Z1ggZnD5.mjs';
import 'piccolore';
import 'clsx';
import { s as supabase } from '../../chunks/MainLayout_BrB7dypR.mjs';
export { renderers } from '../../renderers.mjs';

const $$Astro = createAstro();
const $$slug = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$slug;
  const { slug } = Astro2.params;
  if (!slug) {
    return Astro2.redirect("/");
  }
  const { data: qrCode, error: fetchError } = await supabase.from("qrcodes").select("type, content, expirytime").eq("id", slug).single();
  if (fetchError || !qrCode) {
    return Astro2.redirect("/?error=not_found");
  }
  if (qrCode.expirytime && new Date(qrCode.expirytime) < /* @__PURE__ */ new Date()) {
    return Astro2.redirect("/?error=expired");
  }
  supabase.rpc("increment_scan_count", { qr_id: slug }).then(({ error: rpcError }) => {
    if (rpcError) console.error("Failed to increment scan count:", rpcError);
  });
  const content = qrCode.content;
  let redirectUrl = null;
  switch (qrCode.type) {
    case "url":
      redirectUrl = content.url;
      break;
    case "email":
      redirectUrl = `mailto:${content.email}`;
      break;
    case "phone":
      redirectUrl = `tel:${content.phone}`;
      break;
    case "sms":
      redirectUrl = `sms:${content.number}`;
      break;
    case "location":
      redirectUrl = `https://www.google.com/maps?q=${content.latitude},${content.longitude}`;
      break;
    default:
      redirectUrl = null;
  }
  if (!redirectUrl) {
    return Astro2.redirect("/?error=invalid_type");
  }
  const detectOS = () => {
    const ua = Astro2.request.headers.get("user-agent") || "";
    const uaLower = ua.toLowerCase();
    if (uaLower.includes("iphone") || uaLower.includes("ipad")) return "iOS";
    if (uaLower.includes("android")) return "Android";
    if (uaLower.includes("macintosh") || uaLower.includes("mac os")) return "iOS";
    if (uaLower.includes("win")) return "Windows";
    if (uaLower.includes("linux")) return "Linux";
    return "Other";
  };
  const os = detectOS();
  supabase.from("scans").insert({
    qrcode_id: slug,
    os
  }).then(({ error: scanError }) => {
    if (scanError) console.error("Failed to record scan:", scanError);
  });
  return Astro2.redirect(redirectUrl);
}, "/home/justin-lo/quickqr/src/pages/code/[slug].astro", void 0);

const $$file = "/home/justin-lo/quickqr/src/pages/code/[slug].astro";
const $$url = "/code/[slug]";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$slug,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
