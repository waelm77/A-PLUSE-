import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: 'dist',
    cssMinify: false,
    // Wider device support: transpiles down to iOS 12+/Safari 12+, Chrome 80+,
    // so students on older iPhones/iPads can use the platform
    target: 'es2018',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('firebase')) return 'firebase';
            if (id.includes('radix-ui')) return 'radix';
            if (id.includes('react')) return 'react';
          }
        },
      },
    },
    chunkSizeWarningLimit: 800,
  },
})
