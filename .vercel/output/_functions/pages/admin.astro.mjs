import { e as createComponent, f as createAstro, k as renderComponent, r as renderTemplate, m as maybeRenderHead, h as addAttribute } from '../chunks/astro/server_Z1ggZnD5.mjs';
import 'piccolore';
import { $ as $$MainLayout } from '../chunks/MainLayout_D_v9-u5d.mjs';
/* empty css                                 */
export { renderers } from '../renderers.mjs';

const $$Astro = createAstro();
const $$Admin = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Admin;
  const { supabase } = await import('../chunks/MainLayout_D_v9-u5d.mjs').then(n => n.a);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Astro2.redirect("/auth/signin");
  }
  const { data: profile } = await supabase.from("profiles").select("admin").eq("id", user.id).single();
  if (!profile?.admin) {
    return Astro2.redirect("/dashboard");
  }
  const { data: qrCodes, error: qrError } = await supabase.from("qrcodes").select("*, profiles(email)").order("created_at", { ascending: false }).limit(100);
  const { data: abuseIncidents, error: abuseError } = await supabase.from("abuse_incidents").select("*").is("resolved_at", null).order("created_at", { ascending: false }).limit(100);
  return renderTemplate`${renderComponent($$result, "MainLayout", $$MainLayout, { "title": "Admin - QuickQR" }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="admin-container"> <div class="admin-header"> <div class="header-icon"> <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"> <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path> </svg> </div> <div class="header-text"> <h1>Admin Panel</h1> <p>Manage all QR codes and monitor abuse</p> </div> </div> <div class="admin-stats"> <div class="stat-card"> <div class="stat-value">${qrCodes?.length || 0}</div> <div class="stat-label">Total QR Codes</div> </div> <div class="stat-card"> <div class="stat-value">${qrCodes?.reduce((sum, qr) => sum + (qr.scan_count || 0), 0) || 0}</div> <div class="stat-label">Total Scans</div> </div> <div class="stat-card abuse"> <div class="stat-value">${abuseIncidents?.length || 0}</div> <div class="stat-label">Open Incidents</div> </div> </div> <div class="admin-section"> <div class="section-header"> <h2>Abuse Incidents</h2> <span class="badge">${abuseIncidents?.length || 0}</span> </div> ${abuseError && renderTemplate`<div class="error-message"> <p>Error loading abuse incidents: ${abuseError.message}</p> </div>`} ${!abuseError && (!abuseIncidents || abuseIncidents.length === 0) && renderTemplate`<div class="empty-state"> <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"> <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path> <polyline points="22 4 12 14.01 9 11.01"></polyline> </svg> <p>No unresolved abuse incidents</p> </div>`} ${abuseIncidents && abuseIncidents.length > 0 && renderTemplate`<div class="incidents-table"> <table> <thead> <tr> <th>User</th> <th>Type</th> <th>Severity</th> <th>Evidence</th> <th>Date</th> <th>Actions</th> </tr> </thead> <tbody> ${abuseIncidents.map((incident) => renderTemplate`<tr> <td>${incident.user_id || "Anonymous"}</td> <td> <span class="type-badge"> ${incident.type.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")} </span> </td> <td> <span${addAttribute(`severity-badge ${incident.severity}`, "class")}> ${incident.severity.charAt(0).toUpperCase() + incident.severity.slice(1)} </span> </td> <td class="evidence-cell"> ${JSON.stringify(incident.evidence).substring(0, 40)}...
</td> <td>${new Date(incident.created_at).toLocaleDateString()}</td> <td> <form${addAttribute(`/api/resolve-incident?id=${incident.id}`, "action")} method="POST"> <button type="submit" class="resolve-btn">Resolve</button> </form> </td> </tr>`)} </tbody> </table> </div>`} </div> <div class="admin-section"> <div class="section-header"> <h2>All QR Codes</h2> <span class="badge">${qrCodes?.length || 0}</span> </div> ${qrError && renderTemplate`<div class="error-message"> <p>Error loading QR codes: ${qrError.message}</p> </div>`} ${!qrError && qrCodes && qrCodes.length > 0 && renderTemplate`<div class="qrcodes-table"> <table> <thead> <tr> <th>Name</th> <th>Owner</th> <th>Type</th> <th>Scans</th> <th>Created</th> </tr> </thead> <tbody> ${qrCodes.map((qr) => renderTemplate`<tr> <td class="name-cell">${qr.name || "Unnamed"}</td> <td>${qr.profiles?.email || "Unknown"}</td> <td>${qr.type?.toUpperCase() || "QR"}</td> <td>${qr.scan_count || 0}</td> <td>${new Date(qr.created_at).toLocaleDateString()}</td> </tr>`)} </tbody> </table> </div>`} </div> </div> ` })}`;
}, "/home/justin-lo/quickqr/src/pages/admin.astro", void 0);

const $$file = "/home/justin-lo/quickqr/src/pages/admin.astro";
const $$url = "/admin";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Admin,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
