// =============================================================================
// client.js — Client-side JavaScript for the public portfolio
// Handles: project loading, filtering, stats counters, video players,
//          mobile nav, view counting, and project detail pages.
// =============================================================================

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// ---------------------------------------------------------------------------
// Init Supabase from config injected by base.liquid
// ---------------------------------------------------------------------------
const { supabaseUrl, supabaseAnonKey } = window.__SITE_CONFIG__ || {};
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
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
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

  return `
<article
  class="card-project group"
  data-category="${project.category}"
  data-id="${project.id}"
  data-project-card
>
  <a
    href="/projects/detail/?id=${project.id}"
    class="block relative overflow-hidden bg-card"
    style="aspect-ratio:16/9;"
    aria-label="Watch ${escHtml(project.title)}"
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
      <div class="w-14 h-14 rounded-full bg-neon-yellow flex items-center justify-center shadow-yellow transform scale-90 group-hover:scale-100 transition-transform duration-300">
        <svg class="w-7 h-7 text-black ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
      </div>
    </div>
    ${project.is_featured ? `<div class="absolute top-3 left-3"><span class="badge bg-neon-red text-white text-2xs font-bold px-2.5 py-1 shadow-neon-sm">★ Featured</span></div>` : ""}
    <div class="absolute top-3 right-3"><span class="badge bg-black/80 text-neon-yellow border border-neon-yellow/30 text-2xs font-bold px-2.5 py-1 backdrop-blur-md">${escHtml(catLabel)}</span></div>
  </a>
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
    title: "Videolozy Showcase Reel — Master Cut",
    description: "Official showcase video for Videolozy.in by lead editor Bhuvan Bhaskar. High-impact commercial and narrative edits featuring kinetic rhythm cuts, color grading, and sound design.",
    category: "commercial",
    video_provider: "youtube",
    video_id: "RLETBH5_NpY",
    thumbnail_url: "https://img.youtube.com/vi/RLETBH5_NpY/maxresdefault.jpg",
    client_name: "Videolozy Showcase",
    year: 2024,
    view_count: 15420,
    is_featured: true,
    sort_order: 1
  },
  {
    id: "demo-showcase-2",
    title: "Rhythm & Motion — Short Film Reel",
    description: "Dynamic narrative sequence showcasing emotional pacing, subtle transitions, and precise shot selection. Highlighted edit from recent narrative productions.",
    category: "short-film",
    video_provider: "youtube",
    video_id: "VJ9VC9OqdAA",
    thumbnail_url: "https://img.youtube.com/vi/VJ9VC9OqdAA/maxresdefault.jpg",
    client_name: "Bhuvan Bhaskar Cut",
    year: 2024,
    view_count: 11890,
    is_featured: true,
    sort_order: 2
  },
  {
    id: "demo-showcase-3",
    title: "Velocity & Brand Experience — Commercial",
    description: "A fast-paced 60-second commercial cut for brand experience. Fast cuts, kinetic typography, and deep color grading drive high-energy visual engagement.",
    category: "commercial",
    video_provider: "youtube",
    video_id: "AGFlQ4ViDCA",
    thumbnail_url: "https://img.youtube.com/vi/AGFlQ4ViDCA/maxresdefault.jpg",
    client_name: "Apex Global",
    year: 2024,
    view_count: 9640,
    is_featured: true,
    sort_order: 3
  },
  {
    id: "demo-showcase-4",
    title: "Echoes of Memory — Music Video",
    description: "Official music video edit for 'Echoes of Memory'. A dreamlike visual journey cut synchronously to shifting ambient soundscapes and beats.",
    category: "music-video",
    video_provider: "youtube",
    video_id: "RLETBH5_NpY",
    thumbnail_url: "https://img.youtube.com/vi/RLETBH5_NpY/hqdefault.jpg",
    client_name: "Luna Wave Records",
    year: 2023,
    view_count: 7850,
    is_featured: false,
    sort_order: 4
  },
  {
    id: "demo-showcase-5",
    title: "Visual Architecture — Feature Documentary",
    description: "Feature-length documentary edit exploring modern urban architecture and acoustic design across international capitals.",
    category: "documentary",
    video_provider: "youtube",
    video_id: "VJ9VC9OqdAA",
    thumbnail_url: "https://img.youtube.com/vi/VJ9VC9OqdAA/hqdefault.jpg",
    client_name: "BBC Natural History",
    year: 2023,
    view_count: 6320,
    is_featured: false,
    sort_order: 5
  },
  {
    id: "demo-showcase-6",
    title: "The Precision Frame — Fashion Campaign",
    description: "High-end luxury fashion campaign cut to pulse-driven synth score. Every frame lands precisely on rhythm for maximum brand impact.",
    category: "commercial",
    video_provider: "youtube",
    video_id: "AGFlQ4ViDCA",
    thumbnail_url: "https://img.youtube.com/vi/AGFlQ4ViDCA/hqdefault.jpg",
    client_name: "Vogue Studios",
    year: 2024,
    view_count: 5910,
    is_featured: false,
    sort_order: 6
  }
];

// =============================================================================
// 3D PARALLAX HOVER CARD MOVEMENT
// =============================================================================
function initParallaxCards() {
  const cards = document.querySelectorAll(".card-project");
  if (!cards.length) return;

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

async function loadAndRenderProjects() {
  const grid       = document.getElementById("projects-grid");
  const noResults  = document.getElementById("no-results");
  const countEl    = document.getElementById("filter-count");

  if (!grid) return;

  // Show skeleton while loading
  grid.innerHTML = Array.from({ length: 6 }).map(() => `
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
    let projects = [];

    if (supabase) {
      const { data, error } = await supabase
        .from("projects")
        .select("id, title, description, category, video_provider, video_id, thumbnail_url, client_name, year, view_count, is_featured, sort_order")
        .order("sort_order", { ascending: true });

      if (!error && data?.length) {
        projects = data;
      }
    }

    if (!projects.length) {
      projects = DEFAULT_PROJECTS;
    }

    // Store globally for filtering
    window.__PROJECTS__ = projects;

    renderFilteredProjects("all");

  } catch (err) {
    console.error("[client.js] Failed to load projects from Supabase, using showcase default:", err.message);
    window.__PROJECTS__ = DEFAULT_PROJECTS;
    renderFilteredProjects("all");
  }
}

