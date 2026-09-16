/** @type {import('tailwindcss').Config} */
export default {
  // Scan all Liquid templates and JS for class names.
  // IMPORTANT: Exclude SVG-heavy component files — their inline SVG path data
  // (e.g. "M8,48 C15,30 28,22 42,28...") causes Tailwind's class scanner to
  // allocate gigabytes of memory and crash the build with OOM.
  content: [
    "./src/**/*.{liquid,html,njk,md,js}",
    "!./src/_includes/components/logo.liquid",
    "!./src/_includes/components/brand-strip.liquid",
    "!./src/_includes/components/splash-screen.liquid",
    "./.eleventy.js",
    "./svgShortcodes.js",
  ],
  darkMode: "class",
  theme: {
    extend: {
      // -----------------------------------------------------------------------
      // Color Palette — Neon Dark Theme
      // -----------------------------------------------------------------------
      colors: {
        // Primary neon accent
        "neon-silver": {
          DEFAULT: "#E0E0E0",
          50:  "#ffffff",
          100: "#f5f5f5",
          200: "#eeeeee",
          300: "#e0e0e0",
          400: "#bdbdbd",
          600: "#9e9e9e",
          700: "#757575",
          800: "#616161",
          900: "#424242",
          950: "#212121",
        },
        // Secondary neon yellow accent
        "neon-yellow": {
          DEFAULT: "#FFE600",
          50:  "#ffffea",
          100: "#ffffc5",
          200: "#ffff85",
          300: "#ffff45",
          400: "#FFE600",
          500: "#e6cf00",
          600: "#b3a100",
          700: "#807300",
          800: "#4d4500",
          900: "#1a1700",
        },
        // Background layers
        "void":    "#0B0B0E",
        "surface": "#121217",
        "card":    "#191921",
        "card-hover": "#242430",
        "border":  "#2C2C3A",
        "border-hover": "#4C4C64",
        // Text hierarchy
        "text-primary":   "#00E5FF",
        "text-secondary": "#00B8D4",
        "text-muted":     "#00838F",
        // Semantic
        "success": "#00C853",
        "warning": "#FFB300",
        "danger":  "#FF1744",
        "info":    "#2979FF",
      },

      // -----------------------------------------------------------------------
      // Typography
      // -----------------------------------------------------------------------
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "Consolas", "monospace"],
        display: ["Inter", "sans-serif"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "1rem" }],
      },

      // -----------------------------------------------------------------------
      // Spacing
      // -----------------------------------------------------------------------
      spacing: {
        "18": "4.5rem",
        "22": "5.5rem",
        "88": "22rem",
        "128": "32rem",
      },

      // -----------------------------------------------------------------------
      // Border Radius
      // -----------------------------------------------------------------------
      borderRadius: {
        "4xl": "2rem",
      },

      // -----------------------------------------------------------------------
      // Box Shadow — Neon Glow Effects
      // -----------------------------------------------------------------------
      boxShadow: {
        "neon-sm":  "0 0 8px rgba(224, 224, 224, 0.4)",
        "neon":     "0 0 20px rgba(224, 224, 224, 0.5), 0 0 40px rgba(224, 224, 224, 0.2)",
        "neon-lg":  "0 0 40px rgba(224, 224, 224, 0.6), 0 0 80px rgba(224, 224, 224, 0.3)",
        "yellow-sm": "0 0 8px rgba(255, 230, 0, 0.4)",
        "yellow":    "0 0 20px rgba(255, 230, 0, 0.5), 0 0 40px rgba(255, 230, 0, 0.2)",
        "yellow-lg": "0 0 40px rgba(255, 230, 0, 0.6), 0 0 80px rgba(255, 230, 0, 0.3)",
        "card":     "0 4px 24px rgba(0, 0, 0, 0.6)",
        "card-hover": "0 8px 40px rgba(0, 0, 0, 0.8), 0 0 20px rgba(255, 230, 0, 0.2)",
        "inner-neon": "inset 0 0 20px rgba(224, 224, 224, 0.1)",
      },

      // -----------------------------------------------------------------------
      // Keyframe Animations
      // -----------------------------------------------------------------------
      keyframes: {
        "fade-in": {
          "0%":   { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-left": {
          "0%":   { opacity: "0", transform: "translateX(-20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "fade-in-right": {
          "0%":   { opacity: "0", transform: "translateX(20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "pulse-neon": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(224, 224, 224, 0.5)" },
          "50%":      { boxShadow: "0 0 40px rgba(224, 224, 224, 0.9), 0 0 60px rgba(224, 224, 224, 0.4)" },
        },
        "shimmer": {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "counter": {
          "0%":   { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":      { transform: "translateY(-10px)" },
        },
        "glow-line": {
          "0%":   { transform: "scaleX(0)", opacity: "0" },
          "100%": { transform: "scaleX(1)", opacity: "1" },
        },
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to:   { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "fade-in":       "fade-in 0.6s ease-out forwards",
        "fade-in-slow":  "fade-in 1s ease-out forwards",
        "fade-in-left":  "fade-in-left 0.6s ease-out forwards",
        "fade-in-right": "fade-in-right 0.6s ease-out forwards",
        "pulse-neon":    "pulse-neon 2s ease-in-out infinite",
        "shimmer":       "shimmer 2s linear infinite",
        "float":         "float 6s ease-in-out infinite",
        "glow-line":     "glow-line 0.8s ease-out forwards",
        "spin-slow":     "spin-slow 3s linear infinite",
      },

      // -----------------------------------------------------------------------
      // Background Image — Gradients
      // -----------------------------------------------------------------------
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-neon":   "linear-gradient(135deg, #E0E0E0 0%, #9E9E9E 100%)",
        "gradient-dark":   "linear-gradient(180deg, #0F0F0F 0%, #080808 100%)",
        "shimmer-gradient":
          "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)",
      },

      // -----------------------------------------------------------------------
      // Screens — Matches spec breakpoints
      // -----------------------------------------------------------------------
      screens: {
        sm:  "640px",
        md:  "768px",
        lg:  "1024px",
        xl:  "1280px",
        "2xl": "1536px",
      },

      // -----------------------------------------------------------------------
      // Aspect Ratio
      // -----------------------------------------------------------------------
      aspectRatio: {
        "video": "16 / 9",
        "thumb": "4 / 3",
      },
    },
  },
  plugins: [
    // Custom utilities plugin for neon theme
    function ({ addUtilities, addComponents, theme }) {
      // Neon text glow
      addUtilities({
        ".neon-text": {
          color: theme("colors.neon-silver.DEFAULT"),
          textShadow:
            "0 0 10px rgba(224, 224, 224, 0.8), 0 0 20px rgba(224, 224, 224, 0.5), 0 0 40px rgba(224, 224, 224, 0.3)",
        },
        ".neon-text-sm": {
          color: theme("colors.neon-silver.DEFAULT"),
          textShadow: "0 0 8px rgba(224, 224, 224, 0.6)",
        },
        ".neon-border": {
          borderColor: theme("colors.neon-silver.DEFAULT"),
          boxShadow: "0 0 10px rgba(224, 224, 224, 0.4)",
        },
        ".glass": {
          background: "rgba(255, 255, 255, 0.03)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
        },
        ".glass-dark": {
          background: "rgba(0, 0, 0, 0.4)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid rgba(255, 255, 255, 0.06)",
        },
        ".skeleton": {
          background:
            "linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)",
          backgroundSize: "200% 100%",
          animation: "shimmer 1.5s linear infinite",
        },
        ".scrollbar-hidden": {
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
        },
      });

      // Component classes
      addComponents({
        ".btn-neon": {
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
          padding: "0.625rem 1.5rem",
          borderRadius: "0.375rem",
          fontSize: "0.875rem",
          fontWeight: "600",
          letterSpacing: "0.025em",
          color: "#000000",
          background: theme("colors.neon-silver.DEFAULT"),
          border: `1px solid ${theme("colors.neon-silver.DEFAULT")}`,
          transition: "all 0.2s ease",
          cursor: "pointer",
          textDecoration: "none",
          "&:hover": {
            background: theme("colors.neon-silver.700"),
            boxShadow: "0 0 20px rgba(224, 224, 224, 0.5)",
            transform: "translateY(-1px)",
          },
          "&:active": {
            transform: "translateY(0)",
          },
          "&:disabled": {
            opacity: "0.5",
            cursor: "not-allowed",
            transform: "none",
          },
        },
        ".btn-outline": {
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
          padding: "0.625rem 1.5rem",
          borderRadius: "0.375rem",
          fontSize: "0.875rem",
          fontWeight: "600",
          letterSpacing: "0.025em",
          color: theme("colors.neon-silver.DEFAULT"),
          background: "transparent",
          border: `1px solid ${theme("colors.neon-silver.DEFAULT")}`,
          transition: "all 0.2s ease",
          cursor: "pointer",
          textDecoration: "none",
          "&:hover": {
            background: "rgba(224, 224, 224, 0.1)",
            boxShadow: "0 0 15px rgba(224, 224, 224, 0.3)",
          },
        },
        ".btn-ghost": {
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
          padding: "0.625rem 1.5rem",
          borderRadius: "0.375rem",
          fontSize: "0.875rem",
          fontWeight: "500",
          color: theme("colors.text-secondary"),
          background: "transparent",
          border: "1px solid transparent",
          transition: "all 0.2s ease",
          cursor: "pointer",
          textDecoration: "none",
          "&:hover": {
            color: "#FFFFFF",
            background: "rgba(255, 255, 255, 0.06)",
            borderColor: "rgba(255, 255, 255, 0.1)",
          },
        },
        ".card-project": {
          position: "relative",
          borderRadius: "0.75rem",
          overflow: "hidden",
          background: theme("colors.card"),
          border: `1px solid ${theme("colors.border")}`,
          transition: "all 0.3s ease",
          "&:hover": {
            borderColor: theme("colors.border-hover"),
            boxShadow: "0 8px 40px rgba(0, 0, 0, 0.8), 0 0 20px rgba(224, 224, 224, 0.15)",
            transform: "translateY(-4px)",
          },
        },
        ".input-field": {
          width: "100%",
          padding: "0.625rem 0.875rem",
          borderRadius: "0.375rem",
          fontSize: "0.875rem",
          color: "#FFFFFF",
          background: "rgba(255, 255, 255, 0.04)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          outline: "none",
          transition: "border-color 0.2s ease, box-shadow 0.2s ease",
          "&::placeholder": { color: theme("colors.text-muted") },
          "&:focus": {
            borderColor: theme("colors.neon-silver.DEFAULT"),
            boxShadow: "0 0 0 3px rgba(224, 224, 224, 0.15)",
          },
        },
        ".badge": {
          display: "inline-flex",
          alignItems: "center",
          padding: "0.2rem 0.6rem",
          borderRadius: "9999px",
          fontSize: "0.7rem",
          fontWeight: "600",
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        },
      });
    },
  ],

  // Safelist dynamic classes used in JavaScript
  safelist: [
    "hidden",
    "block",
    "flex",
    "opacity-0",
    "opacity-100",
    "translate-y-0",
    "-translate-y-full",
    "scale-100",
    "scale-95",
    { pattern: /bg-(neon-silver|success|warning|danger|info)/ },
    { pattern: /text-(neon-silver|success|warning|danger|info)/ },
    { pattern: /border-(neon-silver|success|warning|danger|info)/ },

    // Classes used in excluded SVG-heavy components (logo.liquid, brand-strip.liquid, splash-screen.liquid)
    // These files are excluded from content scan to prevent OOM but their classes must be safelisted
    "fixed", "inset-0", "z-[100]", "items-center", "justify-center", "bg-void",
    "transition-opacity", "duration-1000", "relative", "w-full", "h-full",
    "overflow-hidden", "absolute", "w-[30rem]", "h-[30rem]", "rounded-full",
    "blur-3xl", "pointer-events-none",
    "z-10", "p-8",
    // Brand strip classes
    "py-10", "border-y", "border-white/10", "text-center", "mb-6",
    "text-2xs", "font-bold", "tracking-[0.25em]", "uppercase", "text-gray-500",
    "inset-y-0", "left-0", "w-24", "right-0",
    "brand-marquee-outer", "brand-marquee-track", "brand-logo-item",
    "brand-fade-left", "brand-fade-right",
    "flex-shrink-0", "gap-16", "w-1.5", "h-1.5", "bg-yellow-400/40",
    "h-14", "w-auto", "h-12",
    "opacity-65", "opacity-70", "hover:opacity-100",
    // Logo classes
    "drop-shadow-[0_0_14px_rgba(255,165,0,0.35)]",
    "w-auto", "h-10", "h-48", "sm:h-56", "w-64", "sm:w-80",
  ],
};
