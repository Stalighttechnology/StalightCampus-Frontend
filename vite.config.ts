import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, "/api"),
        secure: false,
      },
    },
  }, // Changed from 8000 to 5173
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'applogo.png'],
      manifest: {
        name: 'Stalight Campus',
        short_name: 'Stalight',
        description: 'Campus Management System for Students and Faculty',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'logo-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'logo-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ['react', 'react-dom', 'react/jsx-runtime', '@radix-ui/react-toast', 'next-themes', 'sonner'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-joyride'],
    exclude: ['@zxing/library', '@zxing/browser']
  },
  // Build optimizations for production chunking
  // - `chunkSizeWarningLimit` raised to avoid noisy warnings for larger legitimate chunks
  // - `manualChunks` separates heavy third-party libs into their own bundles
  build: {
    chunkSizeWarningLimit: 2000, // KB - increased to reduce warnings for large legitimate chunks
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          pdf: ['jspdf', 'html2canvas'],
          images: ['browser-image-compression'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select', '@radix-ui/react-toast', '@radix-ui/react-tabs', 'lucide-react'],
          charts: ['recharts'],
          utils: ['xlsx', 'framer-motion', 'sweetalert2', 'lodash', 'date-fns'],
          scanning: ['@zxing/library', '@zxing/browser'],
        },
      },
    },
  },
}));