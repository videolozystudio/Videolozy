// =============================================================================
// svgShortcodes.js — Eleventy shortcodes for SVG-heavy components
//
// Defining SVG content in JS (not Liquid templates) prevents Eleventy's
// Liquid parser from tokenizing SVG path data, which causes OOM crashes.
// =============================================================================

/** @param {string} size - "header" | "hero" | "splash" */
export function videolozyLogo(size) {
  const s = size || "header";
  const cls =
    s === "hero"   ? "w-auto h-64 sm:h-80 lg:h-96 max-w-[90vw]"
  : s === "splash" ? "w-64 sm:w-80 h-auto"
  :                  "w-auto h-10";

  // Replaced manual SVG paths with the actual uploaded logo image.
  // Creating a 1:1 replica of a 3D rendered image with complex gradients,
  // shading, and textures purely in SVG code is not feasible.
  // We use the exact image provided.
  return `<img src="/assets/images/videolozy-logo.png" alt="Videolozy Logo" class="${cls} object-contain" style="image-rendering: high-quality; image-rendering: -webkit-optimize-contrast;" />`;
}

/** Infinite scrolling brand collaboration strip */
export function brandStrip() {
  const dot = `<div class="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-yellow-400/40" aria-hidden="true"></div>`;

  const brands = [
    {
      name: "Capture Stories",
      img: '<img src="/assets/images/brands/capture-stories.jpg" alt="Capture Stories" class="h-14 w-auto object-contain rounded-md" />',
    },
    {
      name: "Heaven Production",
      img: '<img src="/assets/images/brands/heaven-production.jpg" alt="Heaven Production" class="h-14 w-auto object-contain rounded-md" />',
    },
    {
      name: "Art & Culture Dept., Govt. of Bihar",
      img: '<img src="/assets/images/brands/bihar-govt.jpg" alt="Art & Culture Dept., Govt. of Bihar" class="h-14 w-auto object-contain rounded-md" />',
    },
    {
      name: "BackBenchers Entertainment",
      img: '<img src="/assets/images/brands/backbenchers.jpg" alt="BackBenchers Entertainment" class="h-14 w-auto object-contain rounded-md" />',
    },
    {
      name: "The Shades",
      img: '<img src="/assets/images/brands/the-shades.png" alt="The Shades" class="h-14 w-auto object-contain rounded-md" />',
    },
  ];

  const items = brands
    .map(
      (b) =>
        `<div class="brand-logo-item flex-shrink-0 flex items-center justify-center" role="listitem" title="${b.name}">${b.img}</div>${dot}`
    )
    .join("");

  const css = [
    `.brand-marquee-outer{width:100%}`,
    `.brand-marquee-track{display:flex;align-items:center;gap:4rem;width:max-content;will-change:transform;animation:brand-scroll 30s linear infinite}`,
    `.brand-marquee-track:hover{animation-play-state:paused}`,
    `@keyframes brand-scroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}`,
    `.brand-logo-item{opacity:.65;transition:opacity .3s ease}`,
    `.brand-logo-item:hover{opacity:1}`,
    `.brand-fade-left{background:linear-gradient(to right,#050505,transparent)}`,
    `.brand-fade-right{background:linear-gradient(to left,#050505,transparent)}`,
  ].join("");

  const js = `(function(){var t=document.getElementById('brand-marquee-track');if(!t)return;Array.from(t.children).forEach(function(c){t.appendChild(c.cloneNode(true))});})();`;

  return [
    `<section class="py-10 relative overflow-hidden border-y border-white/10" aria-label="Brand collaborations">`,
    `<div class="text-center mb-6"><span class="text-2xs font-bold tracking-[0.25em] uppercase text-gray-500">Trusted Collaborations</span></div>`,
    `<div class="brand-fade-left absolute inset-y-0 left-0 w-24 z-10 pointer-events-none" aria-hidden="true"></div>`,
    `<div class="brand-fade-right absolute inset-y-0 right-0 w-24 z-10 pointer-events-none" aria-hidden="true"></div>`,
    `<div class="brand-marquee-outer overflow-hidden" role="list" aria-label="Collaborating brands">`,
    `<div id="brand-marquee-track" class="brand-marquee-track flex items-center gap-16">${items}</div>`,
    `</div>`,
    `<style>${css}</style>`,
    `<script>${js}<\/script>`,
    `</section>`,
  ].join("");
}
