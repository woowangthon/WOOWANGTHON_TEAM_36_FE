import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { delay, http, HttpResponse } from 'msw'

import { resetMockState, signInAsAdmin } from '@/mocks/handlers'
import { server } from '@/mocks/node'
import { renderApp } from '@/test/renderApp'

beforeEach(() => resetMockState())

describe('관리자 화면', () => {
  it('관리자가 아니면 화면과 메뉴를 숨기고 관리자 API를 부르지 않는다', async () => {
    const adminCalls: string[] = []
    server.events.on('request:start', ({ request }) => {
      if (new URL(request.url).pathname.startsWith('/api/admin')) adminCalls.push(request.url)
    })
    const app = renderApp('/admin')
    await waitFor(() => expect(app.path()).toBe('/dashboard'))
    expect(await screen.findByRole('heading', { name: '맞춤 장학금' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: '관리' })).not.toBeInTheDocument()
    expect(adminCalls).toEqual([])
    server.events.removeAllListeners()
  })

  it('비로그인이면 로그인 화면으로 보낸다', async () => {
    server.use(http.get('/api/auth/me', () => HttpResponse.json({}, { status: 401 })))
    const app = renderApp('/admin')
    await waitFor(() => expect(app.path()).toBe('/login'))
  })

  it('사이트별 마지막 수집과 추출 실패·최근 공지를 보여 준다', async () => {
    signInAsAdmin()
    renderApp('/admin')
    expect(await screen.findByRole('heading', { name: '관리자' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '관리' })).toBeInTheDocument()

    const runs = screen.getByRole('heading', { name: '사이트별 마지막 수집' }).parentElement!
    expect(within(runs).getByText('HTTP 503')).toBeInTheDocument() // KOSAF 실패 오류
    expect(within(runs).getAllByText('성공')).toHaveLength(2)

    const attention = screen.getByRole('list', { name: '추출 실패·대기 공지' })
    expect(within(attention).getByText('추출 실패')).toBeInTheDocument()
    expect(within(attention).getByText(/국가장학금 2차 신청/)).toBeInTheDocument()
    const recent = screen.getByRole('list', { name: '최근 공지' })
    expect(within(recent).getAllByRole('listitem')).toHaveLength(2)
    expect(within(recent).getByText('장학금 3개')).toBeInTheDocument()
  })

  it('재추출을 누르면 "재추출 대기"로 바뀌고 다음 수집 때 처리한다고 안내한다', async () => {
    signInAsAdmin()
    renderApp('/admin')
    const recent = await screen.findByRole('list', { name: '최근 공지' })
    const row = within(recent)
      .getByText(/교외장학금 3종 모집/)
      .closest('li')!
    fireEvent.click(within(row).getByRole('button', { name: '재추출' }))

    // 대기 공지는 위쪽 목록으로 옮겨집니다.
    const attention = await screen.findByRole('list', { name: '추출 실패·대기 공지' })
    const moved = await within(attention).findByText(/교외장학금 3종 모집/)
    const movedRow = moved.closest('li')!
    expect(within(movedRow).getByRole('button', { name: '재추출 대기' })).toBeDisabled()
    expect(within(movedRow).getByText('다음 수집 때 처리됩니다.')).toBeInTheDocument()
  })

  it('재추출 요청이 실패하면 오류를 보여 준다', async () => {
    signInAsAdmin()
    server.use(
      http.post('/api/admin/notices/:id/reextract', async () => {
        await delay(10)
        return HttpResponse.json({ detail: '공지를 찾을 수 없습니다' }, { status: 404 })
      }),
    )
    renderApp('/admin')
    const attention = await screen.findByRole('list', { name: '추출 실패·대기 공지' })
    fireEvent.click(within(attention).getByRole('button', { name: '재추출' }))
    expect(await screen.findByText('공지를 찾을 수 없습니다')).toBeInTheDocument()
    expect(within(attention).getByRole('button', { name: '재추출' })).toBeEnabled()
  })
})