function renderFilteredProjects(category = "all") {
  const grid      = document.getElementById("projects-grid");
  const noResults = document.getElementById("no-results");
  const countEl   = document.getElementById("filter-count");
  const projects  = window.__PROJECTS__ || [];

  if (!grid) return;

  const filtered = category === "all"
    ? projects
    : projects.filter((p) => p.category === category);

  if (countEl) countEl.textContent = `${filtered.length} project${filtered.length !== 1 ? "s" : ""}`;

  if (filtered.length === 0) {
    grid.innerHTML = "";
    if (noResults) noResults.classList.remove("hidden");
    return;
  }

  if (noResults) noResults.classList.add("hidden");
  grid.innerHTML = filtered.map(renderProjectCard).join("");
  initParallaxCards();
}

// =============================================================================
// FILTER BAR — Category buttons
// =============================================================================
function initFilterBar() {
  const filterBtns = document.querySelectorAll(".filter-btn");
  if (!filterBtns.length) return;

  // Debounce helper
  let debounceTimer;

  filterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const category = btn.dataset.category;

      // Update active state
      filterBtns.forEach((b) => {
        b.classList.remove("filter-btn--active", "bg-neon-yellow", "border-neon-yellow", "text-black", "bg-neon-red", "border-neon-red", "text-white");
        b.setAttribute("aria-pressed", "false");
        b.style.boxShadow = "";
      });
      btn.classList.add("filter-btn--active");
      btn.setAttribute("aria-pressed", "true");

      // Debounced filter render
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        renderFilteredProjects(category);
      }, 50);
    });
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
            <button class="relative z-10 w-20 h-20 rounded-full bg-neon-red flex items-center justify-center shadow-neon transform transition-all duration-300 group-hover:scale-110 group-hover:shadow-neon-lg" aria-label="Play ${escHtml(project.title)}" data-play-btn>
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
