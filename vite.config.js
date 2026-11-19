import { defineConfig, loadEnv } from "vite";
import { resolve } from "node:path";
import { copyFileSync } from "node:fs";
import { memoryRooms, redisRooms, roomHttpHandler } from "./server/rooms.js";

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ""), ...process.env };
  return {
    server: { allowedHosts: [".e2b.app"] },
    plugins: [
      {
        name: "sanbs-ride-local-session-api",
        configureServer(server) {
          const store =
            redisRooms(env) ||
            (env.SANBS_RIDE_LOCAL_ROOMS === "1" ? memoryRooms() : null);
          const handler = roomHttpHandler(store);
          server.middlewares.use((req, res, next) => {
            if (req.url?.split("?")[0] === "/api/rooms")
              return handler(req, res);
            next();
          });
        },
      },
      {
        name: "preserve-brand-presentation-pdf",
        apply: "build",
        writeBundle({ dir }) {
          copyFileSync(
            "brand-strategy.pdf",
            resolve(dir, "brand-strategy.pdf"),
          );
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
  };
});
