import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname), '')
  const apiOrigin = env.VITE_DEV_API_ORIGIN || 'http://127.0.0.1:5174'
  const apiWs = apiOrigin.replace(/^http/, 'ws')

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: apiOrigin,
          changeOrigin: true,
        },
        '/socket.io': {
          target: apiWs,
          ws: true,
        },
      },
    },
  }
})
