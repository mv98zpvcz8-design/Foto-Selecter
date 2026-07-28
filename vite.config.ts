import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: 'opticsbydom · Foto-Selecter',
        short_name: 'Foto-Selecter',
        description: 'Lokale RAW/JPEG-Fotoauswahl — läuft komplett offline im Browser.',
        lang: 'de',
        theme_color: '#0c0c0e',
        background_color: '#0c0c0e',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // face-api's bundled TF.js chunk (~1.3MB) and the model weight
        // files need to be precached too, not just app-shell JS/CSS, so
        // face/eye detection keeps working with no connection at all —
        // this is meant to be usable on location at a shoot without wifi.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,json,bin}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // Workbox's default SPA navigateFallback serves the cached
        // index.html for any navigation that isn't a precached asset —
        // that silently swallowed full-page navigations to /api/auth/login
        // (an OAuth redirect, not an SPA route), making the service worker
        // return a cached 200 page instead of ever reaching Vercel.
        navigateFallbackDenylist: [/^\/api\//],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
})
