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
    s === "hero"   ? "w-auto h-48 sm:h-56"
  : s === "splash" ? "w-64 sm:w-80 h-auto"
  :                  "w-auto h-10";

  // SVG faithfully recreated from the actual Videolozy logo:
  // - Big "V" mark: silver/white left arm + dark film-strip right arm
  // - Orange play-button triangle in the V notch at top
  // - "VIDEO" (white) + "LOZY" (amber) bold wordmark
  // - "AUDIO AND VIDEO PRODUCTION" subtitle with decorative rules
  const svg = `<svg viewBox="0 0 520 520" fill="none" xmlns="http://www.w3.org/2000/svg"
  class="${cls}" aria-label="Videolozy Logo" role="img">
  <defs>
    <!-- Silver gradient for left arm -->
    <linearGradient id="vl-silver" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"   stop-color="#FFFFFF"/>
      <stop offset="45%"  stop-color="#D4D4D4"/>
      <stop offset="100%" stop-color="#8C8C8C"/>
    </linearGradient>
    <!-- Film-strip dark gradient for right arm -->
    <linearGradient id="vl-film" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"   stop-color="#5A5A5A"/>
      <stop offset="40%"  stop-color="#333333"/>
      <stop offset="100%" stop-color="#1A1A1A"/>
    </linearGradient>
    <!-- Sheen on outer edge of right arm -->
    <linearGradient id="vl-sheen" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"   stop-color="#7A7A7A"/>
      <stop offset="100%" stop-color="#3A3A3A"/>
    </linearGradient>
    <!-- Amber/orange gradient for play button -->
    <linearGradient id="vl-amber" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%"   stop-color="#FFC845"/>
      <stop offset="100%" stop-color="#E07800"/>
    </linearGradient>
  </defs>

  <!-- =====================================================
       LEFT ARM of the V  (silver / white metallic)
       Outer-left: (58,12) → (222,288)
       Inner-right: (148,12) → (248,288)
       ===================================================== -->
  <polygon
    points="58,12 148,12 248,288 222,288"
    fill="url(#vl-silver)"
  />
  <!-- Subtle inner-edge highlight bevel -->
  <polygon
    points="136,12 148,12 248,288 238,288"
    fill="rgba(255,255,255,0.28)"
  />

  <!-- =====================================================
       RIGHT ARM of the V  (dark film-strip)
       Inner-left: (362,12) → (272,288)
       Outer-right: (454,12) → (298,288)
       ===================================================== -->
  <!-- Main body -->
  <polygon
    points="362,12 454,12 298,288 272,288"
    fill="url(#vl-film)"
  />
  <!-- Outer-edge sheen strip (rightmost ~18px of arm) -->
  <polygon
    points="440,12 454,12 298,288 287,288"
    fill="url(#vl-sheen)"
  />

  <!-- Film sprocket holes  ─  7 rectangular perforations
       along the outer (right) edge of the right arm.
       Each hole is rotated ~-30° to follow the arm's diagonal. -->
  <g fill="#111111" opacity="0.88">
    <rect x="423" y="22"  width="20" height="11" rx="2" transform="rotate(-30 423 22)"/>
    <rect x="407" y="58"  width="20" height="11" rx="2" transform="rotate(-30 407 58)"/>
    <rect x="391" y="94"  width="20" height="11" rx="2" transform="rotate(-30 391 94)"/>
    <rect x="375" y="130" width="20" height="11" rx="2" transform="rotate(-30 375 130)"/>
    <rect x="359" y="166" width="20" height="11" rx="2" transform="rotate(-30 359 166)"/>
    <rect x="343" y="202" width="20" height="11" rx="2" transform="rotate(-30 343 202)"/>
    <rect x="327" y="238" width="20" height="11" rx="2" transform="rotate(-30 327 238)"/>
  </g>

  <!-- =====================================================
       ORANGE PLAY-BUTTON TRIANGLE
       Sits in the V-notch at the top, between the two arms.
       Points to the right like a media play button.
       ===================================================== -->
  <polygon
    points="160,22 160,94 212,58"
    fill="url(#vl-amber)"
  />

  <!-- =====================================================
       WORDMARK  —  "VIDEO" white + "LOZY" amber
       ===================================================== -->
  <text
    x="68" y="372"
    font-family="'Arial Black','Arial',Impact,sans-serif"
    font-size="72"
    font-weight="900"
    letter-spacing="3"
    fill="#FFFFFF"
  >VIDEO</text>
  <text
    x="297" y="372"
    font-family="'Arial Black','Arial',Impact,sans-serif"
    font-size="72"
    font-weight="900"
    letter-spacing="3"
    fill="#F0A000"
  >LOZY</text>

  <!-- =====================================================
       SUBTITLE — decorative rules + tagline
       ===================================================== -->
  <line x1="68"  y1="394" x2="112" y2="394" stroke="#777" stroke-width="1.5"/>
  <text
    x="260" y="399"
    text-anchor="middle"
    font-family="Arial,sans-serif"
    font-size="13"
    font-weight="400"
    letter-spacing="4"
    fill="#888888"
  >AUDIO AND VIDEO PRODUCTION</text>
  <line x1="408" y1="394" x2="452" y2="394" stroke="#777" stroke-width="1.5"/>
</svg>`;

  return svg;
}

