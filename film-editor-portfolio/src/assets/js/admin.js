// =============================================================================
// admin.js — Admin Panel JavaScript
// Handles: authentication, session guard, CRUD operations, form validation,
//          project list rendering, dashboard stats, settings, toast system.
// =============================================================================

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// ---------------------------------------------------------------------------
// Init Supabase
// ---------------------------------------------------------------------------
const { supabaseUrl, supabaseAnonKey } = window.__SITE_CONFIG__ || {};

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("[admin.js] Missing Supabase configuration.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession:     true,
    autoRefreshToken:   true,
    storageKey:         "filmreel_admin_session",
    detectSessionInUrl: true,
  },
});

// ---------------------------------------------------------------------------
// UTILITIES
// ---------------------------------------------------------------------------
function fmtNum(n) { return Number(n || 0).toLocaleString("en-US"); }

function escHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function categoryLabel(cat) {
  const map = {
    commercial:   "Commercial",
    "short-film":  "Short Film",
    "music-video": "Music Video",
    documentary:  "Documentary",
  };
  return map[cat] || cat;
}

function slugify(str) {
  return String(str || "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ---------------------------------------------------------------------------
// TOAST SYSTEM
// ---------------------------------------------------------------------------
function showToast(message, type = "info", duration = 4500) {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const colorMap = {
    success: "bg-green-500/10 border-green-500/30 text-green-400",
    error:   "bg-red-500/10 border-red-500/30 text-red-400",
    info:    "bg-blue-500/10 border-blue-500/30 text-blue-400",
    warning: "bg-yellow-500/10 border-yellow-500/30 text-yellow-400",
  };

  const iconMap = {
    success: "M5 13l4 4L19 7",
    error:   "M6 18L18 6M6 6l12 12",
    info:    "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    warning: "M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  };

  const toast = document.createElement("div");
  toast.className = `pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border text-sm shadow-2xl backdrop-blur-md max-w-xs ${colorMap[type] || colorMap.info}`;
  toast.style.animation = "toast-in 0.3s ease-out forwards";
  toast.innerHTML = `
    <svg class="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${iconMap[type]}"/>
    </svg>
    <span>${escHtml(message)}</span>`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = "toast-out 0.3s ease-in forwards";
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ---------------------------------------------------------------------------
// LOADING STATE HELPERS
// ---------------------------------------------------------------------------
function setLoading(btn, isLoading, label = "Loading…") {
  if (!btn) return;
  const labelEl   = btn.querySelector(`#${btn.id}-label`) || btn;
  const spinnerEl = btn.querySelector(`#${btn.id}-spinner`);

  btn.disabled = isLoading;

  if (isLoading) {
    if (labelEl !== btn) labelEl.textContent = label;
    spinnerEl?.classList.remove("hidden");
  } else {
    if (labelEl !== btn) labelEl.textContent = labelEl.dataset.originalLabel || labelEl.textContent;
    spinnerEl?.classList.add("hidden");
  }
}

// =============================================================================
// AUTH — Login Page
// =============================================================================
function initLoginPage() {
  const form        = document.getElementById("login-form");
  const emailInput  = document.getElementById("login-email");
  const passInput   = document.getElementById("login-password");
  const btn         = document.getElementById("btn-login");
  const errorDiv    = document.getElementById("login-error");
  const errorMsg    = document.getElementById("login-error-message");
  const togglePass  = document.getElementById("toggle-password");

  if (!form) return;

  // Password visibility toggle
  togglePass?.addEventListener("click", () => {
    const isPass   = passInput.type === "password";
    passInput.type = isPass ? "text" : "password";
  });

  // Redirect if already logged in
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) window.location.replace("/admin/");
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email    = emailInput?.value.trim();
    const password = passInput?.value;

    if (!email || !password) {
      showLoginError("Please enter your email and password.");
      return;
    }

    setLoading(btn, true, "Signing In…");
    hideLoginError();

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) throw error;
      if (!data.session) throw new Error("No session returned.");

      window.location.replace("/admin/");

    } catch (err) {
      const msg = err.message?.includes("Invalid login")
        ? "Incorrect email or password."
        : err.message || "Sign in failed. Please try again.";
      showLoginError(msg);
    } finally {
      setLoading(btn, false);
    }
  });

  function showLoginError(msg) {
    if (errorDiv) errorDiv.classList.remove("hidden");
    if (errorMsg) errorMsg.textContent = msg;
  }

  function hideLoginError() {
    if (errorDiv) errorDiv.classList.add("hidden");
  }
}

