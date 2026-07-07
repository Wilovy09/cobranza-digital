import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import { VitePWA } from 'vite-plugin-pwa'

const base = '/cobranza-digital/'

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [
    vue(),
    vueDevTools(),
    VitePWA({
      base,
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'Cobranza Digital',
        short_name: 'Cobranza',
        start_url: base,
        scope: base,
        display: 'standalone',
        background_color: '#f2e9d8',
        theme_color: '#1f5a58',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
        // El Designer de plantillas (@pdfme/ui) trae un motor WASM de renderizado
        // de PDF (clawpdf) que pesa varios MB. Se carga on-demand al abrir el
        // editor, no tiene sentido meterlo en el precache del service worker.
        globIgnores: ['**/clawpdf-worker-*.js', '**/PlantillaEditorView-*.js'],
        // Chunks compartidos de @pdfme/generator también son pesados (~2-3MB).
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