/** Infinite scrolling brand collaboration strip */
export function brandStrip() {
  const dot = `<div class="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-yellow-400/40" aria-hidden="true"></div>`;

  const brands = [
    {
      name: "Capture Stories",
      svg: [
        `<svg viewBox="0 0 200 90" fill="none" xmlns="http://www.w3.org/2000/svg" class="h-14 w-auto">`,
        `<text x="10" y="58" font-family="Georgia,serif" font-size="52" font-style="italic" font-weight="700" fill="white" letter-spacing="-2">Capture</text>`,
        `<text x="52" y="78" font-family="Arial,sans-serif" font-size="13" font-weight="600" letter-spacing="6" fill="white" opacity="0.85">STORIES</text>`,
        `</svg>`,
      ].join(""),
    },
    {
      name: "Heaven Production",
      svg: [
        `<svg viewBox="0 0 260 90" fill="none" xmlns="http://www.w3.org/2000/svg" class="h-14 w-auto">`,
        `<defs><linearGradient id="bwg" x1="0" y1="0" x2="0" y2="1">`,
        `<stop offset="0%" stop-color="#E0D8C8"/><stop offset="100%" stop-color="#8A8070"/>`,
        `</linearGradient></defs>`,
        `<path d="M8,48 C15,30 28,22 42,28 C34,35 28,42 26,52 C20,46 14,44 8,48Z" fill="url(#bwg)" opacity="0.9"/>`,
        `<path d="M14,53 C24,37 40,29 54,35 C44,41 38,49 36,59 C28,51 20,49 14,53Z" fill="url(#bwg)" opacity="0.7"/>`,
        `<path d="M252,48 C245,30 232,22 218,28 C226,35 232,42 234,52 C240,46 246,44 252,48Z" fill="url(#bwg)" opacity="0.9"/>`,
        `<path d="M246,53 C236,37 220,29 206,35 C216,41 222,49 224,59 C232,51 240,49 246,53Z" fill="url(#bwg)" opacity="0.7"/>`,
        `<ellipse cx="130" cy="18" rx="14" ry="5" stroke="#E0D8C8" stroke-width="2" fill="none" opacity="0.8"/>`,
        `<text x="130" y="55" text-anchor="middle" font-family="Georgia,serif" font-size="32" font-style="italic" font-weight="700" fill="#EEE8D8">Heaven</text>`,
        `<text x="130" y="72" text-anchor="middle" font-family="Arial,sans-serif" font-size="11" font-weight="800" letter-spacing="5" fill="#E0D8C8" opacity="0.85">PRODUCTION</text>`,
        `</svg>`,
      ].join(""),
    },
    {
      name: "Art &amp; Culture Dept., Govt. of Bihar",
      svg: [
        `<svg viewBox="0 0 220 90" fill="none" xmlns="http://www.w3.org/2000/svg" class="h-14 w-auto">`,
        `<defs><linearGradient id="bgold" x1="0" y1="0" x2="1" y2="1">`,
        `<stop offset="0%" stop-color="#D4AF37"/><stop offset="100%" stop-color="#C17F24"/>`,
        `</linearGradient></defs>`,
        `<g transform="translate(18,5)">`,
        `<rect x="16" y="50" width="18" height="5" rx="1" fill="url(#bgold)"/>`,
        `<rect x="21" y="20" width="8" height="32" rx="1" fill="url(#bgold)"/>`,
        `<ellipse cx="25" cy="20" rx="12" ry="5" fill="url(#bgold)"/>`,
        `<rect x="14" y="14" width="22" height="6" rx="1" fill="url(#bgold)"/>`,
        `<path d="M10,14 Q14,6 18,10 Q14,12 10,14Z" fill="url(#bgold)"/>`,
        `<path d="M40,14 Q36,6 32,10 Q36,12 40,14Z" fill="url(#bgold)"/>`,
        `<circle cx="25" cy="8" r="5" stroke="url(#bgold)" stroke-width="1.5" fill="none"/>`,
        `<line x1="25" y1="3" x2="25" y2="13" stroke="url(#bgold)" stroke-width="1"/>`,
        `<line x1="20" y1="8" x2="30" y2="8" stroke="url(#bgold)" stroke-width="1"/>`,
        `</g>`,
        `<text x="72" y="32" font-family="sans-serif" font-size="13" font-weight="600" fill="url(#bgold)">कला एवं संस्कृति विभाग</text>`,
        `<text x="72" y="50" font-family="Arial,sans-serif" font-size="11" font-weight="600" fill="white" opacity="0.9">Art &amp; Culture Dept.</text>`,
        `<text x="72" y="65" font-family="Arial,sans-serif" font-size="10" fill="white" opacity="0.6">Govt. of Bihar</text>`,
        `</svg>`,
      ].join(""),
    },
    {
      name: "BackBenchers Entertainment",
      svg: [
        `<svg viewBox="0 0 180 90" fill="none" xmlns="http://www.w3.org/2000/svg" class="h-14 w-auto">`,
        `<defs><linearGradient id="bbb" x1="0" y1="0" x2="0" y2="1">`,
        `<stop offset="0%" stop-color="#888"/><stop offset="100%" stop-color="#222233"/>`,
        `</linearGradient></defs>`,
        `<rect x="12" y="6" width="6" height="54" rx="2" fill="#444"/>`,
        `<rect x="13" y="10" width="4" height="3" rx="1" fill="#111"/>`,
        `<rect x="13" y="17" width="4" height="3" rx="1" fill="#111"/>`,
        `<rect x="13" y="24" width="4" height="3" rx="1" fill="#111"/>`,
        `<rect x="13" y="31" width="4" height="3" rx="1" fill="#111"/>`,
        `<rect x="13" y="38" width="4" height="3" rx="1" fill="#111"/>`,
        `<text x="18" y="52" font-family="Arial Black,Impact,sans-serif" font-size="52" font-weight="900" fill="url(#bbb)">B</text>`,
        `<rect x="86" y="6" width="6" height="54" rx="2" fill="#444"/>`,
        `<rect x="87" y="10" width="4" height="3" rx="1" fill="#111"/>`,
        `<rect x="87" y="17" width="4" height="3" rx="1" fill="#111"/>`,
        `<rect x="87" y="24" width="4" height="3" rx="1" fill="#111"/>`,
        `<rect x="87" y="31" width="4" height="3" rx="1" fill="#111"/>`,
        `<rect x="87" y="38" width="4" height="3" rx="1" fill="#111"/>`,
        `<text x="92" y="52" font-family="Arial Black,Impact,sans-serif" font-size="52" font-weight="900" fill="url(#bbb)">B</text>`,
        `<text x="90" y="82" text-anchor="middle" font-family="Arial Black,sans-serif" font-size="10" font-weight="900" letter-spacing="2" fill="white">BACKBENCHERS ENT.</text>`,
        `</svg>`,
      ].join(""),
    },
    {
      name: "The Shades",
      svg: [
        `<svg viewBox="0 0 260 70" fill="none" xmlns="http://www.w3.org/2000/svg" class="h-12 w-auto">`,
        `<defs><filter id="brf">`,
        `<feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="4" seed="2" result="n"/>`,
        `<feDisplacementMap in="SourceGraphic" in2="n" scale="2" xChannelSelector="R" yChannelSelector="G"/>`,
        `</filter></defs>`,
        `<text x="12" y="52" font-family="Impact,Arial Black,sans-serif" font-size="46" font-weight="900" font-style="italic" letter-spacing="3" fill="#C8C8C8" filter="url(#brf)">THE SHADES</text>`,
        `</svg>`,
      ].join(""),
    },
  ];

  const items = brands
    .map(
      (b) =>
        `<div class="brand-logo-item flex-shrink-0 flex items-center justify-center" role="listitem" title="${b.name}">${b.svg}</div>${dot}`
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
