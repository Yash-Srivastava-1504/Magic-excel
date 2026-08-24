import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "node:fs";
import { componentTagger } from "lovable-tagger";

/** Dev-only: writes POSTed JSON snapshots to pipeline-debug-latest.json in the project root. */
function pipelineDebugFilePlugin(): Plugin {
  const logFile = path.resolve(process.cwd(), "pipeline-debug-latest.json");
  return {
    name: "pipeline-debug-file",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url ?? "";
        if (!url.startsWith("/__pipeline_debug/snapshot") || req.method !== "POST") {
          return next();
        }
        const chunks: Buffer[] = [];
        req.on("data", (c: Buffer) => chunks.push(c));
        req.on("end", () => {
          try {
            const raw = Buffer.concat(chunks).toString("utf8");
            const data = JSON.parse(raw) as unknown;
            fs.writeFileSync(logFile, JSON.stringify(data, null, 2), "utf8");
            res.statusCode = 204;
            res.end();
          } catch (e) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "text/plain; charset=utf-8");
            res.end(e instanceof Error ? e.message : String(e));
          }
        });
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    mode === "development" && pipelineDebugFilePlugin(),
  ].filter(Boolean) as Plugin[],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