// =============================================================================
// AUTH GUARD — Protect all admin pages except login
// =============================================================================
async function initAuthGuard() {
  const isLoginPage = window.location.pathname.includes("/admin/login");
  if (isLoginPage) return; // Login page doesn't need a guard

  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    window.location.replace("/admin/login/");
    return;
  }

  // Fill user info in sidebar
  const userEl   = document.getElementById("admin-user-email");
  const avatarEl = document.getElementById("admin-avatar-letter");

  if (userEl) userEl.textContent = session.user.email;
  if (avatarEl) avatarEl.textContent = (session.user.email?.[0] || "A").toUpperCase();

  // Logout button
  document.getElementById("btn-logout")?.addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.replace("/admin/login/");
  });

  return session;
}

// =============================================================================
// ADMIN SIDEBAR — Mobile toggle
// =============================================================================
function initAdminSidebar() {
  const toggle  = document.getElementById("mobile-menu-toggle");
  const sidebar = document.getElementById("admin-sidebar");
  const overlay = document.getElementById("sidebar-overlay");
  const iconOpen  = document.getElementById("menu-icon-open");
  const iconClose = document.getElementById("menu-icon-close");

  if (!toggle || !sidebar) return;

  let isOpen = false;

  const openSidebar = () => {
    isOpen = true;
    sidebar.style.transform = "translateX(0)";
    overlay.style.opacity   = "1";
    overlay.style.pointerEvents = "auto";
    iconOpen?.classList.add("hidden");
    iconClose?.classList.remove("hidden");
    toggle.setAttribute("aria-expanded", "true");
  };

  const closeSidebar = () => {
    isOpen = false;
    sidebar.style.transform = "translateX(-100%)";
    overlay.style.opacity   = "0";
    overlay.style.pointerEvents = "none";
    iconOpen?.classList.remove("hidden");
    iconClose?.classList.add("hidden");
    toggle.setAttribute("aria-expanded", "false");
  };

  toggle.addEventListener("click", () => isOpen ? closeSidebar() : openSidebar());
  overlay?.addEventListener("click", closeSidebar);
}

