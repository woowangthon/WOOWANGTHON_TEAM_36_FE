import { screen, waitFor } from '@testing-library/react'

import { resetMockState, startLoggedOut } from '@/mocks/handlers'
import { renderApp } from '@/test/renderApp'

beforeEach(() => resetMockState())

describe('routes', () => {
  it('첫 화면은 로그인 상태에 맞는 화면으로 보낸다', async () => {
    const app = renderApp('/')
    await waitFor(() => expect(app.path()).toBe('/dashboard'))
  })

  it('비로그인으로 첫 화면에 오면 로그인 화면으로 보낸다', async () => {
    startLoggedOut()
    const app = renderApp('/')
    await screen.findByRole('heading', { name: '로그인' })
    expect(app.path()).toBe('/login')
  })

  it('없는 경로는 404 화면을 보여 준다', async () => {
    renderApp('/no-such-page')
    expect(
      await screen.findByRole('heading', { name: '페이지를 찾을 수 없습니다' }),
    ).toBeInTheDocument()
  })
})
