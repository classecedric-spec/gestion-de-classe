import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'service-worker.js',
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Gestion de Classe',
        short_name: 'GestionClasse',
        description: 'Application de gestion de classe et suivi des compétences',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024 // 5MB
      }
    })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-pdf': ['@react-pdf/renderer', 'pdf-lib'],
          'vendor': ['react', 'react-dom', 'react-router-dom', 'lucide-react', 'exceljs', '@supabase/supabase-js']
        }
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
  },
})
