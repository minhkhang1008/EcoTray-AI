import { defineConfig, loadEnv } from "vite";
import { configuredService, nodeHandler } from "./server/node-handler.mjs";
import { configuredVisionService } from "./server/vision.mjs";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    {
      name: "ecotray-local-iot",
      configureServer(server) {
        const vision = nodeHandler(configuredVisionService({ ...process.env, ...loadEnv(mode, ".", "") }));
        server.middlewares.use("/api/ai/analyze-tray", (req, res) => {
          req.url = "/api/ai/analyze-tray" + req.url;
          return vision(req, res);
        });
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
