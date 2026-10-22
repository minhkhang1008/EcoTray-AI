import { defineConfig, loadEnv } from "vite";
import { configuredService, nodeHandler } from "./server/node-handler.mjs";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    {
      name: "ecotray-local-iot",
      configureServer(server) {
        server.middlewares.use("/api/iot", (req, res, next) => {
          req.url = "/api/iot" + req.url;
          return handler(req, res);
        });
        const handler = nodeHandler(
          configuredService({ ...process.env, ...loadEnv(mode, ".", "") }),
        );
      },
    },
  ],
  base: "./",
  build: { outDir: "dist" },
}));
