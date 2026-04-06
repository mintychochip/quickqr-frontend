import { e as createComponent, f as createAstro, k as renderComponent, r as renderTemplate, m as maybeRenderHead, h as addAttribute } from '../chunks/astro/server_Z1ggZnD5.mjs';
import 'piccolore';
import { $ as $$MainLayout } from '../chunks/MainLayout_BufbuezT.mjs';
/* empty css                                     */
export { renderers } from '../renderers.mjs';

const $$Astro = createAstro();
const $$Dashboard = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Dashboard;
  const { supabase } = await import('../chunks/MainLayout_BufbuezT.mjs').then(n => n.a);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Astro2.redirect("/auth/signin");
  }
  const { data: qrCodes, error } = await supabase.from("qrcodes").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100);
  const userEmail = user.email;
  return renderTemplate`${renderComponent($$result, "MainLayout", $$MainLayout, { "title": "Dashboard - QuickQR" }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="dashboard-container"> <div class="dashboard-header"> <div class="header-content"> <h1>Welcome back</h1> <p>${userEmail}</p> </div> <a href="/create" class="create-btn"> <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"> <line x1="12" y1="5" x2="12" y2="19"></line> <line x1="5" y1="12" x2="19" y2="12"></line> </svg>
Create QR Code
</a> </div> <div class="dashboard-stats"> <div class="stat-card"> <div class="stat-value">${qrCodes?.length || 0}</div> <div class="stat-label">Total QR Codes</div> </div> <div class="stat-card"> <div class="stat-value">${qrCodes?.reduce((sum, qr) => sum + (qr.scan_count || 0), 0) || 0}</div> <div class="stat-label">Total Scans</div> </div> <div class="stat-card"> <div class="stat-value">${qrCodes?.filter((qr) => qr.mode === "dynamic").length || 0}</div> <div class="stat-label">Dynamic Codes</div> </div> </div> <div class="qr-list-section"> <div class="section-header"> <h2>Your QR Codes</h2> </div> ${error && renderTemplate`<div class="error-message"> <p>Error loading QR codes: ${error.message}</p> </div>`} ${!error && (!qrCodes || qrCodes.length === 0) && renderTemplate`<div class="empty-state"> <div class="empty-icon"> <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"> <rect x="3" y="3" width="7" height="7"></rect> <rect x="14" y="3" width="7" height="7"></rect> <rect x="14" y="14" width="7" height="7"></rect> <rect x="3" y="14" width="7" height="7"></rect> </svg> </div> <h3>No QR codes yet</h3> <p>Create your first QR code to get started</p> <a href="/create" class="create-btn">Create QR Code</a> </div>`} ${qrCodes && qrCodes.length > 0 && renderTemplate`<div class="qr-grid"> ${qrCodes.map((qr) => renderTemplate`<div class="qr-card"> <div class="qr-preview"> <div class="qr-placeholder"> <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"> <rect x="3" y="3" width="7" height="7"></rect> <rect x="14" y="3" width="7" height="7"></rect> <rect x="14" y="14" width="7" height="7"></rect> <rect x="3" y="14" width="7" height="7"></rect> </svg> </div> </div> <div class="qr-info"> <h3 class="qr-name">${qr.name || "Unnamed QR"}</h3> <p class="qr-type">${qr.type?.toUpperCase() || "QR"}</p> <p class="qr-scans">${qr.scan_count || 0} scans</p> </div> <div class="qr-actions"> <a${addAttribute(`/r/${qr.id}`, "href")} class="action-btn view" title="View"> <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"> <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path> <circle cx="12" cy="12" r="3"></circle> </svg> </a> </div> </div>`)} </div>`} </div> </div> ` })}`;
}, "/home/justin-lo/quickqr/src/pages/dashboard.astro", void 0);

const $$file = "/home/justin-lo/quickqr/src/pages/dashboard.astro";
const $$url = "/dashboard";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Dashboard,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
