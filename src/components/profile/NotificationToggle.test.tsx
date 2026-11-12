// 알림 메일 수신 토글 (계획서 7.4, T36). 내 정보(프로필 수정) 화면 계정 영역에 있습니다.
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'

import { resetMockState } from '@/mocks/handlers'
import { server } from '@/mocks/node'
import { renderApp } from '@/test/renderApp'

beforeEach(() => resetMockState())
afterEach(() => server.events.removeAllListeners())

describe('알림 메일 수신 토글', () => {
  it('현재 설정을 보여 주고, 누르면 바로 끄고 서버에 저장한다', async () => {
    let body: unknown = null
    server.events.on('request:start', async ({ request }) => {
      if (request.method === 'PUT' && request.url.endsWith('/api/auth/me/notifications')) {
        body = await request.clone().json()
      }
    })
    renderApp('/profile')
    const toggle = await screen.findByRole('switch', { name: '장학금 알림 메일 받기' })
    expect(toggle).toHaveAttribute('aria-checked', 'true')

    fireEvent.click(toggle)

    await waitFor(() => expect(toggle).toHaveAttribute('aria-checked', 'false'))
    await waitFor(() => expect(body).toEqual({ email_notifications: false }))
  })

  it('저장에 실패하면 원래 값으로 되돌리고 알린다', async () => {
    server.use(
      http.put('/api/auth/me/notifications', () =>
        HttpResponse.json({ detail: '서버 오류' }, { status: 500 }),
      ),
    )
    renderApp('/profile')
    const toggle = await screen.findByRole('switch', { name: '장학금 알림 메일 받기' })

    fireEvent.click(toggle)

    await waitFor(() => expect(toggle).toHaveAttribute('aria-checked', 'true'))
    expect(await screen.findByText('서버 오류')).toBeInTheDocument()
  })
})
