// 계획서 7.2 API의 MSW 목 핸들러. 앱은 항상 /api로 호출하므로 경로 앞에 /api를 붙입니다.
// Google 로그인(/api/auth/google/*)은 fetch가 아니라 페이지 이동이라 목으로 대신하지 않습니다.
import { http, HttpResponse, type RequestHandler } from 'msw'

import type { components } from '@/api/schema.gen'

import {
  mockCrawlRuns,
  mockDetails,
  mockMe,
  mockProfile,
  toSummary,
  type ScholarshipDetail,
} from './data'

type Schemas = components['schemas']
type UserState = NonNullable<Schemas['StateRequest']['state']>

type Me = Schemas['MeResponse']

/** 목 로그인에 쓰는 비밀번호. 다른 값이면 401을 돌려줍니다. */
export const MOCK_PASSWORD = 'password123'

// 화면에서 상태를 바꿔 볼 수 있게 메모리에 복사본을 둡니다. resetMockState()로 되돌립니다.
// 기본은 동의·프로필까지 마친 로그인 상태이고, startLoggedOut()으로 가입 흐름을 시작할 수 있습니다.
let details: ScholarshipDetail[] = structuredClone(mockDetails)
let profile: Schemas['Profile'] | null = structuredClone(mockProfile)
let me: Me | null = structuredClone(mockMe)

export function resetMockState() {
  details = structuredClone(mockDetails)
  profile = structuredClone(mockProfile)
  me = structuredClone(mockMe)
}

/** 로그아웃·프로필 없음 상태로 시작합니다(가입 → 동의 → 프로필 흐름 테스트용). */
export function startLoggedOut() {
  me = null
  profile = null
}

/** 로그아웃 상태로 바꿉니다. 프로필은 남겨 둡니다(다시 로그인하는 흐름 테스트용). */
export function signOut() {
  me = null
}

const unauthorized = () => HttpResponse.json({ detail: '로그인이 필요합니다' }, { status: 401 })

const RESULT_FILTER = { eligible: 'ELIGIBLE', conditional: 'CONDITIONAL' } as const

function listScholarships(url: URL): Schemas['ScholarshipListResponse'] {
  const result = url.searchParams.get('result') ?? 'all'
  const sort = url.searchParams.get('sort') ?? 'deadline'
  const source = url.searchParams.get('source')
  const benefitType = url.searchParams.get('benefit_type')
  const state = url.searchParams.get('state')

  let items = details
  if (state) {
    // 내 장학금 화면: 마감된 장학금도 포함
    items = items.filter((d) => d.my_state === state.toUpperCase())
  } else {
    items = items.filter((d) => d.status !== 'CLOSED' && d.my_state !== 'HIDDEN')
  }
  if (result in RESULT_FILTER) {
    items = items.filter((d) => d.result === RESULT_FILTER[result as keyof typeof RESULT_FILTER])
  }
  if (source) items = items.filter((d) => d.is_internal === (source === 'internal'))
  if (benefitType) items = items.filter((d) => d.benefit_type === benefitType)

  const sorted = [...items].sort((a, b) =>
    sort === 'latest'
      ? b.posted_at.localeCompare(a.posted_at)
      : // 마감 임박순: 마감일 없는 상시 장학금은 뒤로
        (a.apply_end ?? '9999').localeCompare(b.apply_end ?? '9999'),
  )
  return { items: sorted.map(toSummary) }
}

function findDetail(id: string | readonly string[] | undefined) {
  return details.find((d) => d.id === Number(id))
}

const notFound = () => HttpResponse.json({ detail: 'Not Found' }, { status: 404 })

export const handlers: RequestHandler[] = [
  // 인증 (7.2, 7.3)
  http.get('/api/auth/me', () => (me ? HttpResponse.json(me) : unauthorized())),
  http.post('/api/auth/signup', async ({ request }) => {
    const body = (await request.json()) as Schemas['SignupRequest']
    me = {
      ...mockMe,
      email: body.email.toLowerCase(),
      privacy_agreed: false,
      sensitive_agreed: false,
      profile_completed: false,
    }
    profile = null
    return HttpResponse.json(me, { status: 201 })
  }),
  http.post('/api/auth/login', async ({ request }) => {
    const body = (await request.json()) as Schemas['LoginRequest']
    if (body.password !== MOCK_PASSWORD) {
      return HttpResponse.json(
        { detail: '이메일 또는 비밀번호가 올바르지 않습니다' },
        { status: 401 },
      )
    }
    me = { ...mockMe, email: body.email.toLowerCase(), profile_completed: profile !== null }
    return HttpResponse.json(me)
  }),
  http.post('/api/auth/logout', () => {
    me = null
    return new HttpResponse(null, { status: 204 })
  }),
  http.post('/api/auth/consent', async ({ request }) => {
    if (!me) return unauthorized()
    const body = (await request.json()) as Schemas['ConsentRequest']
    if (!body.privacy) {
      return HttpResponse.json({ detail: '개인정보 수집·이용 동의가 필요합니다' }, { status: 400 })
    }
    me = { ...me, privacy_agreed: true, sensitive_agreed: body.sensitive }
    if (!body.sensitive && profile) profile = { ...profile, special_flags: null }
    return HttpResponse.json(me)
  }),
  http.delete('/api/auth/consent/sensitive', () => {
    if (!me) return unauthorized()
    me = { ...me, sensitive_agreed: false }
    if (profile) profile = { ...profile, special_flags: null }
    return new HttpResponse(null, { status: 204 })
  }),
  http.delete('/api/auth/me', () => {
    me = null
    profile = null
    return new HttpResponse(null, { status: 204 })
  }),

  // 프로필
  http.get('/api/profile', () => {
    if (!me) return unauthorized()
    return profile
      ? HttpResponse.json(profile)
      : HttpResponse.json({ detail: '프로필을 입력하세요' }, { status: 404 })
  }),
  http.put('/api/profile', async ({ request }) => {
    if (!me) return unauthorized()
    profile = (await request.json()) as Schemas['Profile']
    me = { ...me, profile_completed: true }
    return HttpResponse.json(profile)
  }),

  // 장학금
  http.get('/api/scholarships', ({ request }) =>
    HttpResponse.json(listScholarships(new URL(request.url))),
  ),
  http.get('/api/scholarships/:id', ({ params }) => {
    const detail = findDetail(params.id)
    return detail ? HttpResponse.json(detail) : notFound()
  }),
  http.put('/api/scholarships/:id/state', async ({ params, request }) => {
    const detail = findDetail(params.id)
    if (!detail) return notFound()
    const body = (await request.json()) as Schemas['StateRequest']
    detail.my_state = body.state as UserState
    const response: Schemas['StateResponse'] = { scholarship_id: detail.id, state: detail.my_state }
    return HttpResponse.json(response)
  }),
  http.delete('/api/scholarships/:id/state', ({ params }) => {
    const detail = findDetail(params.id)
    if (!detail) return notFound()
    detail.my_state = null
    return new HttpResponse(null, { status: 204 })
  }),

  // 관리자
  http.get('/api/admin/crawl-runs', () => {
    const response: Schemas['CrawlRunsResponse'] = { items: mockCrawlRuns }
    return HttpResponse.json(response)
  }),
  http.post('/api/admin/notices/:id/reextract', ({ params }) => {
    const response: Schemas['ReextractResponse'] = {
      notice_id: Number(params.id),
      extract_status: 'PENDING',
    }
    return HttpResponse.json(response, { status: 202 })
  }),
]
