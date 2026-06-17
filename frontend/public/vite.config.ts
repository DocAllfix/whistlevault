import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Dev proxy keeps the SPA same-origin with the API so session cookies and
// Bearer tokens work without cross-site complications.
export default defineConfig({
  plugins: [react()],
  // The package's ESM build has a broken internal import; alias to the
  // self-contained CommonJS build via an absolute path (bypasses "exports").
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "libsodium-wrappers": fileURLToPath(
        new URL("./node_modules/libsodium-wrappers/dist/modules/libsodium-wrappers.js", import.meta.url),
      ),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": { target: process.env.VITE_API_TARGET ?? "http://localhost:8000", changeOrigin: true },
    },
  },
});
