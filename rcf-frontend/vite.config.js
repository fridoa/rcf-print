import { defineConfig } from 'vitest/config'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// defineConfig diambil dari 'vitest/config', bukan 'vite'.
// Alasannya: blok `test` di bawah bukan opsi Vite — versi dari 'vite'
// tidak mengenalinya (tanpa tipe, dan bisa dianggap key asing).
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    // Proxy dev: request /api/... diteruskan ke backend lokal.
    // Tujuannya supaya di dev tidak perlu CORS dan cookie/origin tetap sama.
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    css: false,
  },
})
