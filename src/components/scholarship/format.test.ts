import { CONDITION_LABEL, deadlineOf, formatDateTime } from './format'

// 기준 시각: 2026-11-06 23:30 KST (UTC로는 같은 날 14:30)
const now = new Date('2026-11-06T23:30:00+09:00')

describe('deadlineOf', () => {
  it('한국 날짜 기준으로 D-Day를 센다', () => {
    expect(deadlineOf({ status: 'OPEN', apply_end: '2026-11-12T18:00:00+09:00' }, now).label).toBe(
      'D-6',
    )
    // UTC 기준이면 다음 날이지만 한국 날짜로는 다음 날 새벽 → D-1
    expect(deadlineOf({ status: 'OPEN', apply_end: '2026-11-07T01:00:00+09:00' }, now)).toEqual({
      label: 'D-1',
      tone: 'urgent',
    })
    expect(deadlineOf({ status: 'OPEN', apply_end: '2026-11-06T23:59:00+09:00' }, now).label).toBe(
      'D-Day',
    )
  })

  it('상시·마감·마감일 없음을 구분한다', () => {
    expect(deadlineOf({ status: 'ALWAYS', apply_end: null }, now).label).toBe('상시·확인 필요')
    expect(
      deadlineOf({ status: 'CLOSED', apply_end: '2026-09-15T18:00:00+09:00' }, now).label,
    ).toBe('마감')
    // 상태가 아직 OPEN이어도 마감 시각이 지났으면 마감
    expect(deadlineOf({ status: 'OPEN', apply_end: '2026-11-06T18:00:00+09:00' }, now).label).toBe(
      '마감',
    )
    expect(deadlineOf({ status: 'OPEN', apply_end: null }, now).label).toBe('마감일 미정')
  })
})

it('날짜는 한국 시간으로 표시한다', () => {
  expect(formatDateTime('2026-11-12T09:00:00Z')).toContain('18:00')
})

describe('CONDITION_LABEL (T40)', () => {
  it('국적·편입생 제외 조건 이름이 있다', () => {
    expect(CONDITION_LABEL.target_nationality).toBe('국적')
    expect(CONDITION_LABEL.school_excluded).toBe('학교 조건')
    expect(CONDITION_LABEL.excludes_transfer_students).toBe('편입생 제외')
  })
})