// =============================================================================
// DASHBOARD — Load stats + recent projects
// =============================================================================
async function initDashboard() {
  const statsEl          = document.getElementById("dashboard-stats");
  const recentList       = document.getElementById("recent-projects-list");
  const recentEmpty      = document.getElementById("recent-projects-empty");
  const refreshBtn       = document.getElementById("btn-refresh-analytics");

  if (!statsEl && !recentList) return;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  // Fetch via API (auth token in header)
  const fetchStats = async () => {
    const res = await fetch("/api/admin/dashboard", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  };

  try {
    const { data: stats } = await fetchStats();

    // Update stat cards
    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setEl("stat-total-projects",     stats.total);
    setEl("stat-total-views",        fmtNum(stats.totalViews));
    setEl("stat-featured",           stats.featured);
    setEl("stat-most-viewed-title",  stats.mostViewed?.title || "—");
    setEl("stat-most-viewed-count",  fmtNum(stats.mostViewed?.views));

    // Render recent projects
    if (recentList) {
      if (!stats.recentProjects?.length) {
        recentList.innerHTML = "";
        recentEmpty?.classList.remove("hidden");
      } else {
        recentEmpty?.classList.add("hidden");
        recentList.innerHTML = stats.recentProjects.map((p) => `
          <div class="flex items-center gap-4 p-4 hover:bg-card transition-colors">
            <div class="h-12 w-20 rounded-lg bg-void border border-border overflow-hidden flex-shrink-0">
              <img
                src="https://img.youtube.com/vi/${escHtml(p.id)}/default.jpg"
                class="w-full h-full object-cover"
                alt="${escHtml(p.title)}"
                onerror="this.parentElement.innerHTML='<div class=\\'flex items-center justify-center w-full h-full text-text-muted\\'><svg class=\\'w-4 h-4\\' fill=\\'none\\' stroke=\\'currentColor\\' viewBox=\\'0 0 24 24\\'><path stroke-linecap=\\'round\\' stroke-linejoin=\\'round\\' stroke-width=\\'2\\' d=\\'M15 10l4.553-2.069A1 1 0 0121 8.878v6.243a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z\\'/></svg></div>'"
              />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-text-primary truncate">${escHtml(p.title)}</p>
              <p class="text-xs text-text-muted">${categoryLabel(p.category)} · ${fmtNum(p.view_count)} views</p>
            </div>
            ${p.is_featured ? `<span class="badge bg-yellow-500/15 border border-yellow-500/30 text-yellow-400 text-2xs hidden sm:inline-flex">★ Featured</span>` : ""}
            <a href="/admin/projects/edit/?id=${escHtml(p.id)}" class="btn-ghost text-xs px-2.5 py-1.5">Edit</a>
          </div>`).join("");
      }
    }

  } catch (err) {
    console.error("[admin.js] Dashboard error:", err.message);
    showToast("Failed to load dashboard stats.", "error");
  }

  // Refresh analytics button
  refreshBtn?.addEventListener("click", async () => {
    refreshBtn.disabled = true;
    const icon = document.getElementById("refresh-icon");
    icon?.classList.add("animate-spin");

    try {
      await supabase.rpc("refresh_analytics_summary");
      showToast("Analytics refreshed successfully.", "success");
      await fetchStats(); // Re-render stats
    } catch (err) {
      showToast("Failed to refresh analytics.", "error");
    } finally {
      refreshBtn.disabled = false;
      icon?.classList.remove("animate-spin");
    }
  });
}

// =============================================================================
// PROJECT LIST — Load, search, filter, delete
// =============================================================================
const PAGE_SIZE = 15;
let allProjects = [];
let currentPage = 1;
let searchQuery = "";
let categoryFilter = "";
let pendingDeleteId = null;

async function initProjectList() {
  const tableBody = document.getElementById("projects-table-body");
  if (!tableBody) return;

  await loadProjects();

  // Search with debounce
  const searchInput = document.getElementById("project-search");
  let searchTimer;
  searchInput?.addEventListener("input", (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      searchQuery = e.target.value.trim().toLowerCase();
      currentPage = 1;
      renderProjectTable();
    }, 250);
  });

  // Category filter
  document.getElementById("project-category-filter")?.addEventListener("change", (e) => {
    categoryFilter = e.target.value;
    currentPage = 1;
    renderProjectTable();
  });

  // Pagination
  document.getElementById("btn-prev-page")?.addEventListener("click", () => {
    if (currentPage > 1) { currentPage--; renderProjectTable(); }
  });
  document.getElementById("btn-next-page")?.addEventListener("click", () => {
    const filtered = getFilteredProjects();
    const maxPage  = Math.ceil(filtered.length / PAGE_SIZE);
    if (currentPage < maxPage) { currentPage++; renderProjectTable(); }
  });

  // Delete modal handlers
  initDeleteModal();
}

async function loadProjects() {
  const { data, error } = await supabase
    .from("projects")
    .select("id, title, category, video_provider, video_id, thumbnail_url, client_name, year, view_count, is_featured, sort_order, created_at")
    .order("sort_order", { ascending: true });

  if (error) {
    showToast("Failed to load projects.", "error");
    return;
  }

  allProjects = data || [];
  renderProjectTable();
}

function getFilteredProjects() {
  return allProjects.filter((p) => {
    const matchSearch   = !searchQuery || p.title.toLowerCase().includes(searchQuery) || (p.client_name || "").toLowerCase().includes(searchQuery);
    const matchCategory = !categoryFilter || p.category === categoryFilter;
    return matchSearch && matchCategory;
  });
}

