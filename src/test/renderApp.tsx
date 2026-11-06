import { QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'

import { createQueryClient } from '@/lib/queryClient'
import { routes } from '@/routes'

/** 실제 라우트·가드·쿼리 캐시로 앱을 그립니다. router.state.location으로 현재 경로를 확인합니다. */
export function renderApp(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const queryClient = createQueryClient()
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return { router, path: () => router.state.location.pathname }
}
