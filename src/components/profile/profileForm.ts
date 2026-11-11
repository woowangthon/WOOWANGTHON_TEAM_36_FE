// 프로필 폼 검증·변환 (계획서 4.1·4.3). 규칙은 backend `ProfileUpdate`와 같아야 합니다.
// 숫자 칸도 문자열로 받습니다. 숫자 입력 칸은 `2e3`·`3e0` 같은 지수 표기를 숫자로 바꿔 통과시키기 때문입니다.
import { z } from 'zod'

import type { Profile, ProfileUpdate } from '@/api/hooks/profile'

export const MIN_BIRTH_YEAR = 1950
export const MIN_AGE = 15
export const MAX_SEMESTERS = 16

export const SPECIAL_FLAGS = ['다자녀', '보훈', '장애'] as const
export const INCOME_OPTIONS = [
  { value: '', label: '모름 · 입력 안 함' },
  { value: '0', label: '기초생활수급자' },
  { value: '0.5', label: '차상위계층' },
  ...Array.from({ length: 10 }, (_, i) => ({ value: String(i + 1), label: `${i + 1}구간` })),
]

// 닉네임 규칙(4.3): 2~10자, 한글(완성형)·영문·숫자, 숫자만은 불가. 어긴 이유마다 다른 문장을 보여 줍니다.
const NICKNAME_CHARS = /^[가-힣A-Za-z0-9]+$/
const INTEGER = /^\d+$/
const DECIMAL = /^\d+(\.\d+)?$/
const TWO_DECIMALS = /^\d+(\.\d{1,2})?$/

/** 출생연도 상한. '올해'는 브라우저 시간대가 아니라 Asia/Seoul 기준입니다(4.3). */
export function maxBirthYear(now = new Date()): number {
  const year = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', year: 'numeric' }).format(
    now,
  )
  return Number(year) - MIN_AGE
}

/** 출생연도 선택지: 최근 연도부터 1950까지. */
export function birthYearOptions(now = new Date()): string[] {
  const max = maxBirthYear(now)
  return Array.from({ length: max - MIN_BIRTH_YEAR + 1 }, (_, i) => String(max - i))
}
/** 맥에서 복사한 분해형 한글(NFD)을 완성형으로 바꾸고 앞뒤 공백을 지웁니다. */
const cleanName = (v: string) => v.normalize('NFC').trim()

// 값이 없을 때(undefined)도 빈 문자열로 받고, 앞뒤 공백은 지웁니다.
const text = () =>
  z
    .string()
    .optional()
    .transform((v) => (v ?? '').trim())

type Issue = (path: string, message: string) => void

/** 소수 칸: 숫자와 점만, 소수 둘째 자리까지, 범위 안. 빈 칸은 여기서 보지 않습니다. */
function checkDecimal(value: string, path: string, max: number, issue: Issue) {
  if (value === '') return
  if (!DECIMAL.test(value)) issue(path, '숫자로 입력하세요')
  else if (!TWO_DECIMALS.test(value)) issue(path, '소수 둘째 자리까지 입력하세요')
  else if (Number(value) > max) issue(path, `0~${max} 사이로 입력하세요`)
}

/** 이수학기가 0(신입생 첫 학기)이면 성적이 없습니다(4.1). */
export function hasNoGrades(completedSemesters: string | undefined): boolean {
  const v = (completedSemesters ?? '').trim()
  return INTEGER.test(v) && Number(v) === 0
}

// 학생이 입력하는 성적 칸. 100점 환산은 평점으로 계산해 보여 주기만 합니다(2026-11-10 결정).
export const GRADE_FIELDS = ['gpa', 'credits', 'gpa_total'] as const

// 100점 환산 = 평점 × 10 + 52.5 (backend `score_100_from_gpa`와 같은 식, 최대 100)
const SCORE_100_OFFSET = 52.5

/** 평점 칸 글자 → 100점 환산 표시 글자. 평점이 비었거나 0~4.5 숫자가 아니면 빈 글자. */
export function score100FromGpa(gpa: string | undefined): string {
  const v = (gpa ?? '').trim()
  if (!DECIMAL.test(v) || Number(v) > 4.5) return ''
  const score = Math.min(100, Math.round((Number(v) * 10 + SCORE_100_OFFSET) * 100) / 100)
  return String(score)
}

