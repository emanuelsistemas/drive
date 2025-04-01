import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['react', 'react-dom', '@supabase/supabase-js', 'react-toastify']
  },
  build: {
    sourcemap: false,
    minify: 'terser',
    cssMinify: true,
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['lucide-react', 'react-toastify'],
          supabase: ['@supabase/supabase-js']
        }
      }
    }
  },
  server: {
    host: true,
    port: 6002,
    strictPort: true,
    hmr: {
      overlay: true
    },
    cors: true
  },
  resolve: {
    dedupe: ['react', 'react-dom']
  }
});