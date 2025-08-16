import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  server: {
    host: true, // Listen on all addresses including network
    port: 5173,
    hmr: {
      port: 5173,
    },
    allowedHosts: [
      'localhost',
      '.ngrok.io',
      '.ngrok-free.app',
    ],
  },
});