const fields = z.object({
  name: z
    .string()
    .optional()
    .transform((v) => cleanName(v ?? '')),
  gender: z.enum(['남', '여'], { error: '성별을 고르세요' }),
  birth_year: text(),
  completed_semesters: text(),
  aibc_member: z.enum(['yes', 'no', 'unknown'], { error: '양성인재 여부를 고르세요' }),

  // 성적 (4.1). 성적표 숫자를 그대로 받고, 이수학기 1 이상이면 3칸 모두 필수입니다.
  gpa: text(),
  credits: text(),
  gpa_total: text(),

  income_bracket: text(),
  self_sido: text(),
  self_sigungu: text(),
  parent_same: z.boolean(),
  parent_sido: text(),
  parent_sigungu: text(),
  special_flags: z.array(z.enum(SPECIAL_FLAGS)),
  full_tuition_waiver: z.enum(['', '예', '아니오']),
})

const rules = z.superRefine<z.output<typeof fields>>((v, ctx) => {
  const issue: Issue = (path, message) => ctx.addIssue({ code: 'custom', path: [path], message })

  if (!v.name) issue('name', '닉네임을 입력하세요')
  else if (/\s/.test(v.name)) issue('name', '닉네임에는 띄어쓰기를 쓸 수 없어요')
  else if (!NICKNAME_CHARS.test(v.name))
    issue('name', '닉네임은 한글·영문·숫자만 쓸 수 있어요 (특수기호·이모지·ㅋㅋ 같은 자음 불가)')
  else if (v.name.length < 2 || v.name.length > 10) issue('name', '닉네임은 2~10자로 입력하세요')
  else if (INTEGER.test(v.name)) issue('name', '닉네임은 숫자만으로 만들 수 없어요')

  if (!v.birth_year) issue('birth_year', '출생연도를 고르세요')
  else if (!/^\d{4}$/.test(v.birth_year)) issue('birth_year', '연도를 숫자 4자리로 입력하세요')
  else if (Number(v.birth_year) < MIN_BIRTH_YEAR || Number(v.birth_year) > maxBirthYear())
    issue('birth_year', '연도를 확인하세요')

  if (!v.completed_semesters) issue('completed_semesters', '이수학기를 입력하세요')
  else if (!INTEGER.test(v.completed_semesters)) issue('completed_semesters', '정수로 입력하세요')
  else if (Number(v.completed_semesters) > MAX_SEMESTERS)
    issue('completed_semesters', `0~${MAX_SEMESTERS} 사이로 입력하세요`)

  // 이수학기 0이면 성적 칸이 화면에 없고, 남은 값도 저장하지 않으므로 검사하지 않습니다.
  if (!hasNoGrades(v.completed_semesters)) {
    // 서버와 같은 문장 (backend ProfileUpdate)
    if (!v.gpa) issue('gpa', '직전학기 평점을 입력하세요')
    if (!v.credits) issue('credits', '직전학기 이수학점을 입력하세요')
    if (!v.gpa_total) issue('gpa_total', '전체 평점평균을 입력하세요')
    checkDecimal(v.gpa, 'gpa', 4.5, issue)
    checkDecimal(v.gpa_total, 'gpa_total', 4.5, issue)
    if (v.credits !== '') {
      if (!INTEGER.test(v.credits)) issue('credits', '정수로 입력하세요')
      else if (Number(v.credits) > 30) issue('credits', '0~30 사이로 입력하세요')
    }
  }

  if (v.self_sigungu && !v.self_sido) issue('self_sido', '시/도를 고르세요')
  // "같음"은 화면이 본인 주소를 복사해 보내는 것이라, 본인 주소가 없으면 부모 주소도 조용히 비게 됩니다.
  if (v.parent_same && !v.self_sido) issue('parent_same', '본인 주소를 먼저 입력하세요')
})
// zod는 성별 같은 선택 칸이 비어 있으면 위 검사를 건너뜁니다. 그러면 오류가 두 번에 나눠 보이므로
// 항상 돌게 합니다(`.refine`의 `when` 옵션과 같은 것. `superRefine`에는 옵션 자리가 없어 직접 넣습니다).
// 이때 선택 칸 값은 undefined일 수 있지만, 위 검사가 읽는 글자 칸은 항상 문자열입니다.
rules._zod.def.when = () => true

export const profileSchema = fields.check(rules)

export type ProfileFormValues = z.output<typeof profileSchema>
export type ProfileFormInput = z.input<typeof profileSchema>

