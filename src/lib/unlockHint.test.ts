import type { ScholarshipSummary } from '@/api/hooks/scholarships'

import { hintVariantOf, unlockCandidates, unlockHint } from './unlockHint'

type Item = Parameters<typeof unlockHint>[0][number]

function item(id: number, overrides: Partial<ScholarshipSummary> = {}, texts = ['A 조건']): Item {
  return {
    id,
    name: `장학금${id}`,
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

describe('unlockHint', () => {
  const items = [item(3, {}, ['B 조건']), item(1), item(2), item(4, { other_unknown: true })]

  it('후보가 없으면 null', () => {
    expect(unlockHint([item(1, { other_unknown: true })], 1)).toBeNull()
    expect(unlockHint([], 3)).toBeNull()
  })

  it('안 1: 후보 수와 마감이 가장 가까운 장학금의 조건', () => {
    const hint = unlockHint(items, 1)!
    expect(hint.message).toBe('조건 1개만 확인하면 장학금 3개가 정리돼요')
    expect(hint.targets.map((t) => t.id)).toEqual([1])
    expect(hint.condition.text).toBe('A 조건')
  })

  it('안 2: 마감이 가장 가까운 장학금을 이름으로', () => {
    const hint = unlockHint(items, 2)!
    expect(hint.message).toBe('‘장학금1’은 조건 하나만 확인하면 돼요')
    expect(hint.targets.map((t) => t.id)).toEqual([1])
  })

  it('안 3: 같은 문장을 가진 장학금을 묶어 가장 많이 정해지는 문장', () => {
    const hint = unlockHint(items, 3)!
    expect(hint.message).toBe('이 조건 하나로 장학금 2개가 정리돼요')
    expect(hint.condition.text).toBe('A 조건')
    expect(hint.targets.map((t) => t.id)).toEqual([1, 2])
  })

  it('안 3: 묶이는 문장이 없으면 마감이 가까운 장학금 하나', () => {
    const hint = unlockHint([item(2, {}, ['B 조건']), item(1)], 3)!
    expect(hint.message).toBe('‘장학금1’은 조건 하나만 확인하면 돼요')
    expect(hint.targets.map((t) => t.id)).toEqual([1])
  })
})

it('hintVariantOf: 주소 값이 1·2·3이 아니면 안 1', () => {
  expect(hintVariantOf('2')).toBe(2)
  expect(hintVariantOf('3')).toBe(3)
  expect(hintVariantOf(null)).toBe(1)
  expect(hintVariantOf('9')).toBe(1)
  expect(hintVariantOf('abc')).toBe(1)
})
