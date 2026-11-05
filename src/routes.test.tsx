import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'

import { routes } from '@/routes'

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />)
}

describe('routes', () => {
  it('첫 화면을 보여 준다', () => {
    renderAt('/')
    expect(screen.getByRole('heading', { name: '장학금 매칭' })).toBeInTheDocument()
  })

  it('없는 경로는 404 화면을 보여 준다', () => {
    renderAt('/no-such-page')
    expect(screen.getByRole('heading', { name: '페이지를 찾을 수 없습니다' })).toBeInTheDocument()
  })
})