function renderProjectTable() {
  const tableBody = document.getElementById("projects-table-body");
  const emptyEl   = document.getElementById("projects-empty-state");
  const countEl   = document.getElementById("table-count");
  const prevBtn   = document.getElementById("btn-prev-page");
  const nextBtn   = document.getElementById("btn-next-page");
  const pageEl    = document.getElementById("page-indicator");

  if (!tableBody) return;

  const filtered  = getFilteredProjects();
  const maxPage   = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  currentPage     = Math.min(currentPage, maxPage);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Pagination controls
  if (countEl)  countEl.textContent = `${filtered.length} project${filtered.length !== 1 ? "s" : ""}`;
  if (pageEl)   pageEl.textContent  = `${currentPage} / ${maxPage}`;
  if (prevBtn)  prevBtn.disabled    = currentPage <= 1;
  if (nextBtn)  nextBtn.disabled    = currentPage >= maxPage;

  if (!filtered.length) {
    tableBody.innerHTML = "";
    emptyEl?.classList.remove("hidden");
    return;
  }

  emptyEl?.classList.add("hidden");

  const thumb = (p) => {
    if (p.thumbnail_url) return p.thumbnail_url;
    if (p.video_provider === "youtube") return `https://img.youtube.com/vi/${p.video_id}/default.jpg`;
    return "/assets/images/placeholder-thumb.webp";
  };

  const categoryColors = {
    commercial:   "bg-blue-500/15 text-blue-400",
    "short-film":  "bg-purple-500/15 text-purple-400",
    "music-video": "bg-pink-500/15 text-pink-400",
    documentary:  "bg-green-500/15 text-green-400",
  };

  tableBody.innerHTML = pageItems.map((p) => `
    <tr class="project-table-row border-b border-border" data-row-id="${p.id}">
      <td class="px-4 py-3">
        <input type="checkbox" class="row-select rounded" data-id="${p.id}" aria-label="Select ${escHtml(p.title)}" />
      </td>
      <td class="px-4 py-3">
        <div class="flex items-center gap-3">
          <img src="${escHtml(thumb(p))}" alt="${escHtml(p.title)}" class="h-10 w-16 object-cover rounded-lg bg-card flex-shrink-0" loading="lazy" onerror="this.style.display='none'" />
          <div class="min-w-0">
            <p class="text-sm font-medium text-text-primary truncate max-w-[200px]">${escHtml(p.title)}</p>
            <p class="text-2xs text-text-muted">${escHtml(p.client_name || "—")}</p>
          </div>
        </div>
      </td>
      <td class="px-4 py-3 hidden md:table-cell">
        <span class="badge text-2xs ${categoryColors[p.category] || "bg-card text-text-muted"}">${categoryLabel(p.category)}</span>
      </td>
      <td class="px-4 py-3 hidden lg:table-cell text-sm text-text-secondary">${p.year}</td>
      <td class="px-4 py-3 hidden lg:table-cell text-sm text-text-secondary">${fmtNum(p.view_count)}</td>
      <td class="px-4 py-3 hidden md:table-cell">
        ${p.is_featured
          ? `<span class="text-yellow-400 text-sm" aria-label="Featured">★</span>`
          : `<span class="text-text-muted text-sm" aria-label="Not featured">—</span>`}
      </td>
      <td class="px-4 py-3 text-right">
        <div class="flex items-center justify-end gap-2">
          <a href="/admin/projects/edit/?id=${p.id}" class="btn-ghost text-xs px-2.5 py-1.5">Edit</a>
          <button
            class="btn-ghost text-xs px-2.5 py-1.5 text-danger hover:bg-danger/10"
            data-delete-id="${p.id}"
            data-delete-title="${escHtml(p.title)}"
            aria-label="Delete ${escHtml(p.title)}"
          >
            Delete
          </button>
        </div>
      </td>
    </tr>`).join("");

  // Wire delete buttons in table
  tableBody.querySelectorAll("[data-delete-id]").forEach((btn) => {
    btn.addEventListener("click", () => openDeleteModal(btn.dataset.deleteId, btn.dataset.deleteTitle));
  });
}

