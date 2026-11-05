import type { RouteObject } from 'react-router'

import HomePage from '@/pages/HomePage'
import NotFoundPage from '@/pages/NotFoundPage'

// 화면 경로와 라우팅 가드는 T24·T25에서 추가합니다(frontend CLAUDE.md "라우팅 가드").
export const routes: RouteObject[] = [
  { path: '/', element: <HomePage /> },
  { path: '*', element: <NotFoundPage /> },
]