function region(sido: string, sigungu: string): ProfileUpdate['self_region'] {
  return sido ? { sido, sigungu: sigungu || null } : null
}

const AIBC_TO_API = { yes: true, no: false, unknown: null } as const
const numberOrNull = (v: string) => (v === '' ? null : Number(v))

/** 폼 값 → API. 민감정보 동의가 없으면 특수자격은 보내지 않습니다(null = 입력 안 함, 4.2). */
export function toProfile(v: ProfileFormValues, sensitiveAgreed: boolean): ProfileUpdate {
  const self = region(v.self_sido, v.self_sigungu)
  const noGrades = hasNoGrades(v.completed_semesters)
  const grade = (value: string) => (noGrades ? null : numberOrNull(value))
  return {
    name: v.name,
    gender: v.gender,
    birth_year: Number(v.birth_year),
    completed_semesters: Number(v.completed_semesters),
    aibc_member: AIBC_TO_API[v.aibc_member],
    gpa: grade(v.gpa),
    credits: grade(v.credits),
    gpa_total: grade(v.gpa_total),
    income_bracket: numberOrNull(v.income_bracket),
    self_region: self,
    parent_region: v.parent_same ? self : region(v.parent_sido, v.parent_sigungu),
    // 동의했다면 체크하지 않은 것은 '해당 없음'([])입니다.
    special_flags: sensitiveAgreed ? v.special_flags : null,
    full_tuition_waiver: v.full_tuition_waiver === '' ? null : v.full_tuition_waiver,
  }
}

const str = (v: number | null | undefined) => (v == null ? '' : String(v))

/** API → 폼 기본값. 처음 입력이면 빈 폼. */
export function toFormValues(p: Profile | null): Partial<ProfileFormInput> {
  const empty = {
    name: '',
    birth_year: '',
    completed_semesters: '',
    gpa: '',
    credits: '',
    gpa_total: '',
    income_bracket: '',
    self_sido: '',
    self_sigungu: '',
    parent_same: false,
    parent_sido: '',
    parent_sigungu: '',
    special_flags: [],
    full_tuition_waiver: '',
  } satisfies Partial<ProfileFormInput>
  if (!p) return empty
  const same =
    !!p.self_region &&
    p.parent_region?.sido === p.self_region.sido &&
    (p.parent_region?.sigungu ?? null) === (p.self_region.sigungu ?? null)
  return {
    ...empty,
    name: p.name ?? '', // 실명을 지운 기존 사용자는 비어 있습니다(닉네임을 새로 받음)
    gender: p.gender,
    birth_year: String(p.birth_year),
    completed_semesters: String(p.completed_semesters),
    // 저장된 null은 '모름'입니다. 아무것도 고르지 않은 상태와 구분합니다.
    aibc_member: p.aibc_member == null ? 'unknown' : p.aibc_member ? 'yes' : 'no',
    gpa: str(p.gpa),
    credits: str(p.credits),
    gpa_total: str(p.gpa_total),
    income_bracket: str(p.income_bracket),
    self_sido: p.self_region?.sido ?? '',
    self_sigungu: p.self_region?.sigungu ?? '',
    parent_same: same,
    parent_sido: same ? '' : (p.parent_region?.sido ?? ''),
    parent_sigungu: same ? '' : (p.parent_region?.sigungu ?? ''),
    special_flags: p.special_flags ?? [],
    full_tuition_waiver: p.full_tuition_waiver ?? '',
  }
}

// 서버 422의 칸(`ProfileUpdate` 기준) → 폼 칸. 주소는 시/도 칸 아래에 보여 줍니다.
const SERVER_FIELD: Partial<Record<string, keyof ProfileFormInput>> = {
  self_region: 'self_sido',
  parent_region: 'parent_sido',
}
const SAME_NAME = new Set<string>([
  'name',
  'gender',
  'birth_year',
  'completed_semesters',
  'aibc_member',
  ...GRADE_FIELDS,
  'income_bracket',
  'special_flags',
  'full_tuition_waiver',
])

/** 서버 오류 위치(`['self_region']` 등) → 오류를 보여 줄 폼 칸. 맞는 칸이 없으면 null(폼 아래 문장). */
export function formFieldOf(path: (string | number)[]): keyof ProfileFormInput | null {
  const top = String(path[0] ?? '')
  if (SAME_NAME.has(top)) return top as keyof ProfileFormInput
  return SERVER_FIELD[top] ?? null
}
