import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: process.env.VITE_DEPLOY_TARGET === 'github-pages' ? '/ishtira-v1/' : '/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icons/ishtira.svg'],
      manifest: {
        name: 'Ishtira — ইশতিরা',
        short_name: 'Ishtira',
        description: 'Smart shopping list and expense tracker',
        theme_color: '#087f5b',
        background_color: '#f5f8f6',
        display: 'standalone',
        start_url: '/',
        icons: [{ src: 'icons/ishtira.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }]
      },
      workbox: { navigateFallback: '/index.html', globPatterns: ['**/*.{js,css,html,svg,webmanifest}'] }
    })
  ]
});
