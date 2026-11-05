import type { components } from '@/api/schema.gen'

import { mockDetails } from './data'
import { resetMockState } from './handlers'

type Schemas = components['schemas']

const api = (path: string) => new URL(`/api${path}`, window.location.origin)

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(api(path))
  expect(res.ok).toBe(true)
  return res.json() as Promise<T>
}

const list = (query = '') =>
  getJson<Schemas['ScholarshipListResponse']>(`/scholarships${query}`).then((r) => r.items)

beforeEach(() => resetMockState())

describe('목 데이터', () => {
  it('판정 결과 3종과 상태 3종을 모두 포함한다', () => {
    expect(new Set(mockDetails.map((d) => d.result))).toEqual(
      new Set(['ELIGIBLE', 'CONDITIONAL', 'INELIGIBLE']),
    )
    expect(new Set(mockDetails.map((d) => d.status))).toEqual(new Set(['OPEN', 'ALWAYS', 'CLOSED']))
  })
})

describe('MSW 핸들러', () => {
  it('/auth/me는 로그인 사용자를 돌려준다', async () => {
    const me = await getJson<Schemas['MeResponse']>('/auth/me')
    expect(me.privacy_agreed).toBe(true)
  })

  it('기본 목록은 마감·숨김을 빼고 마감 임박순으로 정렬한다', async () => {
    const items = await list()
    expect(items.map((i) => i.status)).not.toContain('CLOSED')
    expect(items.map((i) => i.my_state)).not.toContain('HIDDEN')
    expect(items.at(-1)?.status).toBe('ALWAYS') // 마감일 없는 상시 장학금은 뒤로
  })

  it('탭·출처 필터를 적용한다', async () => {
    expect((await list('?result=eligible')).every((i) => i.result === 'ELIGIBLE')).toBe(true)
    expect((await list('?source=external')).every((i) => !i.is_internal)).toBe(true)
  })

  it('내 장학금(state)은 마감된 장학금도 포함한다', async () => {
    const applied = await list('?state=applied')
    expect(applied.map((i) => i.status)).toEqual(['CLOSED'])
  })

  it('상세는 조건별 판정과 같은 공지의 다른 장학금을 담는다', async () => {
    const detail = await getJson<Schemas['ScholarshipDetail']>('/scholarships/2')
    expect(detail.conditions.map((c) => c.outcome)).toContain('UNKNOWN')
    expect(detail.siblings).toHaveLength(2)
    expect((await fetch(api('/scholarships/999'))).status).toBe(404)
  })

  it('상태를 바꾸고 지울 수 있다', async () => {
    const put = await fetch(api('/scholarships/3/state'), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: 'BOOKMARKED' }),
    })
    expect(await put.json()).toEqual({ scholarship_id: 3, state: 'BOOKMARKED' })
    expect((await fetch(api('/scholarships/3/state'), { method: 'DELETE' })).status).toBe(204)
    const detail = await getJson<Schemas['ScholarshipDetail']>('/scholarships/3')
    expect(detail.my_state).toBeNull()
  })
})
