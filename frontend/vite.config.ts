import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5174,
    strictPort: true,
    cors: true,
    origin: "http://127.0.0.1:5174",
    proxy: {
      "/api": "http://127.0.0.1:8000",
    },
    hmr: { overlay: false },
  },
  build: {
    outDir: "dist",
  },
});