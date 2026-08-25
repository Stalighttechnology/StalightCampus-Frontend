import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";
import packageJson from './package.json';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(packageJson.version)
  },
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
      injectRegister: false,
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'applogo.png'],
      manifest: {
        name: 'Stalight Campus',
        short_name: 'Stalight',
        description: 'Campus Management System for Students and Faculty',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        gcm_sender_id: '103953800507',
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
      },
      devOptions: {
        enabled: false
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
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) return 'vendor';
            if (id.includes('jspdf') || id.includes('html2canvas')) return 'pdf';
            if (id.includes('browser-image-compression')) return 'images';
            if (id.includes('@radix-ui') || id.includes('lucide-react')) return 'ui';
            if (id.includes('recharts')) return 'charts';
            if (id.includes('xlsx') || id.includes('framer-motion') || id.includes('sweetalert2') || id.includes('lodash') || id.includes('date-fns')) return 'utils';
            if (id.includes('@zxing')) return 'scanning';
          }
        },
      },
    },
  },
}));