// Delete Modal
function initDeleteModal() {
  const modal     = document.getElementById("delete-confirm-modal");
  const modalBox  = document.getElementById("delete-modal-box");
  const cancelBtn = document.getElementById("btn-cancel-delete");
  const confirmBtn = document.getElementById("btn-confirm-delete");

  if (!modal) return;

  cancelBtn?.addEventListener("click", closeDeleteModal);
  modal.addEventListener("click", (e) => { if (e.target === modal) closeDeleteModal(); });

  confirmBtn?.addEventListener("click", async () => {
    if (!pendingDeleteId) return;

    confirmBtn.disabled = true;
    confirmBtn.textContent = "Deleting…";

    try {
      const { error } = await supabase.from("projects").delete().eq("id", pendingDeleteId);
      if (error) throw error;

      allProjects = allProjects.filter((p) => p.id !== pendingDeleteId);
      renderProjectTable();
      closeDeleteModal();
      showToast("Project deleted successfully.", "success");

    } catch (err) {
      showToast(`Failed to delete project: ${err.message}`, "error");
    } finally {
      confirmBtn.disabled = false;
      confirmBtn.textContent = "Delete";
    }
  });
}

function openDeleteModal(id, title) {
  pendingDeleteId = id;
  const nameEl = document.getElementById("delete-project-name");
  if (nameEl) nameEl.textContent = title;

  const modal   = document.getElementById("delete-confirm-modal");
  const modalBox = document.getElementById("delete-modal-box");
  if (!modal) return;

  modal.style.opacity       = "1";
  modal.style.pointerEvents = "auto";
  if (modalBox) modalBox.style.transform = "scale(1)";
}

function closeDeleteModal() {
  pendingDeleteId = null;
  const modal   = document.getElementById("delete-confirm-modal");
  const modalBox = document.getElementById("delete-modal-box");
  if (!modal) return;

  modal.style.opacity       = "0";
  modal.style.pointerEvents = "none";
  if (modalBox) modalBox.style.transform = "scale(0.95)";
}

// =============================================================================
// PROJECT FORM — Create & Edit
// =============================================================================
async function initProjectForm() {
  const form = document.getElementById("project-form");
  if (!form) return;

  const mode      = form.dataset.mode;
  const projectId = form.dataset.projectId;
  const isEdit    = mode === "edit";

  // Edit mode: fetch project data and pre-fill form
  if (isEdit) {
    await loadProjectForEdit();
  }

  // Thumbnail preview on URL change
  const thumbInput = document.getElementById("field-thumbnail");
  thumbInput?.addEventListener("input", debounce(updateThumbPreview, 500));

  // Description character count
  const descInput  = document.getElementById("field-description");
  const descCount  = document.getElementById("desc-char-count");
  if (descInput && descCount) {
    descCount.textContent = `${descInput.value.length} / 2000`;
    descInput.addEventListener("input", () => {
      descCount.textContent = `${descInput.value.length} / 2000`;
    });
  }

  // Video preview button
  document.getElementById("btn-preview-video")?.addEventListener("click", previewVideo);

  // Delete button (edit mode only)
  document.getElementById("btn-delete-project")?.addEventListener("click", async (e) => {
    const id = e.currentTarget.dataset.projectId;
    if (!id) return;
    if (!confirm("Are you sure you want to delete this project? This cannot be undone.")) return;
    await deleteProjectAndRedirect(id);
  });

  // Form submission
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!validateForm(form)) return;

    const btn = document.getElementById("btn-form-submit");
    setLoading(btn, true, isEdit ? "Updating…" : "Creating…");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated.");

      const payload = collectFormData(form);
      const url     = isEdit ? `/api/projects/${projectId}` : "/api/projects";
      const method  = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Request failed.");

      showToast(
        isEdit ? "Project updated successfully!" : "Project created successfully!",
        "success"
      );

      setTimeout(() => window.location.replace("/admin/projects/"), 1200);

    } catch (err) {
      showToast(`Error: ${err.message}`, "error");
    } finally {
      setLoading(btn, false);
    }
  });
}

