import { copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * GitHub Pages has no server rewrite: a reload on /games/... looks for a real file
 * and 404s before the SPA loads. After build, duplicate index.html as 404.html so
 * GitHub serves the same app shell; React Router then renders the right route.
 */
function githubPagesSpa404() {
  let outDir;
  return {
    name: "github-pages-spa-404",
    configResolved(config) {
      outDir = config.build.outDir;
    },
    closeBundle() {
      const indexHtml = join(outDir, "index.html");
      const notFound = join(outDir, "404.html");
      if (existsSync(indexHtml)) {
        copyFileSync(indexHtml, notFound);
      }
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), githubPagesSpa404()],
  server: { port: 5173, strictPort: false, open: false },
  preview: { port: 4173, strictPort: false },
});