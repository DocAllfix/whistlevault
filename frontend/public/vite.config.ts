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
      // Use the SUMO build: it includes crypto_pwhash (Argon2id) used by the ZK
      // receipt KDF. The plain build omits it. CommonJS module path bypasses the
      // package's broken ESM "exports".
      "libsodium-wrappers": fileURLToPath(
        new URL("./node_modules/libsodium-wrappers-sumo/dist/modules-sumo/libsodium-wrappers.js", import.meta.url),
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
