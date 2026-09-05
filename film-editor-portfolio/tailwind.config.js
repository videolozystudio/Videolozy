/** @type {import('tailwindcss').Config} */
export default {
  // Scan all Liquid templates and JS for class names
  content: [
    "./src/**/*.{liquid,html,njk,md,js}",
    "./.eleventy.js",
  ],
  darkMode: "class",
  theme: {
    extend: {
      // -----------------------------------------------------------------------
      // Color Palette — Neon Dark Theme
      // -----------------------------------------------------------------------
      colors: {
        // Refined studio crimson accent
        "crimson": {
          DEFAULT: "#E50914",
          50:  "#fef2f2",
          100: "#fee2e2",
          200: "#fecaca",
          300: "#fca5a5",
          400: "#f87171",
          500: "#ef4444",
          600: "#E50914",
          700: "#b91c1c",
          800: "#991b1b",
          900: "#7f1d1d",
        },
        "neon-red": {
          DEFAULT: "#E50914",
        },
        // Background layers
        "void":    "#0A0A0E",
        "surface": "#121218",
        "card":    "#181822",
        "card-hover": "#20202E",
        "border":  "#272736",
        "border-hover": "#3F3F54",
        // Text hierarchy
        "text-primary":   "#FFFFFF",
        "text-secondary": "#A1A1AA",
        "text-muted":     "#71717A",
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
        "neon-sm":  "0 0 8px rgba(229, 9, 20, 0.4)",
        "neon":     "0 0 20px rgba(229, 9, 20, 0.5), 0 0 40px rgba(229, 9, 20, 0.2)",
        "neon-lg":  "0 0 40px rgba(229, 9, 20, 0.6), 0 0 80px rgba(229, 9, 20, 0.3)",
        "card":     "0 4px 24px rgba(0, 0, 0, 0.6)",
        "card-hover": "0 8px 40px rgba(0, 0, 0, 0.8), 0 0 20px rgba(229, 9, 20, 0.2)",
        "inner-neon": "inset 0 0 20px rgba(229, 9, 20, 0.1)",
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
          "0%, 100%": { boxShadow: "0 0 20px rgba(255, 0, 64, 0.5)" },
          "50%":      { boxShadow: "0 0 40px rgba(255, 0, 64, 0.9), 0 0 60px rgba(255, 0, 64, 0.4)" },
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
        "gradient-neon":   "linear-gradient(135deg, #FF0040 0%, #CC0033 100%)",
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
          color: theme("colors.neon-red.DEFAULT"),
          textShadow:
            "0 0 10px rgba(255, 0, 64, 0.8), 0 0 20px rgba(255, 0, 64, 0.5), 0 0 40px rgba(255, 0, 64, 0.3)",
        },
        ".neon-text-sm": {
          color: theme("colors.neon-red.DEFAULT"),
          textShadow: "0 0 8px rgba(255, 0, 64, 0.6)",
        },
        ".neon-border": {
          borderColor: theme("colors.neon-red.DEFAULT"),
          boxShadow: "0 0 10px rgba(255, 0, 64, 0.4)",
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
          color: "#FFFFFF",
          background: theme("colors.neon-red.DEFAULT"),
          border: `1px solid ${theme("colors.neon-red.DEFAULT")}`,
          transition: "all 0.2s ease",
          cursor: "pointer",
          textDecoration: "none",
          "&:hover": {
            background: theme("colors.neon-red.700"),
            boxShadow: "0 0 20px rgba(255, 0, 64, 0.5)",
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
          color: theme("colors.neon-red.DEFAULT"),
          background: "transparent",
          border: `1px solid ${theme("colors.neon-red.DEFAULT")}`,
          transition: "all 0.2s ease",
          cursor: "pointer",
          textDecoration: "none",
          "&:hover": {
            background: "rgba(255, 0, 64, 0.1)",
            boxShadow: "0 0 15px rgba(255, 0, 64, 0.3)",
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
            boxShadow: "0 8px 40px rgba(0, 0, 0, 0.8), 0 0 20px rgba(255, 0, 64, 0.15)",
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
            borderColor: theme("colors.neon-red.DEFAULT"),
            boxShadow: "0 0 0 3px rgba(255, 0, 64, 0.15)",
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
    { pattern: /bg-(neon-red|success|warning|danger|info)/ },
    { pattern: /text-(neon-red|success|warning|danger|info)/ },
    { pattern: /border-(neon-red|success|warning|danger|info)/ },
  ],
};
