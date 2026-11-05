/// <reference types="vitest/config" />
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// 앱 코드는 항상 /api만 호출합니다(계획서 9.2). 로컬은 이 프록시가, 배포는 vercel.json이 backend로 넘깁니다.
// 컨테이너 안에서는 localhost:8000이 backend가 아니므로 API_PROXY_TARGET으로 바꿉니다
// (backend의 docker compose --profile full이 http://backend:8000을 넘김, 계획서 8.3).
// 브라우저에 노출되지 않도록 VITE_ 접두어를 붙이지 않습니다.
const apiProxyTarget = process.env.API_PROXY_TARGET ?? 'http://localhost:8000'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      // vercel.json과 똑같이 /api 접두어를 떼고 넘깁니다(/api/health → backend /health).
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
})
