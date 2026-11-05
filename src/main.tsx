import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from '@/App'
import '@/index.css'

// npm run dev:mock(--mode mock)일 때만 MSW 목 API를 켭니다. 운영 번들에는 들어가지 않습니다.
async function enableMocking() {
  if (import.meta.env.MODE !== 'mock') return
  const { worker } = await import('@/mocks/browser')
  await worker.start({ onUnhandledRequest: 'bypass' })
}

enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
