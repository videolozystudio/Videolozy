// =============================================================================
// src/_data/site.js — Global Site Data
// Accessible in all Liquid templates as {{ site.* }}
// =============================================================================

export default {
  // Basic metadata
  name:        process.env.EDITOR_NAME    || "Alex Rivera",
  tagline:     process.env.EDITOR_TAGLINE || "Crafting Stories Through the Art of the Edit",
  description: "Award-winning film editor specializing in commercials, short films, music videos, and documentaries. Based in Los Angeles.",
  url:         process.env.SITE_URL       || "https://your-portfolio.vercel.app",
  email:       process.env.CONTACT_EMAIL  || "hello@filmreel.studio",

  // Years of experience (auto-calculated)
  yearsActive: new Date().getFullYear() - 2012,

  // Social links
  social: {
    vimeo:     process.env.SOCIAL_VIMEO     || "https://vimeo.com/",
    instagram: process.env.SOCIAL_INSTAGRAM || "https://instagram.com/",
    linkedin:  process.env.SOCIAL_LINKEDIN  || "https://linkedin.com/in/",
    twitter:   process.env.SOCIAL_TWITTER   || "",
  },

  // Navigation items for client header
  nav: [
    { label: "Work",    href: "/#work"    },
    { label: "About",   href: "/#about"   },
    { label: "Contact", href: "/#contact" },
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
