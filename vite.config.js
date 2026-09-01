import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Lets you open the site from your phone on the same Wi-Fi while developing.
    host: true,
  },
  build: {
    outDir: 'dist',
    // The Firestore SDK alone is ~600 kB. It is split into its own cached chunk,
    // so the default 500 kB warning is just noise here.
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // Firebase is large; splitting it keeps the first load small on mobile.
        manualChunks(id) {
          if (/node_modules[\\/](@firebase|firebase|idb)[\\/]/.test(id)) return 'firebase'
          if (/node_modules[\\/](react|react-dom|react-router)/.test(id)) return 'react'
          return undefined
        },
      },
    },
  },
})