async function loadProjectForEdit() {
  const url = new URLSearchParams(window.location.search);
  const id  = url.get("id");
  if (!id) return;

  const loadingEl   = document.getElementById("edit-loading");
  const formEl      = document.getElementById("edit-form-container");
  const errorEl     = document.getElementById("edit-error");
  const titleEl     = document.getElementById("edit-page-title");
  const breadEl     = document.getElementById("edit-breadcrumb-title");
  const previewBtn  = document.getElementById("edit-live-preview-btn");

  try {
    const { data: project, error } = await supabase
      .from("projects")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !project) throw new Error("Project not found.");

    // Update form mode attribute to hold the ID
    const form = document.getElementById("project-form");
    if (form) form.dataset.projectId = id;

    // Set field values
    const f = (fieldId, val) => {
      const el = document.getElementById(fieldId);
      if (!el) return;
      if (el.type === "checkbox") { el.checked = !!val; return; }
      el.value = val || "";
    };

    f("field-title",       project.title);
    f("field-client",      project.client_name);
    f("field-category",    project.category);
    f("field-year",        project.year);
    f("field-video-id",    project.video_id);
    f("field-thumbnail",   project.thumbnail_url);
    f("field-description", project.description);
    f("field-sort-order",  project.sort_order);
    f("field-featured",    project.is_featured);

    // Set video provider radio
    const radio = document.querySelector(`input[name="video_provider"][value="${project.video_provider}"]`);
    if (radio) radio.checked = true;

    // Update UI labels
    if (titleEl) titleEl.textContent = `Edit: ${project.title}`;
    if (breadEl) breadEl.textContent = project.title;

    // Live preview link
    if (previewBtn) {
      previewBtn.href = `/projects/${slugify(project.title)}/?id=${project.id}`;
      previewBtn.classList.remove("hidden");
    }

    // Thumb preview
    updateThumbPreview();

    // Desc char count
    const descCount = document.getElementById("desc-char-count");
    if (descCount) descCount.textContent = `${(project.description || "").length} / 2000`;

    // Show form
    loadingEl?.classList.add("hidden");
    formEl?.classList.remove("hidden");

  } catch (err) {
    loadingEl?.classList.add("hidden");
    errorEl?.classList.remove("hidden");
  }
}

function collectFormData(form) {
  const get   = (id) => document.getElementById(id);
  const radio = form.querySelector('input[name="video_provider"]:checked');

  return {
    title:          get("field-title")?.value.trim()       || "",
    description:    get("field-description")?.value.trim() || "",
    category:       get("field-category")?.value           || "",
    video_provider: radio?.value                           || "youtube",
    video_id:       get("field-video-id")?.value.trim()    || "",
    thumbnail_url:  get("field-thumbnail")?.value.trim()   || "",
    client_name:    get("field-client")?.value.trim()      || "",
    year:           parseInt(get("field-year")?.value, 10) || new Date().getFullYear(),
    is_featured:    get("field-featured")?.checked         || false,
    sort_order:     parseInt(get("field-sort-order")?.value, 10) || 0,
  };
}

function validateForm(form) {
  let valid = true;

  const required = [
    ["field-title",       "error-title",       "Title is required."],
    ["field-category",    "error-category",    "Please select a category."],
    ["field-video-id",    "error-video-id",    "Video ID is required."],
    ["field-description", "error-description", "Description is required."],
    ["field-year",        "error-year",        "Year is required."],
  ];

  required.forEach(([fieldId, errorId, msg]) => {
    const field = document.getElementById(fieldId);
    const errEl = document.getElementById(errorId);
    const val   = field?.value.trim();

    if (!val) {
      valid = false;
      if (errEl) { errEl.textContent = msg; errEl.classList.remove("hidden"); }
      field?.classList.add("border-danger");
    } else {
      if (errEl) errEl.classList.add("hidden");
      field?.classList.remove("border-danger");
    }
  });

  return valid;
}

