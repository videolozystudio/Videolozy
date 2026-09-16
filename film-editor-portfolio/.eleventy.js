// =============================================================================
// .eleventy.js — Eleventy v3 Configuration
// =============================================================================
import { EleventyHtmlBasePlugin } from "@11ty/eleventy";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { videolozyLogo, brandStrip } from "./svgShortcodes.js";

// Load .env file for local development (Vercel injects vars automatically in production)
const envPath = resolve(process.cwd(), ".env");
if (existsSync(envPath)) {
  const lines = readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    if (key && !(key in process.env)) process.env[key] = val;
  }
}


export default function (eleventyConfig) {
  // ---------------------------------------------------------------------------
  // Passthrough File Copies
  // ---------------------------------------------------------------------------
  eleventyConfig.addPassthroughCopy("src/assets/js");
  eleventyConfig.addPassthroughCopy("src/assets/images");
  // Note: CSS is compiled by Tailwind CLI directly to _site/assets/css/

  // ---------------------------------------------------------------------------
  // Plugins
  // ---------------------------------------------------------------------------
  eleventyConfig.addPlugin(EleventyHtmlBasePlugin);

  // ---------------------------------------------------------------------------
  // Collections
  // ---------------------------------------------------------------------------

  // All published projects (used for static fallback / SSG data)
  eleventyConfig.addCollection("projects", function (collectionApi) {
    return collectionApi.getFilteredByGlob("src/pages/projects/*.liquid");
  });

  // ---------------------------------------------------------------------------
  // Filters
  // ---------------------------------------------------------------------------

  // Extract the year from a date string or Date object
  eleventyConfig.addFilter("yearOnly", (dateValue) => {
    if (!dateValue) return "";
    return new Date(dateValue).getFullYear();
  });

  // Format a number with commas (e.g. 1234567 → "1,234,567")
  eleventyConfig.addFilter("formatNumber", (num) => {
    if (num == null) return "0";
    return Number(num).toLocaleString("en-US");
  });

  // Truncate text to a given length and append ellipsis
  eleventyConfig.addFilter("truncate", (text, length = 100) => {
    if (!text) return "";
    return text.length > length ? text.slice(0, length) + "…" : text;
  });

  // Slugify a string for use in URLs
  eleventyConfig.addFilter("slugify", (str) => {
    if (!str) return "";
    return str
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  });

  // Build the correct embed URL for YouTube or Vimeo
  eleventyConfig.addFilter("embedUrl", (videoId, provider) => {
    if (!videoId || !provider) return "";
    if (provider === "youtube") {
      return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`;
    }
    if (provider === "vimeo") {
      return `https://player.vimeo.com/video/${videoId}?dnt=1&byline=0&portrait=0&title=0`;
    }
    return "";
  });

  // Build a thumbnail URL from provider + id (fallback when no custom thumbnail)
  eleventyConfig.addFilter("thumbnailUrl", (videoId, provider, customUrl) => {
    if (customUrl) return customUrl;
    if (provider === "youtube") {
      return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    }
    // Vimeo thumbnails require an API call, so fall back to placeholder
    return `/assets/images/placeholder-thumb.svg`;
  });

  // Category display label
  eleventyConfig.addFilter("categoryLabel", (category) => {
    const labels = {
      commercial: "Commercial",
      "short-film": "Short Film",
      "music-video": "Music Video",
      documentary: "Documentary",
    };
    return labels[category] || category;
  });

  // ---------------------------------------------------------------------------
  // Shortcodes
  // ---------------------------------------------------------------------------

  // Render a responsive video embed iframe
  eleventyConfig.addShortcode("videoEmbed", (videoId, provider, title = "Video") => {
    const urls = {
      youtube: `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&autoplay=0`,
      vimeo: `https://player.vimeo.com/video/${videoId}?dnt=1&byline=0&portrait=0&title=0`,
    };
    const src = urls[provider] || "";
    return `
<div class="video-player-wrapper">
  <iframe
    src="${src}"
    title="${title}"
    frameborder="0"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    allowfullscreen
    loading="lazy"
    class="video-player-iframe"
  ></iframe>
</div>`.trim();
  });

  // Neon glow text span
  eleventyConfig.addShortcode("neon", (text) => {
    return `<span class="neon-text">${text}</span>`;
  });

  // SVG logo — defined in svgShortcodes.js to keep large SVG out of Liquid
  // parser and prevent OOM during build. Usage: {% videolozyLogo "header" %}
  eleventyConfig.addShortcode("videolozyLogo", videolozyLogo);

  // Brand strip marquee. Usage: {% brandStrip %}
  eleventyConfig.addShortcode("brandStrip", brandStrip);

  // ---------------------------------------------------------------------------
  // Template Formats
  // ---------------------------------------------------------------------------
  eleventyConfig.addTemplateFormats(["liquid", "html", "njk", "md"]);

  // ---------------------------------------------------------------------------
  // Directory Configuration
  // ---------------------------------------------------------------------------
  return {
    templateFormats: ["liquid", "html", "njk", "md"],
    markdownTemplateEngine: "liquid",
    htmlTemplateEngine: "liquid",
    dataTemplateEngine: "liquid",
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data",
      layouts: "_layouts",
    },
  };
}
