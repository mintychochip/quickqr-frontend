<script lang="ts">
  import Card from '@/lib/components/ui/card.svelte';
</script>

<section class="px-6 pb-6 md:px-10" aria-label="How quickqr.app stays free">
  <div class="mx-auto grid max-w-[1120px] gap-3 md:grid-cols-3">
    <Card class="gap-0 p-3">
      <svg viewBox="0 0 320 168" class="h-auto w-full" role="img" aria-label="A black card with a small QR and a lime mark">
        <rect width="320" height="168" rx="22" fill="var(--secondary)" />
        <rect x="18" y="18" width="132" height="132" rx="28" fill="var(--ink)" />
        <rect x="36" y="36" width="34" height="34" rx="8" fill="#f7f7f5" />
        <rect x="44" y="44" width="18" height="18" rx="4" fill="#111113" />
        <rect x="49" y="49" width="8" height="8" rx="2" fill="#d7ff3c" />
        <rect x="78" y="36" width="14" height="14" rx="4" fill="#f7f7f5" />
        <rect x="98" y="36" width="14" height="14" rx="4" fill="#d7ff3c" />
        <rect x="118" y="36" width="14" height="14" rx="4" fill="#f7f7f5" />
        <rect x="78" y="56" width="14" height="14" rx="4" fill="#f7f7f5" />
        <rect x="118" y="56" width="14" height="14" rx="4" fill="#f7f7f5" />
        <rect x="36" y="78" width="14" height="14" rx="4" fill="#f7f7f5" />
        <rect x="56" y="78" width="14" height="14" rx="4" fill="#d7ff3c" />
        <rect x="78" y="78" width="34" height="14" rx="4" fill="#f7f7f5" />
        <rect x="118" y="78" width="14" height="14" rx="4" fill="#f7f7f5" />
        <rect x="36" y="98" width="14" height="14" rx="4" fill="#f7f7f5" />
        <rect x="56" y="98" width="14" height="14" rx="4" fill="#f7f7f5" />
        <rect x="98" y="98" width="14" height="14" rx="4" fill="#d7ff3c" />
        <rect x="118" y="118" width="14" height="14" rx="4" fill="#f7f7f5" />
        <rect x="36" y="118" width="34" height="14" rx="7" fill="#d7ff3c" />
        <text x="176" y="78" fill="var(--foreground)" font-family="Geist Variable, ui-sans-serif, sans-serif" font-size="22" font-weight="600" letter-spacing="-0.8">$0</text>
        <text x="176" y="104" fill="var(--muted-foreground)" font-family="Geist Variable, ui-sans-serif, sans-serif" font-size="13">every month</text>
      </svg>
      <div class="px-3 pt-3 pb-2">
        <h2 class="text-base font-medium tracking-[-0.03em]">Free QR codes forever</h2>
        <p class="mt-1 text-sm leading-relaxed text-muted-foreground">
          Print it once. The code stays live without a trial clock or a monthly bill.
        </p>
      </div>
    </Card>

    <Card class="gap-0 p-3">
      <svg viewBox="0 0 320 168" class="h-auto w-full" role="img" aria-label="A printed code beside a destination you can edit">
        <rect width="320" height="168" rx="22" fill="var(--secondary)" />
        <rect x="18" y="28" width="118" height="112" rx="24" fill="#ffffff" stroke="#e6e6ea" />
        <rect x="34" y="44" width="28" height="28" rx="6" fill="#111113" />
        <rect x="40" y="50" width="16" height="16" rx="3" fill="#ffffff" />
        <rect x="45" y="55" width="6" height="6" rx="1.5" fill="#111113" />
        <rect x="70" y="44" width="10" height="10" rx="2" fill="#111113" />
        <rect x="84" y="44" width="10" height="10" rx="2" fill="#111113" />
        <rect x="98" y="44" width="10" height="10" rx="2" fill="#d7ff3c" />
        <rect x="70" y="58" width="10" height="10" rx="2" fill="#111113" />
        <rect x="98" y="58" width="10" height="10" rx="2" fill="#111113" />
        <rect x="34" y="80" width="50" height="8" rx="4" fill="#e6e6ea" />
        <rect x="34" y="96" width="74" height="8" rx="4" fill="#111113" />
        <rect x="34" y="112" width="40" height="8" rx="4" fill="#e6e6ea" />
        <path d="M156 84h28" stroke="#d7ff3c" stroke-width="4" stroke-linecap="round" />
        <path d="M176 74l12 10-12 10" stroke="var(--foreground)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none" />
        <rect x="196" y="46" width="106" height="76" rx="18" fill="#111113" />
        <text x="210" y="74" fill="#ffffff" fill-opacity="0.55" font-family="Geist Mono Variable, ui-monospace, monospace" font-size="10">/r/menu</text>
        <rect x="210" y="86" width="76" height="18" rx="9" fill="#d7ff3c" />
        <text x="220" y="99" fill="#111113" font-family="Geist Mono Variable, ui-monospace, monospace" font-size="10">new url</text>
      </svg>
      <div class="px-3 pt-3 pb-2">
        <h2 class="text-base font-medium tracking-[-0.03em]">Change it after you print</h2>
        <p class="mt-1 text-sm leading-relaxed text-muted-foreground">
          The symbol on the menu stays. The destination behind it does not have to.
        </p>
      </div>
    </Card>

    <Card class="gap-0 p-3">
      <svg viewBox="0 0 320 168" class="h-auto w-full" role="img" aria-label="A scan chart in lime on a black card">
        <rect width="320" height="168" rx="22" fill="var(--secondary)" />
        <rect x="18" y="18" width="284" height="132" rx="28" fill="#111113" />
        <text x="36" y="46" fill="#ffffff" fill-opacity="0.55" font-family="Geist Variable, ui-sans-serif, sans-serif" font-size="11" letter-spacing="1.4">SCANS</text>
        <text x="36" y="74" fill="#d7ff3c" font-family="Geist Variable, ui-sans-serif, sans-serif" font-size="28" font-weight="600" letter-spacing="-1">128</text>
        <path d="M150 112c18-8 28-28 46-30 16-2 22 16 40 12 14-3 22-22 40-28" stroke="#d7ff3c" stroke-width="4" stroke-linecap="round" fill="none" />
        <path d="M150 112c18-8 28-28 46-30 16-2 22 16 40 12 14-3 22-22 40-28V124H150Z" fill="#d7ff3c" fill-opacity="0.18" />
        <circle cx="196" cy="82" r="5" fill="#d7ff3c" />
        <circle cx="276" cy="66" r="5" fill="#ffffff" />
      </svg>
      <div class="px-3 pt-3 pb-2">
        <h2 class="text-base font-medium tracking-[-0.03em]">See who scanned</h2>
        <p class="mt-1 text-sm leading-relaxed text-muted-foreground">
          Counts and device mix sit next to the code, without a separate analytics plan.
        </p>
      </div>
    </Card>
  </div>
</section>