function updateThumbPreview() {
  const url      = document.getElementById("field-thumbnail")?.value.trim();
  const previewEl = document.getElementById("thumb-preview");
  if (!previewEl) return;

  if (url) {
    previewEl.innerHTML = `<img src="${escHtml(url)}" class="w-full h-full object-cover" alt="Thumbnail" onerror="this.parentElement.innerHTML='<span class=\\'text-2xs text-danger\\'>Invalid</span>'" />`;
    previewEl.style.opacity = "1";
  } else {
    previewEl.innerHTML = `<span class="text-2xs text-text-muted">—</span>`;
    previewEl.style.opacity = "0.4";
  }
}

function previewVideo() {
  const videoId  = document.getElementById("field-video-id")?.value.trim();
  const provider = document.querySelector('input[name="video_provider"]:checked')?.value || "youtube";
  const area     = document.getElementById("video-preview-area");
  const iframe   = document.getElementById("video-preview-iframe");

  if (!videoId || !area || !iframe) return;

  const urls = {
    youtube: `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`,
    vimeo:   `https://player.vimeo.com/video/${videoId}?dnt=1&byline=0`,
  };

  iframe.src = urls[provider] || "";
  area.classList.remove("hidden");
}

async function deleteProjectAndRedirect(id) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`/api/projects/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (!res.ok) {
      const json = await res.json();
      throw new Error(json.error);
    }

    showToast("Project deleted.", "success");
    setTimeout(() => window.location.replace("/admin/projects/"), 1000);

  } catch (err) {
    showToast(`Delete failed: ${err.message}`, "error");
  }
}

// =============================================================================
// SETTINGS PAGE
// =============================================================================
async function initSettingsPage() {
  const emailEl    = document.getElementById("settings-email");
  const avatarEl   = document.getElementById("settings-avatar");
  const lastSignEl = document.getElementById("settings-last-sign-in");

  if (!emailEl) return;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  const user = session.user;
  emailEl.textContent  = user.email;
  avatarEl.textContent = (user.email?.[0] || "A").toUpperCase();

  if (lastSignEl && user.last_sign_in_at) {
    lastSignEl.textContent = new Date(user.last_sign_in_at).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
  }

  // Change email
  document.getElementById("change-email-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const newEmail = document.getElementById("new-email")?.value.trim();
    if (!newEmail) return;

    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) {
      showToast(`Email update failed: ${error.message}`, "error");
    } else {
      showToast("Check your new email address to confirm the change.", "success", 6000);
    }
  });

  // Change password
  document.getElementById("change-password-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const newPass     = document.getElementById("new-password")?.value;
    const confirmPass = document.getElementById("confirm-password")?.value;
    const matchError  = document.getElementById("password-match-error");

    if (newPass !== confirmPass) {
      matchError?.classList.remove("hidden");
      return;
    }
    matchError?.classList.add("hidden");

    if (newPass.length < 8) {
      showToast("Password must be at least 8 characters.", "warning");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPass });
    if (error) {
      showToast(`Password update failed: ${error.message}`, "error");
    } else {
      showToast("Password updated successfully.", "success");
      document.getElementById("new-password").value     = "";
      document.getElementById("confirm-password").value = "";
    }
  });

  // Sign out all devices
  document.getElementById("btn-sign-out-all")?.addEventListener("click", async () => {
    await supabase.auth.signOut({ scope: "global" });
    window.location.replace("/admin/login/");
  });
}

// =============================================================================
// UTILITIES
// =============================================================================
function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// =============================================================================
// ENTRY POINT
// =============================================================================
document.addEventListener("DOMContentLoaded", async () => {
  const path = window.location.pathname;

  // Always run sidebar toggle for admin pages
  initAdminSidebar();

  // Login page
  if (path.includes("/admin/login")) {
    initLoginPage();
    return; // Don't run auth guard on login page
  }

  // Auth guard for all other admin pages
  const session = await initAuthGuard();
  if (!session) return; // Redirect already triggered

  // Page-specific initialization
  if (path === "/admin/" || path === "/admin/index.html") {
    await initDashboard();
  }

  if (path.includes("/admin/projects/") && !path.includes("new") && !path.includes("edit")) {
    await initProjectList();
  }

  if (path.includes("/admin/projects/new") || path.includes("/admin/projects/edit")) {
    await initProjectForm();
  }

  if (path.includes("/admin/settings")) {
    await initSettingsPage();
  }
});
