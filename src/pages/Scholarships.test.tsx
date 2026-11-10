import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { delay, http, HttpResponse } from 'msw'

import { resetMockState } from '@/mocks/handlers'
import { server } from '@/mocks/node'
import { renderApp } from '@/test/renderApp'

beforeEach(() => resetMockState())

/** 목록 카드의 장학금 이름을 화면 순서대로. */
function cardNames() {
  return screen
    .getAllByRole('listitem')
    .map((li) => within(li).queryByRole('heading')?.textContent)
    .filter(Boolean)
}

async function waitForCards(...names: string[]) {
  await waitFor(() => expect(screen.queryByLabelText('불러오는 중')).not.toBeInTheDocument())
  for (const name of names) {
    await waitFor(() => expect(screen.getByText(name)).toBeInTheDocument())
  }
}

describe('대시보드', () => {
  it('탭을 바꾸면 판정 결과별 목록을 보여 준다', async () => {
    renderApp('/dashboard')
    await waitForCards('두산연강재단 장학금', '희망사다리 장학금 II유형')
    expect(screen.queryByText('논산시 인재육성 장학금')).not.toBeInTheDocument()
    expect(screen.queryByText('2026년 2학기 국가근로장학금')).not.toBeInTheDocument() // 마감

    fireEvent.click(screen.getByRole('tab', { name: '확인 필요' }))
    await waitForCards('논산시 인재육성 장학금', '푸른등대 기부장학금')
    expect(screen.getByRole('tab', { name: '확인 필요' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('마감일 확인 필요')).toBeInTheDocument() // deadline_conflict
    expect(screen.queryByText('두산연강재단 장학금')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: '전체' }))
    await waitForCards('여성공학인 장학금', 'AI부트캠프 양성인재 학업장려금')
    expect(screen.getByText('상시·확인 필요')).toBeInTheDocument() // ALWAYS
    expect(screen.getAllByText('지원 불가').length).toBeGreaterThan(0)
  })

  it('정렬과 필터를 바꾼다', async () => {
    const app = renderApp('/dashboard')
    await waitForCards('두산연강재단 장학금')
    expect(cardNames()).toEqual(['두산연강재단 장학금', '희망사다리 장학금 II유형'])

    const sortGroup = screen.getByRole('group', { name: '정렬' })
    fireEvent.click(within(sortGroup).getByRole('button', { name: '최신순' }))
    expect(within(sortGroup).getByRole('button', { name: '최신순' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await waitFor(() =>
      expect(cardNames()).toEqual(['희망사다리 장학금 II유형', '두산연강재단 장학금']),
    )
    expect(app.router.state.location.search).toBe('?sort=latest')

    fireEvent.click(
      within(screen.getByRole('group', { name: '출처' })).getByRole('button', { name: '교내' }),
    )
    await waitFor(() => expect(cardNames()).toEqual(['두산연강재단 장학금']))
  })

  it('장학금 이름으로 검색한다', async () => {
    const app = renderApp('/dashboard')
    await waitForCards('두산연강재단 장학금')
    const box = screen.getByRole('searchbox', { name: '장학금 검색' })

    fireEvent.change(box, { target: { value: '희망 사다리' } })
    await waitFor(() => expect(cardNames()).toEqual(['희망사다리 장학금 II유형']))
    expect(screen.getByText(/검색 결과 1건/)).toBeInTheDocument()
    await waitFor(() => expect(app.router.state.location.search).toContain('q='))

    fireEvent.change(box, { target: { value: '없는장학금' } })
    expect(await screen.findByText(/검색 결과가 없습니다/)).toBeInTheDocument()

    fireEvent.change(box, { target: { value: '' } })
    await waitFor(() =>
      expect(cardNames()).toEqual(['두산연강재단 장학금', '희망사다리 장학금 II유형']),
    )
  })

  it('목록을 불러오는 동안 스켈레톤을 보여 준다', async () => {
    server.use(
      http.get('/api/scholarships', async () => {
        await delay(50)
        return HttpResponse.json({ items: [] })
      }),
    )
    renderApp('/dashboard')
    expect(await screen.findByLabelText('불러오는 중')).toHaveAttribute('aria-busy', 'true')
    expect(await screen.findByText(/지원 가능한 장학금이 없습니다/)).toBeInTheDocument()
  })
})

describe('상세', () => {
  it('조건별 체크리스트·근거·제출 서류·같은 공지의 다른 장학금을 보여 준다', async () => {
    renderApp('/scholarships/2')
    const checklist = await screen.findByRole('list', { name: '조건 체크리스트' })
    const items = within(checklist).getAllByRole('listitem')
    expect(items).toHaveLength(3) // 조건 2개 + 추가 조건 1개
    expect(within(items[0]).getByRole('img', { name: '충족' })).toBeInTheDocument()
    expect(within(items[0]).getByText('부모가 논산시에 1년 이상 거주한 학생')).toBeInTheDocument()
    expect(within(items[1]).getByRole('img', { name: '확인 필요' })).toBeInTheDocument()
    expect(within(items[2]).getByText('직전학기 봉사활동 20시간 이상')).toBeInTheDocument()

    expect(screen.getByText('주민등록등본')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '두산연강재단 장학금' })).toHaveAttribute(
      'href',
      '/scholarships/1',
    )
    expect(screen.getByRole('link', { name: /교외장학금 3종 모집/ })).toHaveAttribute(
      'target',
      '_blank',
    )
    expect(screen.getByText(/다른 게시판에도 같은 장학금이 있을 수 있습니다/)).toBeInTheDocument()
  })

  it('근거 출처와 읽지 못한 첨부를 보여 준다', async () => {
    renderApp('/scholarships/6')
    const checklist = await screen.findByRole('list', { name: '조건 체크리스트' })
    expect(
      within(checklist).getByText('출처: 첨부 업무처리기준.zip / 업무처리기준.pdf'),
    ).toBeInTheDocument()
    expect(within(checklist).getByText('출처: 공지 본문')).toBeInTheDocument()

    const unread = screen.getByRole('list', { name: '읽지 못한 첨부' })
    const link = within(unread).getByRole('link', { name: /추천서 양식\.jpg/ })
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('href', expect.stringContaining('kosaf.go.kr'))
    expect(within(unread).getByText('읽을 수 없는 파일 형식')).toBeInTheDocument()
    expect(screen.getByText(/공고문이 길어 뒷부분 일부는 읽지 못했어요/)).toBeInTheDocument()
  })

  it('첨부를 모두 읽었으면 첨부 안내를 보여 주지 않는다', async () => {
    renderApp('/scholarships/1')
    await screen.findByRole('list', { name: '조건 체크리스트' })
    expect(screen.queryByText('첨부파일을 직접 확인하세요')).not.toBeInTheDocument()
    expect(screen.queryByText(/^출처:/)).not.toBeInTheDocument()
  })

  it('불충족 조건은 ✗로 표시한다', async () => {
    renderApp('/scholarships/3')
    const checklist = await screen.findByRole('list', { name: '조건 체크리스트' })
    expect(within(checklist).getByRole('img', { name: '불충족' })).toBeInTheDocument()
  })

  it('없는 장학금은 안내를 보여 준다', async () => {
    renderApp('/scholarships/999')
    expect(await screen.findByText('장학금을 찾을 수 없습니다.')).toBeInTheDocument()
  })
})

describe('관심·신청완료', () => {
  it('관심을 누르면 바로 반영되고 내 장학금에 나타난다', async () => {
    let release!: () => void
    const gate = new Promise<void>((resolve) => (release = resolve))
    // 응답을 붙잡아 두었다가 기본 목 핸들러로 넘깁니다(반환값이 없으면 다음 핸들러가 처리).
    server.use(
      http.put('/api/scholarships/:id/state', async () => {
        await gate
      }),
    )
    const app = renderApp('/scholarships/3')
    fireEvent.click(await screen.findByRole('button', { name: '관심' }))
    // 서버 응답 전에 이미 반영됨 (optimistic update)
    expect(await screen.findByRole('button', { name: '관심 해제' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    release()

    await app.router.navigate('/my')
    await waitForCards('여성공학인 장학금', '두산연강재단 장학금')
  })

  it('저장에 실패하면 되돌리고 오류를 보여 준다', async () => {
    server.use(
      http.put('/api/scholarships/:id/state', async () => {
        await delay(30)
        return HttpResponse.json({ detail: '오류' }, { status: 500 })
      }),
    )
    renderApp('/scholarships/2')
    const button = await screen.findByRole('button', { name: '신청완료' })
    // 실패 뒤 다시 불러오기는 늦게 오게 해서, 되돌림이 캐시 복원으로 일어났는지 확인합니다.
    server.use(
      http.get('/api/scholarships/:id', async () => {
        await delay(500)
      }),
    )
    fireEvent.click(button)
    expect(await screen.findByRole('button', { name: '신청완료 취소' })).toBeInTheDocument()

    expect(await screen.findByText(/저장하지 못했습니다/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '신청완료' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('상세에 숨기기 버튼이 없다', async () => {
    renderApp('/scholarships/3')
    await screen.findByRole('button', { name: '관심' })
    expect(screen.queryByRole('button', { name: '숨기기' })).not.toBeInTheDocument()
  })
})

describe('내 장학금', () => {
  it('관심·신청완료 목록을 보여 주고 마감된 장학금도 포함한다', async () => {
    renderApp('/my')
    await waitForCards('두산연강재단 장학금')
    expect(screen.queryByText('2026년 2학기 국가근로장학금')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: '신청완료' }))
    await waitForCards('2026년 2학기 국가근로장학금')
    expect(screen.getByText('마감')).toBeInTheDocument()
    expect(screen.queryByText('두산연강재단 장학금')).not.toBeInTheDocument()
  })
})
