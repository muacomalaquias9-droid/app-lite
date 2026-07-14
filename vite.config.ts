import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // Aggressive minification for smaller bundle size
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: mode === 'production',
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info'],
      },
    },
    // Target modern browsers for smaller bundles
    target: 'esnext',
    // Optimize chunk size
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        // Smaller chunk splitting for faster loading
        manualChunks: {
          'react-core': ['react', 'react-dom'],
          'router': ['react-router-dom'],
          'supabase': ['@supabase/supabase-js'],
          'ui-core': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          'ui-extra': ['@radix-ui/react-avatar', '@radix-ui/react-tooltip', '@radix-ui/react-popover'],
          'motion': ['framer-motion'],
        },
        // Use hashes for better caching
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      }
    },
    // Enable source maps for debugging
    sourcemap: mode === 'development',
  },
  server: {
    host: "::",
    port: 8080,
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', '@supabase/supabase-js'],
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
