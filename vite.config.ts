import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { visualizer } from "rollup-plugin-visualizer";

// lovable-tagger è opzionale: dentro Lovable è installato, fuori (export su VS Code)
// non lo è. Lo importiamo via createRequire in modo sincrono e lo ignoriamo se manca.
import { createRequire } from "module";

const requireOpt = createRequire(import.meta.url);

let componentTagger: (() => any) | undefined;

try {
  componentTagger = requireOpt("lovable-tagger").componentTagger;
} catch {
  // pacchetto non installato fuori da Lovable: ok
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8081,
    strictPort: true,
    hmr: {
      overlay: false,
    },
  },

  plugins: [
    react(),
    mode === "development" && componentTagger && componentTagger(),
    process.env.ANALYZE === "true" &&
      visualizer({
        filename: "bundle-analysis.html",
        open: true,
        gzipSize: true,
        brotliSize: true,
      }),
  ].filter(Boolean),

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },

  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (
              id.includes("react-dom") ||
              id.includes("/react/") ||
              id.includes("react-router") ||
              id.includes("@tanstack")
            ) {
              return "react-vendor";
            }
            if (
              id.includes("jspdf") ||
              id.includes("html2canvas") ||
              id.includes("jszip") ||
              id.includes("docx") ||
              id.includes("pdf-lib")
            ) {
              return "export-engine";
            }
            return undefined;
          }

          if (id.includes("/src/lib/pdf-export") || id.includes("/src/lib/docx-export")) {
            return "export-engine";
          }
          if (
            id.includes("money-engine") ||
            id.includes("BestsellerRadar") ||
            id.includes("KdpLaunchPage") ||
            id.includes("KeywordGoldPage")
          ) {
            return "market-engine";
          }
          if (id.includes("VoiceStudio")) return "voice-engine";
          if (id.includes("CoverGenerator")) return "cover-engine";
          return undefined;
        },
      },
    },
  },
}))