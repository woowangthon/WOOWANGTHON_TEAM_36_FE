import { fireEvent, screen, waitFor, within } from '@testing-library/react'

import { resetMockState } from '@/mocks/handlers'
import { server } from '@/mocks/node'
import { renderApp } from '@/test/renderApp'

beforeEach(() => resetMockState())

describe('상단 프로필 아이콘과 내 정보 화면', () => {
  it('프로필 아이콘을 누르면 내 정보 화면으로 간다', async () => {
    const app = renderApp('/dashboard')
    fireEvent.click(await screen.findByRole('link', { name: '내 정보' }))
    await waitFor(() => expect(app.path()).toBe('/my'))
    expect(await screen.findByRole('heading', { name: '내 정보' })).toBeInTheDocument()
  })

  it('내 정보 화면에 프로필 요약과 내 장학금이 함께 보인다', async () => {
    renderApp('/my')
    const summary = await screen.findByRole('region', { name: '프로필 요약' })
    expect(await within(summary).findByText('김충북')).toBeInTheDocument()
    expect(within(summary).getByText(/5학기 이수/)).toBeInTheDocument()
    expect(within(summary).queryByText(/소득/)).not.toBeInTheDocument() // 민감정보는 요약에서 뺌
    // 회원 번호로 고른 우왕이 캐릭터 (T58, 목 회원 번호 1 → 기본 우왕이)
    expect(
      within(summary).getByRole('img', { name: '프로필 캐릭터: 기본 우왕이' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '내 장학금' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '관심' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: '관리자 화면' })).not.toBeInTheDocument()
  })

  it('프로필 수정을 누르면 입력 폼으로 가고, 이전 버튼으로 내 정보에 돌아온다', async () => {
    const app = renderApp('/my')
    fireEvent.click(await screen.findByRole('link', { name: '프로필 수정' }))
    await screen.findByRole('heading', { name: '내 프로필' })
    expect(app.path()).toBe('/profile')
    fireEvent.click(screen.getByRole('link', { name: '내 정보로' }))
    await waitFor(() => expect(app.path()).toBe('/my'))
  })

  it('내 정보 화면은 /auth/me로 요약을 보여 주고 프로필 API를 부르지 않는다', async () => {
    const profileCalls: string[] = []
    server.events.on('request:start', ({ request }) => {
      if (new URL(request.url).pathname === '/api/profile') profileCalls.push(request.method)
    })
    renderApp('/my')
    const summary = await screen.findByRole('region', { name: '프로필 요약' })
    expect(within(summary).getByText('김충북')).toBeInTheDocument()
    expect(within(summary).getByText(/직전학기 평점 3.8/)).toBeInTheDocument()
    await screen.findByRole('tab', { name: '관심' })
    expect(profileCalls).toEqual([])
    server.events.removeAllListeners()
  })

  it('내 정보 화면의 이전 버튼으로 장학금 목록에 돌아간다', async () => {
    const app = renderApp('/my')
    fireEvent.click(await screen.findByRole('link', { name: '장학금 목록으로' }))
    await waitFor(() => expect(app.path()).toBe('/dashboard'))
  })

  it('로그아웃하면 로그인 화면으로 간다', async () => {
    const app = renderApp('/my')
    fireEvent.click(await screen.findByRole('button', { name: '로그아웃' }))
    await waitFor(() => expect(app.path()).toBe('/login'))
  })
})
