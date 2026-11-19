import { defineConfig } from "vite";
import { resolve } from "node:path";
import { copyFileSync } from "node:fs";

export default defineConfig({
  server: { allowedHosts: [".e2b.app"] },
  plugins: [
    {
      name: "preserve-brand-presentation-pdf",
      apply: "build",
      writeBundle({ dir }) {
        copyFileSync("brand-strategy.pdf", resolve(dir, "brand-strategy.pdf"));
      },
    },
  ],
  build: {
    rollupOptions: {
      input: {
        ride: resolve("index.html"),
        legacy: resolve("siyavikela.html"),
      },
    },
  },
});
