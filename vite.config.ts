import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

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
  ].filter(Boolean),

  build: {
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("pdfjs-dist")) return "vendor-pdfjs";
            if (id.includes("html2canvas")) return "vendor-html2canvas";
            if (id.includes("jspdf")) return "vendor-jspdf";
            if (id.includes("jszip")) return "vendor-jszip";
            if (id.includes("/docx/") || id.includes("docx")) return "vendor-docx";
            if (id.includes("@supabase")) return "vendor-supabase";
            if (id.includes("@radix-ui")) return "vendor-radix";
            if (id.includes("framer-motion")) return "vendor-motion";
            if (id.includes("recharts") || id.includes("d3-")) return "vendor-charts";
            if (id.includes("@tanstack")) return "vendor-query";
            if (id.includes("lucide-react")) return "vendor-icons";
            if (id.includes("sonner")) return "vendor-sonner";
            if (id.includes("react-hook-form") || id.includes("@hookform")) return "vendor-forms";
            if (id.includes("cmdk")) return "vendor-cmdk";
            if (id.includes("embla-carousel")) return "vendor-embla";
            if (id.includes("vaul")) return "vendor-vaul";
            if (id.includes("next-themes")) return "vendor-themes";
            if (id.includes("react-day-picker")) return "vendor-day-picker";
            if (id.includes("input-otp")) return "vendor-otp";
            if (id.includes("react-resizable-panels")) return "vendor-resizable";
            if (id.includes("lz-string")) return "vendor-lz";
            if (id.includes("file-saver")) return "vendor-filesaver";
            if (id.includes("@capacitor")) return "vendor-capacitor";
            // Do NOT manually chunk react/react-dom/scheduler/react-router — forced splits
            // create circular imports and a black screen in production.
            if (id.includes("zod")) return "vendor-zod";
            if (id.includes("date-fns")) return "vendor-dates";
            return "vendor-misc";
          }

          if (id.includes("/src/lib/generation.ts")) {
            return "engine-generation";
          }
          if (
            id.includes("/src/components/guided-interview/") ||
            id.includes("/src/lib/guided-interview/")
          ) {
            return "forge-guided-interview";
          }
          if (id.includes("/src/mobile/MobileBookForge")) {
            return "ui-mobile-book-forge";
          }
          if (id.includes("/src/lib/epub.ts")) return "export-epub";
          if (id.includes("/src/lib/docx-export")) return "export-docx";
          if (id.includes("/src/lib/pdf-export")) return "export-pdf";
          if (id.includes("/src/lib/study-session")) return "study-session";
          if (id.includes("/src/lib/study-certificate")) return "study-certificate";
          if (id.includes("/src/components/EditorPanel")) return "ui-editor-panel";
          if (id.includes("/src/pages/StudySessionPage")) return "page-study-session";
          if (id.includes("/src/pages/Dashboard")) return "page-dashboard";
          if (id.includes("/src/pages/Index")) return "page-writer";
          if (id.includes("/src/pages/AutoBestsellerPage")) return "page-auto-bestseller";
        },
      },
    },
  },

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
}));
