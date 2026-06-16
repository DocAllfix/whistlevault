import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Dev proxy keeps the SPA same-origin with the API so session cookies and
// Bearer tokens work without cross-site complications.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": { target: "http://localhost:8000", changeOrigin: true },
    },
  },
});
