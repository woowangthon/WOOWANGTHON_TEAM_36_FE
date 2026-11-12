// 메일의 수신 거부 링크 화면 (계획서 7.4, T36). 로그인 없이 열리고, 버튼을 눌러야 끕니다.
import { fireEvent, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'

import { mockMe } from '@/mocks/data'
import { MOCK_UNSUBSCRIBE_TOKEN, resetMockState, signOut } from '@/mocks/handlers'
import { server } from '@/mocks/node'
import { renderApp } from '@/test/renderApp'

let posts = 0
beforeEach(() => {
  resetMockState()
  signOut() // 로그인 없이 열려야 함
  posts = 0
  server.events.on('request:start', ({ request }) => {
    if (request.method === 'POST' && request.url.endsWith('/api/notifications/unsubscribe')) posts++
  })
})
afterEach(() => server.events.removeAllListeners())

describe('수신 거부 화면', () => {
  it('열기만 해서는 끄지 않고, 버튼을 누르면 끈다', async () => {
    renderApp(`/unsubscribe?token=${MOCK_UNSUBSCRIBE_TOKEN}`)
    const button = await screen.findByRole('button', { name: '알림 메일 끄기' })
    expect(posts).toBe(0)

    fireEvent.click(button)

    expect(await screen.findByText('알림 메일을 껐어요')).toBeInTheDocument()
    expect(screen.getByText(/로그인 후 내 정보에서 켤 수 있어요/)).toBeInTheDocument()
    expect(posts).toBe(1)
  })

  it('잘못된 토큰이면 서버 문장을 보여 준다', async () => {
    renderApp('/unsubscribe?token=broken')
    fireEvent.click(await screen.findByRole('button', { name: '알림 메일 끄기' }))
    expect(await screen.findByText('유효하지 않은 링크입니다')).toBeInTheDocument()
  })

  it('토큰이 없으면 버튼 없이 안내한다', async () => {
    renderApp('/unsubscribe')
    expect(
      await screen.findByText('링크가 올바르지 않아요. 메일의 링크를 다시 눌러 주세요'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '알림 메일 끄기' })).not.toBeInTheDocument()
  })
})

describe('알림 메일 안내 문구 (4.2)', () => {
  it('개인정보처리방침에 알림 메일 이용 목적과 끄는 방법이 있다', async () => {
    renderApp('/privacy')
    expect(await screen.findByText(/장학금 알림 메일 발송에 사용합니다/)).toBeInTheDocument()
    expect(screen.getByText(/수신 거부 링크나 내 정보 화면에서 끌 수 있습니다/)).toBeInTheDocument()
  })

  it('동의 화면에 이메일을 장학금 알림 메일에도 쓴다고 적는다', async () => {
    server.use(
      http.get('/api/auth/me', () =>
        HttpResponse.json({ ...mockMe, privacy_agreed: false, profile_completed: false }),
      ),
    )
    renderApp('/consent')
    expect(await screen.findByText(/장학금 알림 메일/)).toBeInTheDocument()
  })
})
