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
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("html2canvas") || id.includes("jspdf")) return "export-pdf";
          if (id.includes("jszip") || id.includes("docx")) return "export-docs";
          if (id.includes("@supabase")) return "supabase";
          if (id.includes("@radix-ui")) return "radix";
          if (id.includes("recharts") || id.includes("d3-")) return "charts";
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
}))