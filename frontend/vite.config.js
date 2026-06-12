import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.BACKEND_URL || 'http://localhost:3002',
        changeOrigin: true,
      },
      '/uploads': {
        target: process.env.BACKEND_URL || 'http://localhost:3002',
        changeOrigin: true,
      },
    }
  }
})
