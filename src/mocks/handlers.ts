// 계획서 7.2 API의 MSW 목 핸들러. 앱은 항상 /api로 호출하므로 경로 앞에 /api를 붙입니다.
// Google 로그인(/api/auth/google/*)은 fetch가 아니라 페이지 이동이라 목으로 대신하지 않습니다.
import { http, HttpResponse, type RequestHandler } from 'msw'

import type { components } from '@/api/schema.gen'

import {
  mockAdminNotices,
  mockCrawlRuns,
  mockDetails,
  mockMe,
  judge,
  withDerived,
  mockProfile,
  toSummary,
  type ScholarshipDetail,
} from './data'

type Schemas = components['schemas']
type StateFilter = 'bookmarked' | 'applied'

type Me = Schemas['MeResponse']

// backend와 같은 식: 평점 × 10 + 52.5 (최대 100)
const score100 = (gpa: number | null | undefined) =>
  gpa == null ? null : Math.min(100, Math.round((gpa * 10 + 52.5) * 100) / 100)

/** 목 로그인에 쓰는 비밀번호. 다른 값이면 401을 돌려줍니다. */
export const MOCK_PASSWORD = 'password123'
// 수신 거부 링크의 토큰 (목에서는 이 값만 맞는 토큰으로 봅니다, 7.4)
export const MOCK_UNSUBSCRIBE_TOKEN = 'mock-unsub'
/** 목 API의 가입 인증번호 (backend MAIL_MOCK=1과 같음) */
export const MOCK_SIGNUP_CODE = '000000'

// 화면에서 상태를 바꿔 볼 수 있게 메모리에 복사본을 둡니다. resetMockState()로 되돌립니다.
// 기본은 동의·프로필까지 마친 로그인 상태이고, startLoggedOut()으로 가입 흐름을 시작할 수 있습니다.
let details: ScholarshipDetail[] = structuredClone(mockDetails)
let profile: Schemas['Profile'] | null = structuredClone(mockProfile)
let me: Me | null = structuredClone(mockMe)
let adminNotices = structuredClone(mockAdminNotices)

export function resetMockState() {
  details = structuredClone(mockDetails)
  profile = structuredClone(mockProfile)
  me = structuredClone(mockMe)
  adminNotices = structuredClone(mockAdminNotices)
}

/** 관리자(ADMIN_EMAILS + Google 확인 계정)로 로그인한 상태로 바꿉니다(7.3). */
export function signInAsAdmin() {
  me = { ...mockMe, is_admin: true, google_linked: true }
}

const forbidden = () =>
  HttpResponse.json({ detail: '관리자만 접근할 수 있습니다' }, { status: 403 })

/** 로그아웃·프로필 없음 상태로 시작합니다(가입 → 동의 → 프로필 흐름 테스트용). */
export function startLoggedOut() {
  me = null
  profile = null
}

/** 로그아웃 상태로 바꿉니다. 프로필은 남겨 둡니다(다시 로그인하는 흐름 테스트용). */
export function signOut() {
  me = null
}

