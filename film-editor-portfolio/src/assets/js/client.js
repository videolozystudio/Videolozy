// =============================================================================
// client.js — Client-side JavaScript for the public portfolio
// Handles: project loading, filtering, stats counters, video players,
//          mobile nav, view counting, and project detail pages.
// =============================================================================

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { inject } from "https://cdn.jsdelivr.net/npm/@vercel/analytics@1/+esm";

// Initialize Vercel Web Analytics
inject();

// ---------------------------------------------------------------------------
// Init Supabase from config injected by base.liquid
// ---------------------------------------------------------------------------
const rawConfig = window.__SITE_CONFIG__ || {};
const rawUrl = rawConfig.supabaseUrl || "";
const supabaseUrl = rawUrl
  .trim()
  .replace(/^["']|["']$/g, "")
  .replace(/\/+$/, "")
  .replace(/\/(rest|auth|storage)\/v\d+.*$/i, "")
  .replace(/\/+$/, "");

const supabaseAnonKey = (rawConfig.supabaseAnonKey || "").trim().replace(/^["']|["']$/g, "");

const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } })
  : null;


// ---------------------------------------------------------------------------
// Utility: Format a number with commas
// ---------------------------------------------------------------------------
function fmtNum(n) {
  return Number(n || 0).toLocaleString("en-US");
}

// ---------------------------------------------------------------------------
// Utility: Slugify a string
// ---------------------------------------------------------------------------
function slugify(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ---------------------------------------------------------------------------
// Utility: Category label
// ---------------------------------------------------------------------------
function categoryLabel(cat) {
  const map = {
    commercial:   "Commercial",
    "short-film":  "Short Film",
    "music-video": "Music Video",
    documentary:  "Documentary",
  };
  return map[cat] || cat;
}

// ---------------------------------------------------------------------------
// Utility: Build embed URL
// ---------------------------------------------------------------------------
function embedUrl(videoId, provider) {
  if (provider === "youtube") {
    return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&autoplay=1`;
  }
  if (provider === "vimeo") {
    return `https://player.vimeo.com/video/${videoId}?dnt=1&byline=0&portrait=0&title=0&autoplay=1`;
  }
  return "";
}

// ---------------------------------------------------------------------------
// Utility: Thumbnail URL
// ---------------------------------------------------------------------------
function thumbnailUrl(videoId, provider, custom = "") {
  if (custom) return custom;
  if (provider === "youtube") {
    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  }
  return "/assets/images/placeholder-thumb.svg";
}

// =============================================================================
// TOAST NOTIFICATION SYSTEM
// =============================================================================
function showToast(message, type = "info", duration = 4000) {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const icons = {
    success: `<svg class="w-5 h-5 flex-shrink-0 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`,
    error:   `<svg class="w-5 h-5 flex-shrink-0 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>`,
    info:    `<svg class="w-5 h-5 flex-shrink-0 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
    warning: `<svg class="w-5 h-5 flex-shrink-0 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
  };

  const toast = document.createElement("div");
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `${icons[type] || ""}<span>${message}</span>`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = "toast-out 0.3s ease-in forwards";
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// =============================================================================
// HEADER — Scroll-aware backdrop + mobile menu
// =============================================================================
function initHeader() {
  const header   = document.getElementById("site-header");
  const backdrop = document.getElementById("header-backdrop");
  const toggle   = document.getElementById("mobile-nav-toggle");
  const mobileNav = document.getElementById("mobile-nav");

  if (!header) return;

  // Scroll listener — show backdrop after 50px
  const onScroll = () => {
    const scrolled = window.scrollY > 50;
    if (backdrop) backdrop.style.opacity = scrolled ? "1" : "0";
    header.dataset.scrolled = scrolled;
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Mobile menu toggle
  if (toggle && mobileNav) {
    let isOpen = false;

    const bars = toggle.querySelectorAll(".mobile-bar");

    toggle.addEventListener("click", () => {
      isOpen = !isOpen;
      toggle.setAttribute("aria-expanded", String(isOpen));

      if (isOpen) {
        mobileNav.style.transform    = "translateY(0)";
        mobileNav.style.opacity      = "1";
        mobileNav.style.pointerEvents = "auto";
        mobileNav.setAttribute("aria-hidden", "false");
        // Animate hamburger → X
        bars[0].style.transform = "translateY(6px) rotate(45deg)";
        bars[1].style.opacity   = "0";
        bars[2].style.transform = "translateY(-6px) rotate(-45deg)";
      } else {
        mobileNav.style.transform    = "translateY(-8px)";
        mobileNav.style.opacity      = "0";
        mobileNav.style.pointerEvents = "none";
        mobileNav.setAttribute("aria-hidden", "true");
        // Revert X → hamburger
        bars[0].style.transform = "";
        bars[1].style.opacity   = "";
        bars[2].style.transform = "";
      }
    });

    // Close when a link is clicked
    mobileNav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => toggle.click());
    });
  }
}

// =============================================================================
// ANIMATED STAT COUNTERS (Intersection Observer)
// =============================================================================
function initCounters() {
  const counters = document.querySelectorAll(".stat-counter");
  if (!counters.length) return;

  const animateCounter = (el) => {
    const target  = parseInt(el.dataset.target || "0", 10);
    const display = el.querySelector(".counter-value");
    if (!display) return;

    const duration = 1800;
    const start    = performance.now();

    const step = (timestamp) => {
      const elapsed  = timestamp - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased    = 1 - Math.pow(1 - progress, 3);
      display.textContent = Math.round(eased * target).toLocaleString("en-US");

      if (progress < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 }
  );

  counters.forEach((el) => observer.observe(el));
}

// =============================================================================
// SCROLL ANIMATIONS (Intersection Observer)
// =============================================================================
function initScrollAnimations() {
  const els = document.querySelectorAll(".animate-on-scroll");
  if (!els.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: "0px 0px -60px 0px" }
  );

  els.forEach((el) => observer.observe(el));
}

// =============================================================================
// PROJECT GRID — Load from Supabase & Render
// =============================================================================

// Build a video card HTML string (mirrors video-card.liquid logic)
function renderProjectCard(project) {
  const thumb    = thumbnailUrl(project.video_id, project.video_provider, project.thumbnail_url);
  const slug     = slugify(project.title);
  const catLabel = categoryLabel(project.category);
  const src      = embedUrl(project.video_id, project.video_provider);

  return `
<article
  class="card-project group"
  data-category="${project.category}"
  data-id="${project.id}"
  data-project-card
>
  <div class="relative w-full aspect-video bg-card overflow-hidden">
    <div
      class="absolute inset-0 block cursor-pointer"
      data-video-poster
      data-embed-src="${src}"
      aria-label="Play ${escHtml(project.title)}"
      tabindex="0"
    >
      <img
        src="${escHtml(thumb)}"
        alt="${escHtml(project.title)} — ${escHtml(catLabel)}"
        class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        loading="lazy"
        decoding="async"
        onerror="this.src='/assets/images/placeholder-thumb.svg'"
      />
      <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300"></div>
      <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300" aria-hidden="true">
        <button class="w-14 h-14 rounded-full bg-neon-silver/90 flex items-center justify-center shadow-neon transform scale-90 group-hover:scale-100 transition-transform duration-300" data-play-btn>
          <svg class="w-6 h-6 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
        </button>
      </div>
      ${project.is_featured ? `<div class="absolute top-3 left-3"><span class="badge bg-neon-silver text-white text-2xs px-2.5 py-1 shadow-neon-sm">★ Featured</span></div>` : ""}
      <div class="absolute top-3 right-3"><span class="badge bg-black/60 text-neon-silver border border-white/10 text-2xs font-bold px-2.5 py-1">${escHtml(catLabel)}</span></div>
    </div>
    <iframe class="absolute inset-0 w-full h-full hidden" title="${escHtml(project.title)}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen style="opacity:0; transition:opacity 0.5s;"></iframe>
  </div>
  <div class="p-4 sm:p-5 bg-surface/90">
    <h3 class="font-bold text-white text-base leading-snug mb-1.5 group-hover:text-neon-yellow transition-colors duration-200">
      <a href="/projects/detail/?id=${project.id}">${escHtml(project.title)}</a>
    </h3>
    <div class="flex items-center gap-3 text-xs text-gray-300 mb-3 font-medium">
      ${project.client_name ? `<span class="text-neon-yellow">${escHtml(project.client_name)}</span> •` : ""}
      <span>${project.year}</span>
    </div>
    <p class="text-sm text-gray-300 leading-relaxed line-clamp-2">${escHtml(project.description)}</p>
    <div class="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
      <span class="flex items-center gap-1.5 text-xs text-gray-300">
        <svg class="w-3.5 h-3.5 text-neon-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
        ${fmtNum(project.view_count)} views
      </span>
      <a href="/projects/detail/?id=${project.id}" class="text-xs font-bold text-neon-yellow hover:text-white flex items-center gap-1 transition-colors">
        Watch Reel <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg>
      </a>
    </div>
  </div>
</article>`.trim();
}

function escHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const DEFAULT_PROJECTS = [
  {
    id: "demo-showcase-1",
    title: "India's Got Latent — Show Edit",
    description: "Official comedy show edit featuring fast multi-camera cuts, live audio balancing, and kinetic graphics.",
    category: "commercial",
    video_provider: "youtube",
    video_id: "VJ9VC9OqdAA",
    thumbnail_url: "https://img.youtube.com/vi/VJ9VC9OqdAA/hqdefault.jpg",
    client_name: "Samay Raina",
    year: 2024,
    view_count: 18420,
    is_featured: true,
    sort_order: 1
  },
  {
    id: "demo-showcase-2",
    title: "Ye Dil Tum Bin Kahi — Romantic Narrative",
    description: "A dreamlike romantic sequence cut to classic melody. Pacing and color grading tuned for deep emotional connection.",
    category: "short-film",
    video_provider: "youtube",
    video_id: "AGFlQ4ViDCA",
    thumbnail_url: "https://img.youtube.com/vi/AGFlQ4ViDCA/hqdefault.jpg",
    client_name: "Saregama Music",
    year: 2024,
    view_count: 14890,
    is_featured: true,
    sort_order: 2
  },
  {
    id: "demo-showcase-3",
    title: "Meri Sanson Mein Basa Hai — Music Video",
    description: "Official music video cut featuring Rahat Fateh Ali Khan & Kavya Limaye. Rhythm-driven cuts matched to vocal crescendo.",
    category: "music-video",
    video_provider: "youtube",
    video_id: "RLETBH5_NpY",
    thumbnail_url: "https://img.youtube.com/vi/RLETBH5_NpY/hqdefault.jpg",
    client_name: "Boundless Melodies",
    year: 2024,
    view_count: 22640,
    is_featured: true,
    sort_order: 3
  },
  {
    id: "demo-showcase-4",
    title: "Visual Architecture — Feature Documentary",
    description: "Feature-length documentary edit exploring modern urban architecture and acoustic design across international capitals.",
    category: "documentary",
    video_provider: "youtube",
    video_id: "VJ9VC9OqdAA",
    thumbnail_url: "https://img.youtube.com/vi/VJ9VC9OqdAA/hqdefault.jpg",
    client_name: "BBC Natural History",
    year: 2023,
    view_count: 9850,
    is_featured: false,
    sort_order: 4
  },
  {
    id: "demo-showcase-5",
    title: "The Precision Frame — Fashion Campaign",
    description: "High-end luxury fashion campaign cut to pulse-driven synth score. Every frame lands precisely on rhythm for maximum brand impact.",
    category: "commercial",
    video_provider: "youtube",
    video_id: "AGFlQ4ViDCA",
    thumbnail_url: "https://img.youtube.com/vi/AGFlQ4ViDCA/hqdefault.jpg",
    client_name: "Vogue Studios",
    year: 2024,
    view_count: 8320,
    is_featured: false,
    sort_order: 5
  },
  {
    id: "demo-showcase-6",
    title: "Videolozy Master Cut — Studio Reel",
    description: "Full studio showreel showcasing seamless commercial pacing, sound design, and color grading across agency client projects.",
    category: "commercial",
    video_provider: "youtube",
    video_id: "RLETBH5_NpY",
    thumbnail_url: "https://img.youtube.com/vi/RLETBH5_NpY/hqdefault.jpg",
    client_name: "Videolozy Showcase",
    year: 2024,
    view_count: 12910,
    is_featured: false,
    sort_order: 6
  }
];

// =============================================================================
// PROJECT GRID — HashMap-based filtering + Cursor-based infinite scroll
//
// [FIX 4] Pre-process projects into a Map<category, Project[]> after first load
//         so category filtering is O(1) instead of O(N) Array.filter().
//
// [FIX 5] Cursor-based pagination with IntersectionObserver infinite scroll.
//         First 12 projects load immediately, then more are fetched as the user
//         scrolls toward the sentinel element at the bottom of the grid.
// =============================================================================

const PAGE_SIZE   = 12;
let activeCategory = "all";
let nextCursor     = null;      // sort_order of last loaded project
let isLoadingMore  = false;     // guard against concurrent fetches
let scrollObserver = null;      // IntersectionObserver instance

// [FIX 4] Category hash map: Map<string, Project[]>
// 'all' key holds the full list for total counts
const projectsMap = new Map();

function addToMap(projects) {
  // Always update the 'all' bucket
  const all = projectsMap.get("all") ?? [];
  projectsMap.set("all", [...all, ...projects]);

  // Per-category buckets
  for (const p of projects) {
    const bucket = projectsMap.get(p.category) ?? [];
    bucket.push(p);
    projectsMap.set(p.category, bucket);
  }
}

/**
 * Fetch a page of projects from the API.
 * Uses cursor-based pagination: ?cursor=<sort_order> instead of ?offset=N
 */
async function fetchProjectPage(cursor = null, category = "all") {
  const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
  if (cursor !== null)          params.set("cursor",   String(cursor));
  if (category !== "all")       params.set("category", category);

  const res = await fetch(`/api/projects?${params}`);
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json(); // { data, count, nextCursor }
}

/**
 * Append rendered project cards to the grid.
 */
function appendCards(projects) {
  const grid = document.getElementById("projects-grid");
  if (!grid) return;
  const fragment = document.createDocumentFragment();
  for (const p of projects) {
    const div = document.createElement("div");
    div.innerHTML = renderProjectCard(p).trim();
    fragment.appendChild(div.firstChild);
  }
  grid.appendChild(fragment);
  initParallaxCards(); // re-init tilt on new cards
}

/**
 * Update the filter count label.
 */
function updateCount(n) {
  const el = document.getElementById("filter-count");
  if (el) el.textContent = `${n} project${n !== 1 ? "s" : ""}`;
}

/**
 * Create / reset the IntersectionObserver sentinel for infinite scroll.
 */
function initInfiniteScroll() {
  // Disconnect any existing observer
  if (scrollObserver) scrollObserver.disconnect();

  let sentinel = document.getElementById("scroll-sentinel");
  if (!sentinel) {
    sentinel = document.createElement("div");
    sentinel.id = "scroll-sentinel";
    sentinel.style.cssText = "height:1px;margin-top:48px;";
    const grid = document.getElementById("projects-grid");
    grid?.parentElement?.appendChild(sentinel);
  }

  scrollObserver = new IntersectionObserver(
    async (entries) => {
      if (!entries[0].isIntersecting) return;
      if (isLoadingMore)              return;
      if (nextCursor === null)        { scrollObserver.disconnect(); return; }

      isLoadingMore = true;
      try {
        // [FIX 5] Fetch next page using cursor (O(1) DB index seek, not O(N) scan)
        const { data, nextCursor: nc } = await fetchProjectPage(nextCursor, activeCategory);
        nextCursor = nc;

        if (data?.length) {
          addToMap(data);
          appendCards(data);
          updateCount((projectsMap.get(activeCategory) ?? []).length);
        }

        if (nextCursor === null) scrollObserver.disconnect();
      } catch (err) {
        console.error("[client.js] Infinite scroll error:", err.message);
      } finally {
        isLoadingMore = false;
      }
    },
    { rootMargin: "200px" } // start loading 200px before sentinel is visible
  );

  scrollObserver.observe(sentinel);
}

async function loadAndRenderProjects() {
  const grid = document.getElementById("projects-grid");
  if (!grid) return;

  // Show skeleton while first page loads
  grid.innerHTML = Array.from({ length: PAGE_SIZE }).map(() => `
    <div class="rounded-xl overflow-hidden bg-card border border-border animate-pulse">
      <div class="skeleton aspect-video"></div>
      <div class="p-5 space-y-3">
        <div class="skeleton h-4 w-3/4 rounded"></div>
        <div class="skeleton h-3 w-1/2 rounded"></div>
        <div class="skeleton h-3 w-full rounded"></div>
        <div class="skeleton h-3 w-5/6 rounded"></div>
      </div>
    </div>`).join("");

  try {
    let firstPage;

    if (supabase) {
      firstPage = await fetchProjectPage(null, activeCategory);
    }

    // Fallback to demo data if API unavailable or returns empty
    if (!firstPage?.data?.length) {
      addToMap(DEFAULT_PROJECTS);
      grid.innerHTML = DEFAULT_PROJECTS.map(renderProjectCard).join("");
      updateCount(DEFAULT_PROJECTS.length);
      initParallaxCards();
      return;
    }

    nextCursor = firstPage.nextCursor;
    addToMap(firstPage.data);

    grid.innerHTML = "";
    appendCards(firstPage.data);
    updateCount((projectsMap.get(activeCategory) ?? []).length);

    // Set up infinite scroll only if there are more pages
    if (nextCursor !== null) initInfiniteScroll();

  } catch (err) {
    console.error("[client.js] Failed to load projects — falling back to demo data:", err.message);
    addToMap(DEFAULT_PROJECTS);
    grid.innerHTML = DEFAULT_PROJECTS.map(renderProjectCard).join("");
    updateCount(DEFAULT_PROJECTS.length);
    initParallaxCards();
  }
}

// =============================================================================
// FILTER BAR — O(1) HashMap category lookup
// =============================================================================
function initFilterBar() {
  const filterBtns = document.querySelectorAll(".filter-btn");
  if (!filterBtns.length) return;

  filterBtns.forEach((btn) => {
    btn.addEventListener("click", async () => {
      const category = btn.dataset.category;
      if (category === activeCategory) return; // nothing changed

      activeCategory = category;

      // Update active state
      filterBtns.forEach((b) => {
        b.classList.remove("filter-btn--active", "bg-neon-yellow", "border-neon-yellow",
                            "text-black", "bg-neon-silver", "border-neon-silver", "text-white");
        b.setAttribute("aria-pressed", "false");
        b.style.boxShadow = "";
      });
      btn.classList.add("filter-btn--active");
      btn.setAttribute("aria-pressed", "true");

      const grid      = document.getElementById("projects-grid");
      const noResults = document.getElementById("no-results");

      // [FIX 4] O(1) HashMap lookup — no Array.filter() scan
      const cached = projectsMap.get(category);

      if (cached?.length) {
        // We already have this category loaded — render instantly from cache
        grid.innerHTML = cached.map(renderProjectCard).join("");
        noResults?.classList.add("hidden");
        updateCount(cached.length);
        initParallaxCards();
        // Reset infinite scroll for this category's cursor (use cached data only)
        if (scrollObserver) { scrollObserver.disconnect(); scrollObserver = null; }
        nextCursor = null;
        return;
      }

      // Category not yet cached — fetch first page from API
      grid.innerHTML = `
        <div class="col-span-full flex items-center justify-center py-16">
          <div class="w-8 h-8 rounded-full border-2 border-neon-silver border-t-transparent animate-spin"></div>
        </div>`;

      try {
        const { data, nextCursor: nc } = await fetchProjectPage(null, category);
        nextCursor = nc;

        if (!data?.length) {
          grid.innerHTML = "";
          noResults?.classList.remove("hidden");
          updateCount(0);
          return;
        }

        noResults?.classList.add("hidden");
        addToMap(data);
        grid.innerHTML = "";
        appendCards(data);
        updateCount((projectsMap.get(category) ?? []).length);
        initParallaxCards();

        if (nextCursor !== null) initInfiniteScroll();

      } catch (err) {
        console.error("[client.js] Filter fetch error:", err.message);
        grid.innerHTML = "";
        noResults?.classList.remove("hidden");
        updateCount(0);
      }
    });
  });
}
function initParallaxCards() {
  const cards = document.querySelectorAll(".card-project");
  if (!cards.length) return;

  // Disable 3D tilt on mobile/touch devices for smooth touch scrolling
  const isTouchDevice = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768;
  if (isTouchDevice) return;

  cards.forEach((card) => {
    // Inject specular glare element if not already present
    if (!card.querySelector(".parallax-glare")) {
      const glare = document.createElement("div");
      glare.className = "parallax-glare";
      card.appendChild(glare);
    }

    // Mousemove 3D tilt calculation
    const handleMove = (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      // Calculate rotation angles (max +/- 14 degrees)
      const rotateX = ((y - centerY) / centerY) * -14;
      const rotateY = ((x - centerX) / centerX) * 14;

      card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateZ(12px) scale3d(1.03, 1.03, 1.03)`;
      
      // Dynamic glare positioning
      const glare = card.querySelector(".parallax-glare");
      if (glare) {
        const percentX = (x / rect.width) * 100;
        const percentY = (y / rect.height) * 100;
        glare.style.background = `radial-gradient(circle at ${percentX.toFixed(1)}% ${percentY.toFixed(1)}%, rgba(255,255,255,0.3) 0%, rgba(255,0,64,0.12) 40%, transparent 80%)`;
      }
    };

    const handleLeave = () => {
      card.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px) scale3d(1, 1, 1)";
      const glare = card.querySelector(".parallax-glare");
      if (glare) glare.style.opacity = "0";
    };

    const handleEnter = () => {
      const glare = card.querySelector(".parallax-glare");
      if (glare) glare.style.opacity = "1";
    };

    // Clean old listeners to prevent duplicates
    card.removeEventListener("mousemove", card.__parallaxMove);
    card.removeEventListener("mouseleave", card.__parallaxLeave);
    card.removeEventListener("mouseenter", card.__parallaxEnter);

    card.__parallaxMove  = handleMove;
    card.__parallaxLeave = handleLeave;
    card.__parallaxEnter = handleEnter;

    card.addEventListener("mousemove", handleMove);
    card.addEventListener("mouseleave", handleLeave);
    card.addEventListener("mouseenter", handleEnter);
  });
}



// =============================================================================
// VIDEO PLAYER — Click-to-play poster
// =============================================================================
function initVideoPlayers() {
  document.addEventListener("click", (e) => {
    const playBtn = e.target.closest("[data-play-btn]");
    if (!playBtn) return;

    const poster = playBtn.closest("[data-video-poster]");
    if (!poster) return;

    const embedSrc = poster.dataset.embedSrc;
    if (!embedSrc) return;

    // Find iframe sibling
    const container = poster.parentElement;
    const iframe    = container?.querySelector("iframe");

    if (iframe) {
      iframe.src = embedSrc;
      iframe.classList.remove("hidden");

      // Fade in iframe
      setTimeout(() => {
        iframe.style.opacity = "1";
        poster.style.opacity = "0";
        poster.style.pointerEvents = "none";
      }, 50);
    }
  });
}

// =============================================================================
// PROJECT DETAIL PAGE — Load and render single project
// =============================================================================
async function initProjectPage() {
  const page = document.getElementById("project-page");
  if (!page) return;

  const loading  = document.getElementById("project-loading");
  const content  = document.getElementById("project-content");
  const errorDiv = document.getElementById("project-error");

  // Get project ID from URL query string (?id=UUID)
  const urlParams  = new URLSearchParams(window.location.search);
  const projectId  = urlParams.get("id");

  // Fallback: try to extract slug from URL and match against projects
  const slug = window.location.pathname.split("/").filter(Boolean).pop();

  if (!projectId && !slug) {
    showError();
    return;
  }

  function showError() {
    loading?.classList.add("hidden");
    content?.classList.add("hidden");
    errorDiv?.classList.remove("hidden");
  }

  try {
    let project;

    if (projectId) {
      if (supabase) {
        const { data } = await supabase
          .from("projects")
          .select("*")
          .eq("id", projectId)
          .single();
        if (data) project = data;
      }
      if (!project) {
        project = DEFAULT_PROJECTS.find((p) => p.id === projectId);
      }
    } else {
      let allProjects = [];
      if (supabase) {
        const { data } = await supabase.from("projects").select("*");
        if (data?.length) allProjects = data;
      }
      if (!allProjects.length) allProjects = DEFAULT_PROJECTS;
      project = allProjects.find((p) => slugify(p.title) === slug);
    }

    if (!project) {
      project = DEFAULT_PROJECTS[0];
    }

    // Update page meta
    document.title = `${project.title} — Portfolio`;
    document.getElementById("breadcrumb-title").textContent = project.title;

    // Render player
    const playerContainer = document.getElementById("project-player-container");
    if (playerContainer) {
      const thumb = thumbnailUrl(project.video_id, project.video_provider, project.thumbnail_url);
      const src   = embedUrl(project.video_id, project.video_provider);
      playerContainer.innerHTML = `
        <div class="relative w-full rounded-xl overflow-hidden bg-black shadow-2xl" style="padding-bottom:56.25%;">
          <div class="absolute inset-0 flex items-center justify-center cursor-pointer group" data-video-poster data-embed-src="${src}">
            <img src="${escHtml(thumb)}" alt="${escHtml(project.title)}" class="absolute inset-0 w-full h-full object-cover" loading="eager" />
            <div class="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors duration-300"></div>
            <button class="relative z-10 w-20 h-20 rounded-full bg-neon-silver flex items-center justify-center shadow-neon transform transition-all duration-300 group-hover:scale-110 group-hover:shadow-neon-lg" aria-label="Play ${escHtml(project.title)}" data-play-btn>
              <svg class="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            </button>
          </div>
          <iframe class="absolute inset-0 w-full h-full hidden" title="${escHtml(project.title)}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen style="opacity:0; transition:opacity 0.5s;"></iframe>
        </div>`;
    }

    // Fill metadata
    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val || "—"; };
    setEl("project-title",         project.title);
    setEl("project-client",        project.client_name || "Independent");
    setEl("project-year",          project.year);
    setEl("project-category-text", categoryLabel(project.category));
    setEl("project-platform",      project.video_provider === "youtube" ? "YouTube" : "Vimeo");
    setEl("project-view-count",    fmtNum(project.view_count));

    const descEl = document.getElementById("project-description");
    if (descEl) descEl.innerHTML = escHtml(project.description).replace(/\n/g, "<br/>");

    const catBadge = document.getElementById("project-category-badge");
    if (catBadge) catBadge.textContent = categoryLabel(project.category);

    if (project.is_featured) {
      document.getElementById("project-featured-badge")?.classList.remove("hidden");
    }

    // Show content, hide loading
    loading?.classList.add("hidden");
    content?.classList.remove("hidden");

    // Increment view count (fire and forget)
    fetch(`/api/projects/${project.id}/views`, { method: "POST" }).catch(() => {});

    // Load prev/next navigation
    loadProjectNavigation(project);

  } catch (err) {
    console.error("[client.js] Project page error:", err.message);
    showError();
  }
}

async function loadProjectNavigation(currentProject) {
  if (!supabase) return;

  const navEl = document.getElementById("project-navigation");
  if (!navEl) return;

  const { data: allProjects } = await supabase
    .from("projects")
    .select("id, title")
    .order("sort_order", { ascending: true });

  if (!allProjects?.length) return;

  const idx  = allProjects.findIndex((p) => p.id === currentProject.id);
  const prev = idx > 0 ? allProjects[idx - 1] : null;
  const next = idx < allProjects.length - 1 ? allProjects[idx + 1] : null;

  if (!prev && !next) return;

  navEl.classList.remove("hidden");

  const prevEl = document.getElementById("nav-prev");
  const nextEl = document.getElementById("nav-next");
  const prevTitle = document.getElementById("nav-prev-title");
  const nextTitle = document.getElementById("nav-next-title");

  if (prev && prevEl) {
    prevEl.href = `/projects/detail/?id=${prev.id}`;
    if (prevTitle) prevTitle.textContent = prev.title;
  } else {
    prevEl?.classList.add("invisible");
  }

  if (next && nextEl) {
    nextEl.href = `/projects/detail/?id=${next.id}`;
    if (nextTitle) nextTitle.textContent = next.title;
  } else {
    nextEl?.classList.add("invisible");
  }
}

// =============================================================================
// ENTRY POINT — Run on DOM ready
// =============================================================================
document.addEventListener("DOMContentLoaded", () => {
  initHeader();
  initCounters();
  initScrollAnimations();
  initFilterBar();
  initVideoPlayers();

  // Detect which page we're on
  const isProjectPage = !!document.getElementById("project-page");
  const isHomepage    = !!document.getElementById("projects-grid");

  if (isProjectPage) {
    initProjectPage();
  }

  if (isHomepage) {
    loadAndRenderProjects();
  }
});
