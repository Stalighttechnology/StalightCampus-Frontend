import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

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
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ['react', 'react-dom', 'react/jsx-runtime', '@radix-ui/react-toast', 'next-themes', 'sonner'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
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