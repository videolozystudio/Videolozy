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
    {
      name: "Golden Lion Motion Pictures",
      img: '<img src="/assets/images/brands/golden-lion.jpg" alt="Golden Lion Motion Pictures" class="h-14 w-auto object-contain rounded-md" />',
    },
    {
      name: "Pro Care Hospital",
      img: '<img src="/assets/images/brands/pro-care.jpg" alt="Pro Care Hospital" class="h-14 w-auto object-contain rounded-md" />',
    },
    {
      name: "Patna Book Fair",
      img: '<img src="/assets/images/brands/patna-book-fair.jpg" alt="Patna Book Fair" class="h-14 w-auto object-contain rounded-md" />',
    },
  ];

  const items = brands
    .map(
      (b) =>
        `<div class="brand-logo-item flex-shrink-0 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform duration-300" role="button" aria-label="View ${b.name}" data-brand-name="${b.name}" data-brand-img='${b.img.replace(/'/g, "&apos;")}'>${b.img}</div>${dot}`
    )
    .join("");

  const css = [
    `.brand-marquee-outer{width:100%}`,
    `.brand-marquee-track{display:flex;align-items:center;gap:4rem;width:max-content;will-change:transform;animation:brand-scroll 30s linear infinite}`,
    `.brand-marquee-track:hover{animation-play-state:paused}`,
    `@keyframes brand-scroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}`,
    `.brand-logo-item{opacity:.65;transition:all .3s ease}`,
    `.brand-logo-item:hover{opacity:1;filter:drop-shadow(0 0 10px rgba(0,229,255,0.5))}`,
    `.brand-fade-left{background:linear-gradient(to right,#050505,transparent)}`,
    `.brand-fade-right{background:linear-gradient(to left,#050505,transparent)}`,
    `#brand-modal.show{opacity:1;pointer-events:auto;}`,
    `#brand-modal.show #brand-modal-card{transform:scale(1) perspective(1000px) rotateX(0) rotateY(0);}`,
    `#brand-modal-content img { height: 10rem !important; width: auto; max-width: 100%; margin: 0 auto; object-fit: contain; }`,
    `@media (min-width: 640px) { #brand-modal-content img { height: 16rem !important; } }`
  ].join("");

  const js = `(function(){
    var t=document.getElementById('brand-marquee-track');
    if(!t)return;
    Array.from(t.children).forEach(function(c){t.appendChild(c.cloneNode(true))});
    
    var m = document.getElementById('brand-modal');
    var mc = document.getElementById('brand-modal-card');
    var mcontent = document.getElementById('brand-modal-content');
    
    document.body.addEventListener('click', function(e) {
      var item = e.target.closest('.brand-logo-item');
      if(item) {
        mcontent.innerHTML = '<div class="mb-4 sm:mb-6 w-full flex justify-center">' + item.getAttribute('data-brand-img') + '</div><h3 class="text-xl sm:text-2xl font-bold text-white px-2">' + item.getAttribute('data-brand-name') + '</h3>';
        m.classList.add('show');
      } else if (e.target.closest('#brand-modal-close') || e.target === m) {
        m.classList.remove('show');
      }
    });

    mc.addEventListener('mousemove', function(e) {
      var rect = mc.getBoundingClientRect();
      var x = e.clientX - rect.left;
      var y = e.clientY - rect.top;
      var xPct = (x / rect.width - 0.5) * 20; // -10 to 10 deg
      var yPct = (y / rect.height - 0.5) * -20;
      mc.style.transform = 'scale(1) perspective(1000px) rotateY(' + xPct + 'deg) rotateX(' + yPct + 'deg)';
    });
    mc.addEventListener('mouseleave', function() {
      mc.style.transform = 'scale(1) perspective(1000px) rotateY(0deg) rotateX(0deg)';
    });
  })();`;

  return [
    `<section class="py-6 relative overflow-hidden" aria-label="Brand collaborations">`,
    `<div class="text-center mb-6"><span class="text-2xs font-bold tracking-[0.25em] uppercase text-gray-500">Trusted Clients</span></div>`,
    `<div class="brand-fade-left absolute inset-y-0 left-0 w-16 sm:w-24 z-10 pointer-events-none" aria-hidden="true"></div>`,
    `<div class="brand-fade-right absolute inset-y-0 right-0 w-16 sm:w-24 z-10 pointer-events-none" aria-hidden="true"></div>`,
    `<div class="brand-marquee-outer overflow-hidden" role="list" aria-label="Collaborating brands">`,
    `<div id="brand-marquee-track" class="brand-marquee-track flex items-center gap-12 sm:gap-16">${items}</div>`,
    `</div>`,
    `
    <div id="brand-modal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md opacity-0 pointer-events-none transition-all duration-300 px-4">
      <div id="brand-modal-card" class="white-glass-card rounded-2xl p-6 sm:p-10 max-w-lg w-full transform scale-90 transition-transform duration-200 ease-out relative shadow-[0_0_40px_rgba(0,229,255,0.3)] border border-cyan-500/50">
         <button id="brand-modal-close" class="absolute top-3 right-4 sm:top-4 sm:right-5 text-gray-400 hover:text-white text-3xl font-bold leading-none" aria-label="Close modal">&times;</button>
         <div id="brand-modal-content" class="relative z-10 text-center flex flex-col items-center w-full">
         </div>
      </div>
    </div>
    `,
    `<style>${css}</style>`,
    `<script>${js}<\/script>`,
    `</section>`,
  ].join("");
}
