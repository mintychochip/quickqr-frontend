import { e as createComponent, k as renderComponent, r as renderTemplate, h as addAttribute, m as maybeRenderHead } from '../chunks/astro/server_Z1ggZnD5.mjs';
import 'piccolore';
import { $ as $$MainLayout } from '../chunks/MainLayout_D_v9-u5d.mjs';
/* empty css                                   */
export { renderers } from '../renderers.mjs';

var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(raw || cooked.slice()) }));
var _a;
const $$Pricing = createComponent(($$result, $$props, $$slots) => {
  const tiers = [
    {
      name: "Free",
      description: "Perfect for trying out QuickQR",
      scanRange: "0 - 1,000",
      pricePerScan: "$0",
      features: ["1,000 scans per month", "Basic QR code generation", "Standard analytics", "Community support"],
      cta: "Get Started",
      popular: false
    },
    {
      name: "Starter",
      description: "Great for small businesses",
      scanRange: "1,001 - 10,000",
      pricePerScan: "$0.005",
      features: ["Up to 10,000 scans/month", "Custom QR designs", "Advanced analytics", "Email support", "API access"],
      cta: "Get Started",
      popular: false
    },
    {
      name: "Growth",
      description: "Most popular for growing teams",
      scanRange: "10,001 - 100,000",
      pricePerScan: "$0.003",
      features: ["Up to 100,000 scans/month", "All Starter features", "Bulk QR generation", "Priority support", "Team collaboration", "Custom domains"],
      cta: "Get Started",
      popular: true
    },
    {
      name: "Scale",
      description: "For high-volume operations",
      scanRange: "100,001 - 1M",
      pricePerScan: "$0.001",
      features: ["Up to 1M scans/month", "All Growth features", "Dedicated account manager", "99.9% uptime SLA", "Advanced security", "White-label options"],
      cta: "Get Started",
      popular: false
    },
    {
      name: "Enterprise",
      description: "Custom solutions at scale",
      scanRange: "1M+",
      pricePerScan: "Custom",
      features: ["Unlimited scans", "All Scale features", "Custom integrations", "On-premise deployment", "Dedicated infrastructure", "Custom SLA"],
      cta: "Contact Sales",
      popular: false
    }
  ];
  const faqs = [
    {
      question: "What counts as a scan?",
      answer: "Each time someone scans your QR code with their device, it counts as one scan. Duplicate scans from the same device within 24 hours are counted separately."
    },
    {
      question: "Can I switch between tiers?",
      answer: "Absolutely! Tiers are automatic based on your monthly usage. If you have 5,000 scans one month and 50,000 the next, you'll automatically be billed at the appropriate rate for each month."
    },
    {
      question: "Is there a minimum commitment?",
      answer: "No! There are no contracts or commitments. You can start with the free tier and only pay when you exceed 1,000 scans per month. Cancel anytime."
    },
    {
      question: "What happens if I exceed my current tier?",
      answer: "Your service continues uninterrupted. You'll automatically move to the next tier and be billed at the lower per-scan rate. You'll receive a notification when approaching tier limits."
    },
    {
      question: "How does Enterprise pricing work?",
      answer: "Enterprise plans are customized based on your specific needs, including volume discounts, custom features, and dedicated support. Contact our sales team for a personalized quote."
    }
  ];
  return renderTemplate`${renderComponent($$result, "MainLayout", $$MainLayout, { "title": "Pricing - QuickQR" }, { "default": ($$result2) => renderTemplate(_a || (_a = __template([" ", '<div class="pricing-page"> <div class="pricing-container"> <!-- Hero Section --> <section class="pricing-hero"> <div style="text-align: center; margin-bottom: 4rem;"> <div class="pricing-badge"> <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg> <span>Pay-as-you-go pricing</span> </div> <h1 class="pricing-hero-title">Simple, Transparent Pricing</h1> <p class="pricing-hero-subtitle">\nOnly pay for what you use. No hidden fees, no commitments.\n            Scale effortlessly as your needs grow.\n</p> </div> <!-- Pricing Table --> <div class="pricing-table-section"> <div class="pricing-table"> <!-- Table Header --> <div class="pricing-table-header"> <h3>Tier</h3> <h3>Scan Range</h3> <h3>Price/Scan</h3> </div> <!-- Table Rows --> <div class="pricing-table-body"> ', ' </div> </div> <!-- CTA below table --> <div class="pricing-table-cta"> <a href="/auth/signup" class="btn-primary">\nGet Started\n<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"></path></svg> </a> <p class="pricing-table-note">Start with 1,000 free scans per month. No credit card required.</p> </div> </div> <!-- How it works --> <div class="how-it-works"> <div class="how-it-works-box"> <h2 class="how-it-works-title">How Pay-as-you-go Works</h2> <div class="how-it-works-grid"> <div class="how-it-works-step"> <div class="how-it-works-icon"> <span>1</span> </div> <h3>Create QR Codes</h3> <p>Generate unlimited QR codes for free. No charges for creation.</p> </div> <div class="how-it-works-step"> <div class="how-it-works-icon"> <span>2</span> </div> <h3>Track Scans</h3> <p>We count each scan of your QR codes in real-time.</p> </div> <div class="how-it-works-step"> <div class="how-it-works-icon"> <span>3</span> </div> <h3>Pay Only for Usage</h3> <p>Automatically billed at the end of each month based on total scans.</p> </div> </div> <div class="how-it-works-footer"> <p>The more you use, the less you pay per scan. Your price automatically decreases as you move to higher tiers.</p> </div> </div> </div> </section> <!-- FAQ Section --> <div class="faq-section"> <h2 class="faq-title">Frequently Asked Questions</h2> <div class="faq-list"> ', ` </div> </div> <!-- Final CTA Section --> <div class="pricing-final-cta"> <div class="pricing-final-cta-box"> <h2>Ready to get started?</h2> <p>Create your first QR code today. Start with 1,000 free scans per month.</p> <a href="/auth/signup" class="btn-primary">
Create Free Account
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"></path></svg> </a> </div> </div> </div> </div> <script>
    function toggleFaq(index) {
      const answer = document.getElementById(\`faq-answer-\${index}\`);
      const button = document.querySelector(\`#faq-\${index} .faq-question\`);
      const chevron = document.querySelector(\`#faq-\${index} .faq-chevron\`);

      if (answer.classList.contains('faq-answer-open')) {
        answer.classList.remove('faq-answer-open');
        answer.classList.add('faq-answer-closed');
        button.classList.remove('faq-question-open');
        chevron.classList.remove('faq-question-open');
      } else {
        answer.classList.remove('faq-answer-closed');
        answer.classList.add('faq-answer-open');
        button.classList.add('faq-question-open');
        chevron.classList.add('faq-question-open');
      }
    }
  <\/script> `], [" ", '<div class="pricing-page"> <div class="pricing-container"> <!-- Hero Section --> <section class="pricing-hero"> <div style="text-align: center; margin-bottom: 4rem;"> <div class="pricing-badge"> <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg> <span>Pay-as-you-go pricing</span> </div> <h1 class="pricing-hero-title">Simple, Transparent Pricing</h1> <p class="pricing-hero-subtitle">\nOnly pay for what you use. No hidden fees, no commitments.\n            Scale effortlessly as your needs grow.\n</p> </div> <!-- Pricing Table --> <div class="pricing-table-section"> <div class="pricing-table"> <!-- Table Header --> <div class="pricing-table-header"> <h3>Tier</h3> <h3>Scan Range</h3> <h3>Price/Scan</h3> </div> <!-- Table Rows --> <div class="pricing-table-body"> ', ' </div> </div> <!-- CTA below table --> <div class="pricing-table-cta"> <a href="/auth/signup" class="btn-primary">\nGet Started\n<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"></path></svg> </a> <p class="pricing-table-note">Start with 1,000 free scans per month. No credit card required.</p> </div> </div> <!-- How it works --> <div class="how-it-works"> <div class="how-it-works-box"> <h2 class="how-it-works-title">How Pay-as-you-go Works</h2> <div class="how-it-works-grid"> <div class="how-it-works-step"> <div class="how-it-works-icon"> <span>1</span> </div> <h3>Create QR Codes</h3> <p>Generate unlimited QR codes for free. No charges for creation.</p> </div> <div class="how-it-works-step"> <div class="how-it-works-icon"> <span>2</span> </div> <h3>Track Scans</h3> <p>We count each scan of your QR codes in real-time.</p> </div> <div class="how-it-works-step"> <div class="how-it-works-icon"> <span>3</span> </div> <h3>Pay Only for Usage</h3> <p>Automatically billed at the end of each month based on total scans.</p> </div> </div> <div class="how-it-works-footer"> <p>The more you use, the less you pay per scan. Your price automatically decreases as you move to higher tiers.</p> </div> </div> </div> </section> <!-- FAQ Section --> <div class="faq-section"> <h2 class="faq-title">Frequently Asked Questions</h2> <div class="faq-list"> ', ` </div> </div> <!-- Final CTA Section --> <div class="pricing-final-cta"> <div class="pricing-final-cta-box"> <h2>Ready to get started?</h2> <p>Create your first QR code today. Start with 1,000 free scans per month.</p> <a href="/auth/signup" class="btn-primary">
Create Free Account
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"></path></svg> </a> </div> </div> </div> </div> <script>
    function toggleFaq(index) {
      const answer = document.getElementById(\\\`faq-answer-\\\${index}\\\`);
      const button = document.querySelector(\\\`#faq-\\\${index} .faq-question\\\`);
      const chevron = document.querySelector(\\\`#faq-\\\${index} .faq-chevron\\\`);

      if (answer.classList.contains('faq-answer-open')) {
        answer.classList.remove('faq-answer-open');
        answer.classList.add('faq-answer-closed');
        button.classList.remove('faq-question-open');
        chevron.classList.remove('faq-question-open');
      } else {
        answer.classList.remove('faq-answer-closed');
        answer.classList.add('faq-answer-open');
        button.classList.add('faq-question-open');
        chevron.classList.add('faq-question-open');
      }
    }
  <\/script> `])), maybeRenderHead(), tiers.map((tier) => renderTemplate`<div${addAttribute(`pricing-tier ${tier.popular ? "pricing-tier-popular" : ""}`, "class")}> ${tier.popular && renderTemplate`<div class="pricing-popular-badge"> <span>Most Popular</span> </div>`} <div> <div class="pricing-tier-name-row"> <h3 class="pricing-tier-name">${tier.name}</h3> ${tier.popular && renderTemplate`<div class="pricing-tier-name-popular"> <span>Popular</span> </div>`} </div> <p class="pricing-tier-desc">${tier.description}</p> </div> <div class="pricing-tier-range"> <span class="pricing-tier-range-label">Range:</span> ${tier.scanRange} </div> <div class="pricing-tier-price"> <span class="pricing-tier-price-label">Price:</span> <span class="pricing-tier-price-value">${tier.pricePerScan}</span> ${tier.pricePerScan !== "Custom" && tier.pricePerScan !== "$0" && renderTemplate`<span class="pricing-tier-price-unit">/scan</span>`} </div> </div>`), faqs.map((faq, index) => renderTemplate`<div class="faq-item"${addAttribute(`faq-${index}`, "id")}> <button class="faq-question"${addAttribute(`toggleFaq(${index})`, "onclick")}> <h3>${faq.question}</h3> <svg class="faq-chevron" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"></path></svg> </button> <div class="faq-answer faq-answer-closed"${addAttribute(`faq-answer-${index}`, "id")}> <p>${faq.answer}</p> </div> </div>`)) })}`;
}, "/home/justin-lo/quickqr/src/pages/pricing.astro", void 0);

const $$file = "/home/justin-lo/quickqr/src/pages/pricing.astro";
const $$url = "/pricing";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Pricing,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
