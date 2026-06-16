import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Backoffice dev server. Proxy keeps it same-origin with the API.
// Override the API target with VITE_API_TARGET when the backend runs elsewhere.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      "/api": { target: process.env.VITE_API_TARGET ?? "http://localhost:8000", changeOrigin: true },
    },
  },
});
