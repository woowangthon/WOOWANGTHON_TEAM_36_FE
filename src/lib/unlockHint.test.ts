import type { ScholarshipSummary } from '@/api/hooks/scholarships'

import { quickQuestions, targetLabel, unlockCandidates } from './unlockHint'

type Item = Parameters<typeof quickQuestions>[0][number]

function item(id: number, overrides: Partial<ScholarshipSummary> = {}, texts = ['A 조건']): Item {
  return {
    id,
    name: `장학금${id}`,
    display_name: `장학금${id}`,
    result: 'CONDITIONAL',
    status: 'OPEN',
    apply_end: `2026-11-${String(10 + id).padStart(2, '0')}T18:00:00+09:00`,
    open_conditions: texts.map((text) => ({ key: `k:${text}`, text })),
    other_unknown: false,
    ...overrides,
  }
}

describe('unlockCandidates', () => {
  it('답하지 않은 조건이 1개뿐이고 다른 모름이 없는 확인 필요 장학금만, 마감 빠른 순으로', () => {
    const items = [
      item(5),
      item(1, { apply_end: null }), // 마감 없음 → 뒤
      item(2, { other_unknown: true }), // 다른 모름 → 제외
      item(3, {}, ['A 조건', 'B 조건']), // 조건 2개 → 제외
      item(4, { result: 'ELIGIBLE', open_conditions: [] }),
      item(6, { status: 'CLOSED' }),
      item(7, { result: 'INELIGIBLE' }),
    ]
    expect(unlockCandidates(items).map((i) => i.id)).toEqual([5, 1])
  })
})

describe('quickQuestions', () => {
  it('같은 문장은 한 질문으로 묶고, 정해지는 장학금이 많은 질문부터', () => {
    const questions = quickQuestions([item(1, {}, ['B 조건']), item(3), item(2)])
    expect(questions.map((q) => q.condition.text)).toEqual(['A 조건', 'B 조건'])
    expect(questions[0].targets.map((t) => t.id)).toEqual([2, 3])
  })

  it('수가 같으면 마감이 가까운 장학금이 있는 질문부터', () => {
    const questions = quickQuestions([item(2), item(1, {}, ['B 조건'])])
    expect(questions.map((q) => q.condition.text)).toEqual(['B 조건', 'A 조건'])
  })

  it('묶인 장학금 중 하나라도 요약이 있으면 그 요약을 질문으로 쓴다 (extract_v10)', () => {
    const withSummary = item(2, {
      open_conditions: [{ key: 'k:A 조건', text: 'A 조건', summary: 'A 요약' }],
    })
    const [question] = quickQuestions([item(1), withSummary]) // 1번(요약 없음)이 마감이 더 빠름
    expect(question.condition.summary).toBe('A 요약')
    expect(question.targets.map((t) => t.id)).toEqual([1, 2])
  })

  it('이미 답했거나 건너뛴 문장은 다시 묻지 않는다', () => {
    expect(quickQuestions([item(1), item(2, {}, ['B 조건'])], new Set(['k:A 조건']))).toEqual([
      { condition: { key: 'k:B 조건', text: 'B 조건' }, targets: [{ id: 2, name: '장학금2' }] },
    ])
    expect(quickQuestions([])).toEqual([])
  })
})

it('targetLabel: 장학금이 여럿이면 "외 N개"', () => {
  const [one] = quickQuestions([item(1)])
  expect(targetLabel(one)).toBe('장학금1')
  const [many] = quickQuestions([item(1), item(2), item(3)])
  expect(targetLabel(many)).toBe('장학금1 외 2개')
})
