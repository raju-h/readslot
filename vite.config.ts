import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      input: {
        background: resolve(import.meta.dirname, "src/background/index.ts"),
        queue: resolve(import.meta.dirname, "queue.html"),
        planner: resolve(import.meta.dirname, "planner.html"),
        session: resolve(import.meta.dirname, "session.html"),
        options: resolve(import.meta.dirname, "options.html")
      },
      output: {
        entryFileNames: (chunk) =>
          chunk.name === "background" ? "background.js" : "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]"
      }
    }
  }
});
