import { defineConfig } from "vitest/config";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig({
  plugins: [
    VitePWA({
      registerType: "prompt",
      injectRegister: false,
      manifest: {
        name: "PET Training Companion",
        short_name: "PET",
        description: "Training load, measured velocity and recovery signals",
        theme_color: "#0d1426",
        background_color: "#090d1b",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "/icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{html,js,css,jpg,svg,json}"],
        skipWaiting: false,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          data: ["./src/program/catalog.ts"],
          validation: ["zod"],
          storage: ["dexie"],
        },
      },
    },
  },
  test: { include: ["tests/*.test.ts"] },
});
