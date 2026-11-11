import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { delay, http, HttpResponse } from 'msw'

import { mockDetails } from '@/mocks/data'
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

    const sortSelect = screen.getByRole('combobox', { name: '정렬' })
    fireEvent.change(sortSelect, { target: { value: 'latest' } })
    expect(sortSelect).toHaveValue('latest')
    await waitFor(() =>
      expect(cardNames()).toEqual(['희망사다리 장학금 II유형', '두산연강재단 장학금']),
    )
    expect(app.router.state.location.search).toBe('?sort=latest')

    fireEvent.change(screen.getByRole('combobox', { name: '출처' }), {
      target: { value: 'internal' },
    })
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
    // 원문 링크는 원문 보기 안에만 있습니다(제목은 글자로만).
    expect(screen.getByText(/교외장학금 3종 모집/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /교외장학금 3종 모집/ })).not.toBeInTheDocument()
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

  it('원문 보기를 누르면 공지 본문과 읽은 첨부를 같은 페이지에서 보여 준다', async () => {
    renderApp('/scholarships/1')
    const toggle = await screen.findByRole('button', { name: '원문 보기' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('region', { name: '공지 원문' })).not.toBeInTheDocument()

    fireEvent.click(toggle)
    const original = screen.getByRole('region', { name: '공지 원문' })
    expect(
      within(original).getByText(/교외장학금 3종 장학생을 아래와 같이 모집/),
    ).toBeInTheDocument()
    expect(
      within(original).getByRole('heading', { name: /첨부 · 2026-2 교외장학금 공고문\.hwp/ }),
    ).toBeInTheDocument()
    expect(
      within(original).getByText(/두산연강재단 장학금 \| 2명 \| 등록금 전액/),
    ).toBeInTheDocument()
    expect(within(original).getByRole('link', { name: '내려받기' })).toHaveAttribute(
      'target',
      '_blank',
    )

    expect(within(original).getByRole('link', { name: '원문 사이트에서 보기' })).toHaveAttribute(
      'href',
      expect.stringContaining('software.cbnu.ac.kr'),
    )

    fireEvent.click(screen.getByRole('button', { name: '원문 접기' }))
    expect(screen.queryByRole('region', { name: '공지 원문' })).not.toBeInTheDocument()
  })

  it('저장된 본문과 첨부가 모두 없으면 원문 보기를 숨긴다', async () => {
    const [first] = mockDetails
    server.use(
      http.get('/api/scholarships/:id', () =>
        HttpResponse.json({
          ...first,
          notice: { ...first.notice, body_text: '', attachments: [] },
        }),
      ),
    )
    renderApp('/scholarships/1')
    await screen.findByRole('list', { name: '조건 체크리스트' })
    expect(screen.queryByRole('button', { name: '원문 보기' })).not.toBeInTheDocument()
    // 원문 보기가 없으면 제목이 원문 링크가 됩니다.
    expect(screen.getByRole('link', { name: /교외장학금 3종 모집/ })).toHaveAttribute(
      'target',
      '_blank',
    )
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
    // 관심은 목록 카드의 하트로 켭니다 (T54)
    const app = renderApp('/dashboard?tab=all')
    await waitForCards('여성공학인 장학금')
    const card = () => screen.getByText('여성공학인 장학금').closest('li')!
    fireEvent.click(within(card()).getByRole('button', { name: '관심' }))
    // 서버 응답 전에 이미 반영됨 (optimistic update). 캐시를 바꾸는 onMutate가 비동기라 기다려서 찾습니다.
    expect(await within(card()).findByRole('button', { name: '관심 해제' })).toHaveAttribute(
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
    await screen.findByRole('button', { name: '신청완료' })
    expect(screen.queryByRole('button', { name: '숨기기' })).not.toBeInTheDocument()
    // 관심은 목록 카드 하트로 옮겨 상세에는 없음 (T54)
    expect(screen.queryByRole('button', { name: '관심' })).not.toBeInTheDocument()
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

describe('사이드바 (T40)', () => {
  it('초기화를 누르면 정렬·출처·지원 형태가 기본값으로 돌아간다', async () => {
    const app = renderApp('/dashboard?sort=latest&source=internal&q=장학')
    const reset = await screen.findByRole('button', { name: '초기화' })
    fireEvent.click(reset)
    await waitFor(() => expect(app.router.state.location.search).toBe('?q=%EC%9E%A5%ED%95%99'))
    expect(screen.getByRole('button', { name: '초기화' })).toBeDisabled()
  })

  it('공지 출처와 학사·서류 바로가기를 새 창 링크로 보여 준다', async () => {
    renderApp('/dashboard')
    const sources = await screen.findByRole('region', { name: '공지 출처 바로가기' })
    expect(within(sources).getAllByRole('link')).toHaveLength(3)
    const academic = screen.getByRole('region', { name: '학사·서류' })
    for (const link of within(academic).getAllByRole('link')) {
      expect(link).toHaveAttribute('target', '_blank')
    }
  })
})
