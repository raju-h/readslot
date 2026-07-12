import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: false,
    sourcemap: false,
    lib: {
      entry: resolve(import.meta.dirname, "src/content/index.ts"),
      name: "ReadSlotContent",
      formats: ["iife"],
      fileName: () => "content.js"
    }
  }
});
