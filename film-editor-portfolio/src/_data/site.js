// =============================================================================
// src/_data/site.js — Global Site Data
// Accessible in all Liquid templates as {{ site.* }}
// =============================================================================

export default {
  // Basic metadata
  name:        process.env.EDITOR_NAME    || "Videolozy",
  brand:       "Videolozy",
  tagline:     process.env.EDITOR_TAGLINE || "An Audio and Video Production",
  description: "Founded in 2024, Videolozy is a creative audio and video production brand focused on cinematic storytelling and modern visual experiences. We specialize in video editing, production, commercial ads, wedding films, music videos, reels, sound design, and graphic design.",
  url:         process.env.SITE_URL       || "https://videolozy.in",
  email:       process.env.CONTACT_EMAIL  || "contact@videolozy.in",

  // Years of experience (auto-calculated)
  yearsActive: new Date().getFullYear() - 2024,

  // Social links
  social: {
    facebook:  process.env.SOCIAL_FACEBOOK  || "https://facebook.com/videolozy",
    instagram: process.env.SOCIAL_INSTAGRAM || "https://instagram.com/videolozy",
    whatsapp:  process.env.SOCIAL_WHATSAPP  || "https://wa.me/91XXXXXXXXXX",
    email:     process.env.CONTACT_EMAIL    || "contact@videolozy.in",
  },

  // Navigation items for client header
  nav: [
    { label: "Work",    href: "/#work"    },
    { label: "About",   href: "/#about"   },
  ],

  // Video categories (drives filter buttons on homepage)
  categories: [
    { value: "all",         label: "All Work"     },
    { value: "commercial",  label: "Commercial"   },
    { value: "short-film",  label: "Short Film"   },
    { value: "music-video", label: "Music Video"  },
    { value: "documentary", label: "Documentary"  },
  ],

  // Supabase public config (safe to expose — protected by RLS)
  supabase: {
    url:     process.env.SUPABASE_URL      || "",
    anonKey: process.env.SUPABASE_ANON_KEY || "",
  },

  // PostHog analytics (safe to expose — it's a write-only key)
  posthog: {
    key:  process.env.POSTHOG_KEY  || "",
    host: process.env.POSTHOG_HOST || "https://app.posthog.com",
  },

  // Build timestamp (useful for cache-busting)
  buildTime: new Date().toISOString(),
  buildYear: new Date().getFullYear(),
};
