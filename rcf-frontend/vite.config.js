import { defineConfig } from 'vitest/config'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// defineConfig diambil dari 'vitest/config', bukan 'vite'.
// Alasannya: blok `test` di bawah bukan opsi Vite — versi dari 'vite'
// tidak mengenalinya (tanpa tipe, dan bisa dianggap key asing).

// Target proxy dibuat bisa di-override lewat env karena alamat backend
// berbeda tergantung cara menjalankan:
//   npm run dev di host   → http://localhost:3000
//   docker compose        → http://backend:3000  (nama service, bukan localhost;
//                           di dalam container, localhost adalah container itu sendiri)
const apiProxyTarget = process.env.VITE_PROXY_TARGET || 'http://localhost:3000'

// Bind mount di Docker Desktop (Windows/macOS) tidak meneruskan inotify,
// jadi HMR diam saja meski file berubah. Polling menyalakannya kembali,
// tapi hanya dinyalakan kalau diminta — polling memakan CPU terus-menerus.
const usePolling = process.env.VITE_USE_POLLING === 'true'

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
        target: apiProxyTarget,
        changeOrigin: true,
      },
    },
    watch: usePolling ? { usePolling: true, interval: 300 } : undefined,
    // HMR websocket perlu tahu port yang dipublish ke host, kalau tidak
    // browser mencoba menyambung ke port dalam container.
    hmr: { clientPort: Number(process.env.VITE_HMR_CLIENT_PORT) || 5173 },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    css: false,
  },
})