/** backend `_me()`처럼 프로필의 닉네임·이수학기·직전학기 평점을 함께 돌려줍니다 (T52, BE #44). */
function withSummary(value: Me): Me {
  return {
    ...value,
    nickname: profile?.name ?? null,
    completed_semesters: profile?.completed_semesters ?? null,
    is_transfer: profile?.is_transfer ?? null,
    gpa: profile?.gpa ?? null,
  }
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
    // 내 장학금 화면: 마감된 장학금도 포함. 둘 다 켠 장학금은 두 목록에 모두 나옵니다.
    items = items.filter((d) => d[state as StateFilter])
  } else {
    items = items.filter((d) => d.status !== 'CLOSED')
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

function answerCondition(
  id: string | readonly string[] | undefined,
  key: string | readonly string[] | undefined,
  answer: Schemas['ConditionAnswerRequest']['answer'] | null,
) {
  const detail = findDetail(id)
  const check = detail?.extra_checks.find((c) => c.key === key)
  if (!detail || !check) return notFound()
  check.answer = answer
  Object.assign(detail, withDerived(detail))
  detail.result = judge(detail)
  const response: Schemas['ConditionAnswerResponse'] = {
    scholarship_id: detail.id,
    key: check.key,
    answer,
    result: detail.result,
  }
  return HttpResponse.json(response)
}

const notFound = () => HttpResponse.json({ detail: 'Not Found' }, { status: 404 })

export const handlers: RequestHandler[] = [
  // 인증 (7.2, 7.3)
  http.get('/api/auth/me', () => (me ? HttpResponse.json(withSummary(me)) : unauthorized())),
  // 비밀번호 변경 (T38). 목 계정의 비밀번호는 MOCK_PASSWORD로 고정입니다.
  http.put('/api/auth/me/password', async ({ request }) => {
    if (!me) return unauthorized()
    const body = (await request.json()) as Schemas['PasswordChangeRequest']
    if (!me.has_password) {
      return HttpResponse.json({ detail: 'Google 계정으로 로그인하는 계정이에요' }, { status: 400 })
    }
    if (body.current_password !== MOCK_PASSWORD) {
      return HttpResponse.json({ detail: '현재 비밀번호가 맞지 않아요' }, { status: 400 })
    }
    return new HttpResponse(null, { status: 204 })
  }),
  // 가입 3단계 (7.3). 목에서는 인증번호가 MOCK_SIGNUP_CODE로 고정이고, 토큰에 이메일을 그대로 담습니다.
  http.post('/api/auth/signup/code', async ({ request }) => {
    const { email } = (await request.json()) as Schemas['SignupCodeRequest']
    const normalized = email.trim().toLowerCase()
    if (normalized === mockMe.email) {
      return HttpResponse.json({ detail: '이미 가입된 이메일입니다' }, { status: 409 })
    }
    return HttpResponse.json({
      code_token: `mock-code:${normalized}`,
      expires_in: 600,
      resend_after: 60,
    } satisfies Schemas['SignupCodeResponse'])
  }),
  http.post('/api/auth/signup/verify', async ({ request }) => {
    const body = (await request.json()) as Schemas['SignupVerifyRequest']
    if (!body.code_token.startsWith('mock-code:')) {
      return HttpResponse.json({ detail: '이메일 인증을 처음부터 다시 해 주세요' }, { status: 400 })
    }
    if (body.code !== MOCK_SIGNUP_CODE) {
      return HttpResponse.json({ detail: '인증번호가 맞지 않아요' }, { status: 400 })
    }
    return HttpResponse.json({
      signup_token: `mock-signup:${body.code_token.slice('mock-code:'.length)}`,
      expires_in: 1800,
    } satisfies Schemas['SignupVerifyResponse'])
  }),
  http.post('/api/auth/signup', async ({ request }) => {
    const body = (await request.json()) as Schemas['SignupRequest']
    if (!body.signup_token.startsWith('mock-signup:')) {
      return HttpResponse.json(
        { detail: '인증 시간이 지났어요. 이메일 인증을 다시 해 주세요' },
        { status: 400 },
      )
    }
    me = {
      ...mockMe,
      email: body.signup_token.slice('mock-signup:'.length),
      privacy_agreed: false,
      sensitive_agreed: false,
      profile_completed: false,
    }
    profile = null
    return HttpResponse.json(withSummary(me), { status: 201 })
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
    return HttpResponse.json(withSummary(me))
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
    return HttpResponse.json(withSummary(me))
  }),
  http.delete('/api/auth/consent/sensitive', () => {
    if (!me) return unauthorized()
    me = { ...me, sensitive_agreed: false }
    if (profile) profile = { ...profile, special_flags: null }
    return new HttpResponse(null, { status: 204 })
  }),
  http.put('/api/auth/me/notifications', async ({ request }) => {
    if (!me) return unauthorized()
    const body = (await request.json()) as Schemas['NotificationSettingRequest']
    me = { ...me, email_notifications: body.email_notifications }
    return HttpResponse.json(withSummary(me))
  }),
  // 로그인 없이 동작합니다. 맞는 토큰이면 지금 사용자의 알림을 끕니다(목에는 사용자가 한 명뿐).
  http.post('/api/notifications/unsubscribe', async ({ request }) => {
    const body = (await request.json()) as Schemas['UnsubscribeRequest']
    if (body.token !== MOCK_UNSUBSCRIBE_TOKEN) {
      return HttpResponse.json({ detail: '유효하지 않은 링크입니다' }, { status: 400 })
    }
    if (me) me = { ...me, email_notifications: false }
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
    // 전환 기간의 옛 칸(grade·extra_semester·department)은 화면이 보내지 않으므로 목에서는 다루지 않습니다.
    const body = (await request.json()) as Schemas['ProfileUpdate']
    profile = {
      name: body.name,
      gender: body.gender,
      birth_year: body.birth_year,
      completed_semesters: body.completed_semesters ?? 0,
      enrollment_status: body.enrollment_status ?? '재학', // 화면은 보내지 않음(재학생 대상)
      aibc_member: body.aibc_member,
      is_transfer: body.is_transfer ?? false,
      is_foreign: body.is_foreign ?? false,
      gpa: body.gpa,
      score_100: score100(body.gpa),
      credits: body.credits,
      gpa_total: body.gpa_total,
      score_100_total: score100(body.gpa_total),
      income_bracket: body.income_bracket,
      self_region: body.self_region,
      parent_region: body.parent_region,
      special_flags: body.special_flags,
      full_tuition_waiver: body.full_tuition_waiver === '모름' ? null : body.full_tuition_waiver,
    }
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
    // backend와 같이 보낸 값만 바꿉니다. 관심과 신청완료는 서로 영향을 주지 않습니다.
    const body = (await request.json()) as Schemas['StateRequest']
    if (body.bookmarked == null && body.applied == null) {
      return HttpResponse.json({ detail: '바꿀 값이 없습니다' }, { status: 422 })
    }
    if (body.bookmarked != null) detail.bookmarked = body.bookmarked
    if (body.applied != null) detail.applied = body.applied
    const response: Schemas['StateResponse'] = {
      scholarship_id: detail.id,
      bookmarked: detail.bookmarked,
      applied: detail.applied,
    }
    return HttpResponse.json(response)
  }),
  // 추가 조건에 답하기 (계획서 5.3). 답을 바꾸고 판정을 다시 계산해 돌려줍니다.
  http.put('/api/scholarships/:id/conditions/:key', async ({ params, request }) => {
    const body = (await request.json()) as Schemas['ConditionAnswerRequest']
    return answerCondition(params.id, params.key, body.answer)
  }),
  http.delete('/api/scholarships/:id/conditions/:key', ({ params }) =>
    answerCondition(params.id, params.key, null),
  ),

  // 관리자: 관리자가 아니면 403. 재추출은 PENDING으로만 바꿉니다(9.3).
  http.get('/api/admin/crawl-runs', () => {
    if (!me) return unauthorized()
    if (!me.is_admin) return forbidden()
    const response: Schemas['CrawlRunsResponse'] = {
      items: mockCrawlRuns,
      notices: [
        ...adminNotices.filter((n) => n.extract_status !== 'DONE'),
        ...adminNotices.filter((n) => n.extract_status === 'DONE'),
      ],
    }
    return HttpResponse.json(response)
  }),
  http.post('/api/admin/notices/:id/reextract', ({ params }) => {
    if (!me) return unauthorized()
    if (!me.is_admin) return forbidden()
    const notice = adminNotices.find((n) => n.id === Number(params.id))
    if (!notice) return HttpResponse.json({ detail: '공지를 찾을 수 없습니다' }, { status: 404 })
    notice.extract_status = 'PENDING'
    const response: Schemas['ReextractResponse'] = {
      notice_id: notice.id,
      extract_status: 'PENDING',
    }
    return HttpResponse.json(response, { status: 202 })
  }),
]
