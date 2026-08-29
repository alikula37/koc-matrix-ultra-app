import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
// Renderer-only Vite (hızlı HMR) — Electron için electron.vite.config.ts kullan
// Alias: @/ -> src/renderer, @/services -> frontend/lib
export default defineConfig({
  root: '.',
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/renderer'),
      '@/components': resolve(__dirname, 'src/renderer/components'),
      '@/lib': resolve(__dirname, 'src/renderer/lib'),
      '@/services': resolve(__dirname, 'frontend/lib'),
      '@/frontend': resolve(__dirname, 'frontend'),
      '@frontend': resolve(__dirname, 'frontend'),
    },
  },
  server: {
    port: 5173,
    host: true,
    strictPort: true,
  },
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: false,
  },
})
