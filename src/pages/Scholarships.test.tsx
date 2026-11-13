import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { delay, http, HttpResponse } from 'msw'

import { mockDetails, mockMe, toSummary } from '@/mocks/data'
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
    expect(screen.queryByText('국가근로장학금')).not.toBeInTheDocument() // 마감

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

  it('다른 게시판에도 올라온 장학금은 카드에 함께 알린다 (T46)', async () => {
    renderApp('/dashboard')
    await waitForCards('두산연강재단 장학금')
    const card = screen.getByRole('heading', { name: '두산연강재단 장학금' }).closest('li')!
    expect(within(card).getByText('한국장학재단에도 게시됨')).toBeInTheDocument()
    expect(screen.getAllByText(/에도 게시됨$/)).toHaveLength(1)
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

describe('쉬운 이름 (계획서 5.2)', () => {
  it('카드에는 쉬운 이름을 보여 주고 원래 이름으로도 검색된다', async () => {
    renderApp('/')
    await waitForCards('두산연강재단 장학금')
    expect(
      screen.queryByText('2026학년도 2학기 (재)두산연강재단 장학생 선발'),
    ).not.toBeInTheDocument()
    fireEvent.change(screen.getByRole('searchbox', { name: '장학금 검색' }), {
      target: { value: '연강재단 장학생 선발' },
    })
    await waitFor(() => expect(cardNames()).toEqual(['두산연강재단 장학금']))
  })
})

describe('직접 답하는 조건 (계획서 5.3)', () => {
  const button = (state: string) =>
    screen.findByRole('button', { name: `거주 기간 답 바꾸기, 지금: ${state}` })

  it('아이콘을 누를 때마다 모름 → 충족 → 미충족 → 모름으로 바뀌고 판정도 바뀐다', async () => {
    renderApp('/scholarships/8')
    const list = await screen.findByRole('list', { name: '직접 답하는 조건' })
    expect(within(list).getByText('눌러서 답하기')).toBeInTheDocument()
    expect(within(list).getByText('청주시에 1년 이상 주민등록이 되어 있는 자')).toBeInTheDocument()

    fireEvent.click(await button('모름'))
    expect(await button('충족')).toBeInTheDocument()
    expect(await screen.findByText('지원 가능')).toBeInTheDocument()
    expect(screen.getByText('본인 확인 포함')).toBeInTheDocument()

    fireEvent.click(await button('충족'))
    expect(await button('미충족')).toBeInTheDocument()
    expect(await screen.findByText('지원 불가')).toBeInTheDocument()

    fireEvent.click(await button('미충족'))
    expect(await button('모름')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText('지원 불가')).not.toBeInTheDocument())
    expect(screen.queryByText('본인 확인 포함')).not.toBeInTheDocument()
  })

  it('저장에 실패하면 아이콘을 되돌리고 안내한다', async () => {
    server.use(
      http.put('/api/scholarships/:id/conditions/:key', async () => {
        await delay(20)
        return HttpResponse.json({ detail: '서버 오류' }, { status: 500 })
      }),
    )
    renderApp('/scholarships/8')
    fireEvent.click(await button('모름'))
    expect(await button('충족')).toBeInTheDocument() // 먼저 반영
    expect(
      await screen.findByText('저장하지 못했습니다. 잠시 후 다시 시도하세요.'),
    ).toBeInTheDocument()
    expect(await button('모름')).toBeInTheDocument()
  })
})

describe('대시보드 빠른 확인 (계획서 7.1)', () => {
  beforeEach(() => sessionStorage.clear())
  const card = () => screen.findByRole('region', { name: '빠른 확인' })

  it('open_conditions가 누락되거나 null인 장학금도 목록에 표시한다', async () => {
    const summary = (id: number) => toSummary(mockDetails.find((item) => item.id === id)!)
    server.use(
      http.get('/api/scholarships', () =>
        HttpResponse.json({
          items: [
            { ...summary(8), open_conditions: undefined },
            { ...summary(9), open_conditions: null },
            summary(10),
          ],
        }),
      ),
    )
    renderApp('/dashboard?tab=conditional')

    expect(
      await screen.findByRole('heading', { name: '청주시 미래인재 장학금' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '글로벌 SW 인재 장학금' })).toBeInTheDocument()
    const quickCheck = within(await card())
    expect(quickCheck.getByText('1/1')).toBeInTheDocument()
    expect(
      quickCheck.getByText('답하면 ‘해외 연수 지원 장학금’의 지원 가능 여부를 바로 알려 드려요.'),
    ).toBeInTheDocument()
  })

  it('같은 문장은 한 번만 묻고, 답하면 묶인 장학금이 모두 정해진다', async () => {
    renderApp('/dashboard?tab=conditional')
    const first = await card()
    expect(within(first).getByText('1/2')).toBeInTheDocument()
    // 질문은 요약(extract_v10)으로, 공지 원문은 대조할 수 있게 아래에 작게 보여 줍니다
    expect(within(first).getByText('TOEIC 500점 이상인 학생')).toBeInTheDocument()
    expect(within(first).getByText('※ 2026-1학기 TOEIC 점수 500점 이상 취득')).toBeInTheDocument()
    expect(
      within(first).getByText(
        '답하면 ‘글로벌 SW 인재 장학금’ 외 1개의 지원 가능 여부를 바로 알려 드려요.',
      ),
    ).toBeInTheDocument()

    fireEvent.click(within(first).getByRole('button', { name: '안 맞아요' }))
    // 두 장학금 모두 지원 불가가 되어 확인 필요 탭에서 빠집니다
    await waitFor(() => {
      expect(screen.queryByText('글로벌 SW 인재 장학금')).not.toBeInTheDocument()
      expect(screen.queryByText('해외 연수 지원 장학금')).not.toBeInTheDocument()
    })

    const second = await card()
    expect(within(second).getByText('2/2')).toBeInTheDocument()
    expect(
      within(second).getByText('청주시에 1년 이상 주민등록이 되어 있는 자'),
    ).toBeInTheDocument()
  })

  it.each([
    ['다른 계정', 'other@example.com'],
    ['탈퇴 뒤 같은 이메일로 재가입한 계정', mockMe.email],
  ])('%s에는 이전 계정이 답한 질문도 보여 준다', async (_account, email) => {
    renderApp('/dashboard?tab=conditional')
    fireEvent.click(within(await card()).getByRole('button', { name: '맞아요' }))
    expect(await screen.findByText('청주시에 1년 이상 주민등록이 되어 있는 자')).toBeInTheDocument()

    // 같은 브라우저 탭에서 새 로그인 세션을 시작합니다. 재가입한 계정도 새 ID를 받습니다.
    cleanup()
    resetMockState()
    server.use(http.get('/api/auth/me', () => HttpResponse.json({ ...mockMe, id: 2, email })))
    renderApp('/dashboard?tab=conditional')
    expect(within(await card()).getByText('TOEIC 500점 이상인 학생')).toBeInTheDocument()
  })

  it('묶인 장학금 중 한 건의 저장이 실패하면 같은 질문에서 다시 답할 수 있다', async () => {
    let fail = true
    server.use(
      http.put('/api/scholarships/10/conditions/:key', async () => {
        if (!fail) return
        await delay(20)
        return HttpResponse.json({ detail: '서버 오류' }, { status: 500 })
      }),
    )
    renderApp('/dashboard?tab=conditional')

    const first = within(await card())
    const answer = first.getByRole('button', { name: '안 맞아요' })
    fireEvent.click(answer)
    expect(answer).toBeDisabled()
    expect(first.getByText('TOEIC 500점 이상인 학생')).toBeInTheDocument()
    expect(await first.findByRole('alert')).toHaveTextContent('저장하지 못했습니다.')
    await waitFor(() => expect(screen.queryByText('글로벌 SW 인재 장학금')).not.toBeInTheDocument())
    expect(first.getByText('TOEIC 500점 이상인 학생')).toBeInTheDocument()
    expect(answer).toBeEnabled()
    expect(screen.getByText('해외 연수 지원 장학금')).toBeInTheDocument()

    fail = false
    fireEvent.click(answer)
    expect(await screen.findByText('청주시에 1년 이상 주민등록이 되어 있는 자')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText('해외 연수 지원 장학금')).not.toBeInTheDocument())
    expect(first.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('모르겠어요는 판정을 바꾸지 않고 넘어가며, 끝나면 다 끝냈다고 알린다', async () => {
    renderApp('/dashboard?tab=conditional')
    fireEvent.click(within(await card()).getByRole('button', { name: '모르겠어요' }))
    expect(
      within(await card()).getByText('청주시에 1년 이상 주민등록이 되어 있는 자'),
    ).toBeInTheDocument()
    fireEvent.click(within(await card()).getByRole('button', { name: '모르겠어요' }))
    expect(await screen.findByText('빠르게 확인할 질문을 다 끝냈어요.')).toBeInTheDocument()
    expect(screen.getByText('글로벌 SW 인재 장학금')).toBeInTheDocument() // 그대로 확인 필요
  })

  it('지원 가능 탭에는 확인 필요 장학금이 없어 카드가 나오지 않는다', async () => {
    renderApp('/dashboard')
    await waitForCards('두산연강재단 장학금')
    expect(screen.queryByRole('region', { name: '빠른 확인' })).not.toBeInTheDocument()
  })
})

describe('상세', () => {
  it('조건별 체크리스트·근거·제출 서류·같은 공지의 다른 장학금을 보여 준다', async () => {
    renderApp('/scholarships/2')
    const checklist = await screen.findByRole('list', { name: '조건 체크리스트' })
    const items = within(checklist).getAllByRole('listitem')
    expect(items).toHaveLength(2) // 내 정보로 판정한 조건 2개
    expect(within(items[0]).getByRole('img', { name: '충족' })).toBeInTheDocument()
    // 요약 한 줄(코드가 값으로 만듦)을 보이고, 원문 근거는 "근거 보기" 안에 접어 둡니다 (extract_v10)
    expect(within(items[0]).getByText('부모 주소 충청남도 논산시')).toBeInTheDocument()
    const evidence = within(items[0]).getByText('근거 보기').closest('details')
    expect(evidence).not.toHaveAttribute('open')
    expect(evidence).toHaveTextContent('부모가 논산시에 1년 이상 거주한 학생')
    expect(within(items[1]).getByRole('img', { name: '확인 필요' })).toBeInTheDocument()
    expect(within(items[1]).getByText('공지 기준이 명확하지 않아요')).toBeInTheDocument()
    const extra = screen.getByRole('list', { name: '직접 답하는 조건' })
    // 직접 답하는 조건은 요약을 질문으로, 원문을 대조용으로 함께 보여 줍니다
    expect(within(extra).getByText('직전학기 봉사 20시간 이상 학생')).toBeInTheDocument()
    expect(within(extra).getByText('직전학기 봉사활동 20시간 이상')).toBeInTheDocument()
    expect(within(extra).queryByText('기타 조건')).not.toBeInTheDocument()

    // 판정에 쓰지 않는 기본 조건·안내는 체크리스트 밖에 따로 (extract_v5)
    const basic = screen.getByRole('list', { name: '지원 전 확인' })
    expect(within(basic).getByText('대한민국 국적')).toBeInTheDocument() // 요약 없으면 원문
    expect(within(basic).getByText('다른 장학금을 받지 않는 학생')).toBeInTheDocument()
    expect(
      within(basic).getByText('타 장학금과 중복 수혜 불가').closest('details'),
    ).not.toHaveAttribute('open')
    const notes = screen.getByRole('list', { name: '참고 안내' })
    expect(within(notes).getByText('면접 점수 석차순 선발')).toBeInTheDocument()

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

  it('쉬운 이름을 제목으로 보여 주고 공지 원래 이름을 함께 적는다 (계획서 5.2)', async () => {
    renderApp('/scholarships/1')
    expect(
      await screen.findByRole('heading', { level: 1, name: '두산연강재단 장학금' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('공지 이름: 2026학년도 2학기 (재)두산연강재단 장학생 선발'),
    ).toBeInTheDocument()
  })

  it('쉬운 이름과 원래 이름이 같으면 원래 이름을 다시 적지 않는다', async () => {
    renderApp('/scholarships/2')
    await screen.findByRole('heading', { level: 1, name: '논산시 인재육성 장학금' })
    expect(screen.queryByText(/공지 이름:/)).not.toBeInTheDocument()
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

  it('미충족 조건은 ✗로 표시한다', async () => {
    renderApp('/scholarships/3')
    const checklist = await screen.findByRole('list', { name: '조건 체크리스트' })
    expect(within(checklist).getByRole('img', { name: '미충족' })).toBeInTheDocument()
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
    const files = within(original).getByRole('list', { name: '첨부파일' })
    expect(within(files).getByText(/2026-2 교외장학금 공고문\.hwp/)).toBeInTheDocument()
    // 첨부 내용(추출 글자)은 화면에 보여 주지 않습니다.
    expect(within(original).queryByText(/두산연강재단 장학금 \| 2명/)).not.toBeInTheDocument()
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

  it('조건 요약 칸이 없는 예전 backend 응답이면 원문을 그대로 보여 준다', async () => {
    const second = mockDetails[1]
    server.use(
      http.get('/api/scholarships/:id', () =>
        HttpResponse.json({
          ...second,
          conditions: second.conditions.map(({ condition, outcome, evidence }) => ({
            condition,
            outcome,
            evidence,
          })),
          extra_checks: second.extra_checks.map(({ key, text, answer }) => ({ key, text, answer })),
          basic_items: undefined,
        }),
      ),
    )
    renderApp('/scholarships/2')
    const checklist = await screen.findByRole('list', { name: '조건 체크리스트' })
    expect(within(checklist).queryByText('공지 기준이 명확하지 않아요')).not.toBeInTheDocument()
    expect(within(checklist).getByText('부모가 논산시에 1년 이상 거주한 학생')).toBeInTheDocument()
    const extra = screen.getByRole('list', { name: '직접 답하는 조건' })
    expect(within(extra).getByText('기타 조건')).toBeInTheDocument() // 요약 대신 단어 규칙 이름
    const basic = screen.getByRole('list', { name: '지원 전 확인' })
    expect(within(basic).getByText('타 장학금과 중복 수혜 불가')).toBeInTheDocument()
    expect(within(basic).queryByText('공지 문장 보기')).not.toBeInTheDocument()
  })

  it('기준값은 있고 기준 학기만 모호하면 요약과 모호 안내를 함께, 이름만으로 충분하면 요약 줄 없이', async () => {
    const second = mockDetails[1]
    server.use(
      http.get('/api/scholarships/:id', () =>
        HttpResponse.json({
          ...second,
          conditions: [
            {
              condition: 'min_gpa',
              outcome: 'UNKNOWN',
              evidence: '평점 3.5 이상',
              requirement: '3.5 이상',
              ambiguous: true,
            },
            {
              condition: 'excludes_new_students',
              outcome: 'MET',
              evidence: '신·편입생 제외',
              requirement: null,
              ambiguous: false,
            },
          ],
        }),
      ),
    )
    renderApp('/scholarships/2')
    const checklist = await screen.findByRole('list', { name: '조건 체크리스트' })
    const [gpa, newcomer] = within(checklist).getAllByRole('listitem')
    expect(within(gpa).getByText('3.5 이상')).toBeInTheDocument()
    expect(within(gpa).getByText('공지 기준이 명확하지 않아요')).toBeInTheDocument()
    // 조건 이름·판정·근거 보기 말고는 글이 없어야 합니다
    expect(newcomer).toHaveTextContent(/^신·편입생 제외충족근거 보기신·편입생 제외$/)
  })

  it('직접 답하는 조건의 긴 원문은 2줄로 줄이고 더 보기로 펼친다', async () => {
    const long =
      '대한민국 국적보유자로서 대한민국에서 고등학교를 졸업한 자(단, 국외에서 고등학교 과정을 수학한 경우와 검정고시 합격자는 지원 가능)'
    const second = mockDetails[1]
    server.use(
      http.get('/api/scholarships/:id', () =>
        HttpResponse.json({
          ...second,
          extra_checks: [{ key: 'k1', text: long, summary: null, answer: null }],
        }),
      ),
    )
    renderApp('/scholarships/2')
    const extra = await screen.findByRole('list', { name: '직접 답하는 조건' })
    const more = within(extra).getByRole('button', { name: '더 보기' })
    expect(within(extra).getByText(long)).toHaveClass('line-clamp-2')
    fireEvent.click(more)
    expect(within(extra).getByText(long)).not.toHaveClass('line-clamp-2')
    expect(within(extra).getByRole('button', { name: '접기' })).toHaveAttribute(
      'aria-expanded',
      'true',
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

  it('관심 추가 실패 후 다시 누르면 두 번째 요청으로 관심 장학금에 추가한다', async () => {
    let requests = 0
    server.use(
      http.put('/api/scholarships/3/state', () => {
        requests += 1
        if (requests === 1) return HttpResponse.json({}, { status: 500 })
        // 재시도는 기본 목 핸들러에서 실제 관심 상태를 저장합니다.
      }),
    )
    const app = renderApp('/dashboard?tab=all')
    await waitForCards('여성공학인 장학금')
    const card = within(screen.getByText('여성공학인 장학금').closest('li')!)
    fireEvent.click(card.getByRole('button', { name: '관심', pressed: false }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '관심 장학금에 추가하지 못했어요. 다시 시도해 주세요.',
    )
    const retry = await card.findByRole('button', { name: '관심', pressed: false })
    expect(retry).toBeEnabled()
    expect(requests).toBe(1)

    fireEvent.click(retry)
    await waitFor(() =>
      expect(card.getByRole('button', { name: '관심 해제', pressed: true })).toBeEnabled(),
    )
    expect(requests).toBe(2)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    await app.router.navigate('/my')
    await waitForCards('여성공학인 장학금')
  })

  it('내 장학금에서 마지막 관심 해제에 실패하면 항목을 복구하고 오류를 보여 준다', async () => {
    let release!: () => void
    const gate = new Promise<void>((resolve) => (release = resolve))
    server.use(
      http.delete('/api/scholarships/1/state', async () => {
        await gate
        return HttpResponse.json({}, { status: 500 })
      }),
    )
    renderApp('/my')
    const button = await screen.findByRole('button', { name: '관심 해제', pressed: true })
    fireEvent.click(button)
    try {
      expect(await screen.findByText(/관심 장학금이 없습니다/)).toBeInTheDocument()
      expect(button).not.toBeInTheDocument()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    } finally {
      release()
    }

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '관심을 해제하지 못했어요. 다시 시도해 주세요.',
    )
    expect(await screen.findByRole('button', { name: '관심 해제', pressed: true })).toBeEnabled()
  })

  it('다른 탭이 로딩 중이어도 관심 해제 실패를 안내한다', async () => {
    let finishSave!: () => void
    let finishLoad!: () => void
    const saving = new Promise<void>((resolve) => (finishSave = resolve))
    const loading = new Promise<void>((resolve) => (finishLoad = resolve))
    server.use(
      http.delete('/api/scholarships/1/state', async () => {
        await saving
        return HttpResponse.json({}, { status: 500 })
      }),
      http.get('/api/scholarships', async ({ request }) => {
        if (new URL(request.url).searchParams.get('state') === 'applied') await loading
      }),
    )
    renderApp('/my')
    try {
      fireEvent.click(await screen.findByRole('button', { name: '관심 해제', pressed: true }))
      expect(await screen.findByText(/관심 장학금이 없습니다/)).toBeInTheDocument()
      fireEvent.click(screen.getByRole('tab', { name: '신청완료' }))
      expect(await screen.findByLabelText('불러오는 중')).toBeInTheDocument()

      finishSave()
      expect(await screen.findByText(/관심을 해제하지 못했어요/)).toBeInTheDocument()
      expect(screen.getByLabelText('불러오는 중')).toBeInTheDocument()
    } finally {
      finishSave()
      finishLoad()
    }
    expect(await screen.findByRole('heading', { name: '국가근로장학금' })).toBeInTheDocument()
    expect(screen.getByText(/관심을 해제하지 못했어요/)).toBeInTheDocument()
  })

  it('관심 해제와 목록 재조회가 모두 실패해도 항목과 저장 오류를 표시한다', async () => {
    let failRefresh = false
    server.use(
      http.delete('/api/scholarships/1/state', () => {
        failRefresh = true
        return HttpResponse.json({}, { status: 500 })
      }),
      http.get('/api/scholarships', () => {
        if (failRefresh) return HttpResponse.json({ detail: '목록 조회 실패' }, { status: 500 })
      }),
    )
    renderApp('/my')
    fireEvent.click(await screen.findByRole('button', { name: '관심 해제', pressed: true }))

    expect(await screen.findByText('목록 조회 실패', {}, { timeout: 10000 })).toBeInTheDocument()
    expect(screen.getByText(/관심을 해제하지 못했어요/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '관심 해제', pressed: true })).toBeEnabled()
  }, 12000)

  it.each([true, false])(
    '동시 관심 요청에서 첫 요청 성공 여부(%s)와 관계없이 두 번째 상태를 유지한다',
    async (firstSucceeds) => {
      let finishFirst!: () => void
      let finishSecond!: () => void
      const first = new Promise<void>((resolve) => (finishFirst = resolve))
      const second = new Promise<void>((resolve) => (finishSecond = resolve))
      let refreshes = 0
      server.use(
        http.put('/api/scholarships/2/state', async () => {
          await first
          if (!firstSucceeds) return HttpResponse.json({}, { status: 500 })
        }),
        http.put('/api/scholarships/3/state', async () => {
          await second
          return HttpResponse.json({}, { status: 500 })
        }),
        http.get('/api/scholarships', () => {
          refreshes += 1
        }),
      )
      renderApp('/dashboard?tab=all')
      const card = async (name: string) =>
        within((await screen.findByRole('heading', { name })).closest('li')!)
      const firstCard = await card('논산시 인재육성 장학금')
      const secondCard = await card('여성공학인 장학금')
      try {
        fireEvent.click(firstCard.getByRole('button', { name: '관심', pressed: false }))
        expect(
          await firstCard.findByRole('button', { name: '관심 해제', pressed: true }),
        ).toBeDisabled()
        fireEvent.click(secondCard.getByRole('button', { name: '관심', pressed: false }))
        expect(
          await secondCard.findByRole('button', { name: '관심 해제', pressed: true }),
        ).toBeDisabled()

        finishFirst()
        await waitFor(() => expect(refreshes).toBeGreaterThan(1))
        await waitFor(() =>
          expect(firstCard.getByRole('button', { pressed: firstSucceeds })).toBeEnabled(),
        )
        expect(secondCard.getByRole('button', { name: '관심 해제', pressed: true })).toBeDisabled()

        finishSecond()
        await waitFor(() =>
          expect(secondCard.getByRole('button', { name: '관심', pressed: false })).toBeEnabled(),
        )
        expect(firstCard.getByRole('button', { pressed: firstSucceeds })).toBeEnabled()
      } finally {
        finishFirst()
        finishSecond()
      }
    },
  )

  it('저장에 실패하면 되돌리고 오류를 보여 준다', async () => {
    server.use(
      http.put('/api/scholarships/:id/state', async () => {
        await delay(30)
        return HttpResponse.json({ detail: '오류' }, { status: 500 })
      }),
    )
    renderApp('/scholarships/2')
    const button = await screen.findByRole('button', { name: '신청 완료', pressed: false })
    // 실패 뒤 다시 불러오기는 늦게 오게 해서, 되돌림이 캐시 복원으로 일어났는지 확인합니다.
    server.use(
      http.get('/api/scholarships/:id', async () => {
        await delay(500)
      }),
    )
    fireEvent.click(button)
    expect(
      await screen.findByRole('button', { name: '신청 완료', pressed: true }),
    ).toBeInTheDocument()

    expect(await screen.findByText(/저장하지 못했습니다/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '신청 완료' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('상세에 숨기기 버튼이 없다', async () => {
    renderApp('/scholarships/3')
    await screen.findByRole('button', { name: '신청 완료' })
    expect(screen.queryByRole('button', { name: '숨기기' })).not.toBeInTheDocument()
    // 관심은 목록 카드 하트로 옮겨 상세에는 없음 (T54)
    expect(screen.queryByRole('button', { name: '관심' })).not.toBeInTheDocument()
  })
})

describe('내 장학금', () => {
  it('관심·신청완료 목록을 보여 주고 마감된 장학금도 포함한다', async () => {
    renderApp('/my')
    await waitForCards('두산연강재단 장학금')
    expect(screen.queryByText('국가근로장학금')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: '신청완료' }))
    await waitForCards('국가근로장학금')
    expect(screen.getByText('마감')).toBeInTheDocument()
    expect(screen.queryByText('두산연강재단 장학금')).not.toBeInTheDocument()
  })
})

describe('사이드바 (T40)', () => {
  it('초기화를 누르면 정렬·출처·지원 형태와 검색어가 기본값으로 돌아간다', async () => {
    const app = renderApp('/dashboard?sort=latest&source=internal&q=장학')
    const reset = await screen.findByRole('button', { name: '초기화' })
    fireEvent.click(reset)
    await waitFor(() => expect(app.router.state.location.search).toBe(''))
    expect(screen.getByRole('searchbox', { name: '장학금 검색' })).toHaveValue('')
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

describe('사이드바 추가 안내 (T57)', () => {
  it('판정 결과 읽는 법과 프로필 수정 링크를 보여 준다', async () => {
    renderApp('/dashboard')
    const guide = await screen.findByRole('region', { name: '판정 결과 읽는 법' })
    expect(within(guide).getByText(/모두 충족해요/)).toBeInTheDocument()
    expect(within(guide).getByRole('link', { name: '프로필 수정' })).toHaveAttribute(
      'href',
      '/profile',
    )
  })

  it('넓은 화면에서 곧 마감되는 장학금을 마감 순서로 3개까지 보여 준다', async () => {
    const original = window.matchMedia
    window.matchMedia = ((query: string) => ({
      matches: true,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia
    try {
      renderApp('/dashboard?tab=all')
      const soon = await screen.findByRole('region', { name: '곧 마감되는 장학금' })
      // 목 데이터 마감일이 고정 날짜라, 날짜가 지나도 깨지지 않게 개수 상한만 확인합니다.
      expect(within(soon).queryAllByRole('link').length).toBeLessThanOrEqual(3)
    } finally {
      window.matchMedia = original
    }
  })
})

describe('곧 마감 빈 상태 (QA 사이드-1)', () => {
  it('지금 목록에 가까운 마감이 없으면 전체 탭으로 바꾸는 버튼을 보여 준다', async () => {
    const original = window.matchMedia
    window.matchMedia = ((query: string) => ({
      matches: true,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia
    server.use(http.get('/api/scholarships', () => HttpResponse.json({ items: [] })))
    try {
      const app = renderApp('/dashboard')
      const soon = await screen.findByRole('region', { name: '곧 마감되는 장학금' })
      fireEvent.click(within(soon).getByRole('button', { name: '전체 탭에서 보기 →' }))
      await waitFor(() => expect(app.router.state.location.search).toBe('?tab=all'))
      expect(screen.getByRole('tab', { name: '전체' })).toHaveAttribute('aria-selected', 'true')
    } finally {
      window.matchMedia = original
    }
  })
})
