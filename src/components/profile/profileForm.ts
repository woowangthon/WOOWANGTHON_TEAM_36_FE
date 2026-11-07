// 프로필 폼 검증·변환 (계획서 4.1). 폼 값은 입력 위젯에 맞춘 모양이고, 저장할 때 API Profile로 바꿉니다.
import { z } from 'zod'

import type { Profile } from '@/api/hooks/profile'

const CURRENT_YEAR = new Date().getFullYear()

export const SPECIAL_FLAGS = ['다자녀', '보훈', '장애'] as const
export const ENROLLMENT_STATUSES = ['재학', '휴학', '수료', '졸업유예'] as const
export const INCOME_OPTIONS = [
  { value: '', label: '모름 · 입력 안 함' },
  { value: '0', label: '기초생활수급자' },
  { value: '0.5', label: '차상위계층' },
  ...Array.from({ length: 10 }, (_, i) => ({ value: String(i + 1), label: `${i + 1}구간` })),
]

// 값이 없을 때(undefined)도 빈 문자열로 받습니다.
const text = () =>
  z
    .string()
    .optional()
    .transform((v) => v ?? '')

const requiredNumber = (label: string) => z.number({ error: `${label}을(를) 입력하세요` })

// 선택 숫자 칸: 비워 두면 null(입력 안 함). 입력 위젯은 setValueAs로 빈 칸을 null로 바꿉니다.
const optionalNumber = (schema: z.ZodNumber) =>
  schema
    .nullable()
    .optional()
    .transform((v) => v ?? null)

/** 선택 숫자 입력용 register 옵션: 빈 칸 → null, 그 밖은 숫자(숫자가 아니면 NaN → 검증 오류) */
export const optionalNumberInput = {
  setValueAs: (v: unknown) => (v === '' || v == null ? null : Number(v)),
} as const

export const profileSchema = z
  .object({
    name: z.string().trim().min(1, '이름을 입력하세요').max(100, '100자 이하로 입력하세요'),
    gender: z.enum(['남', '여'], { error: '성별을 고르세요' }),
    birth_year: requiredNumber('출생연도')
      .int('연도를 숫자 4자리로 입력하세요')
      .min(1900, '연도를 확인하세요')
      .max(CURRENT_YEAR, '연도를 확인하세요'),
    gpa: requiredNumber('평점')
      .min(0, '0 이상으로 입력하세요')
      .max(4.5, '4.5 만점 기준으로 입력하세요'),
    // 선택 성적 (4.1 C안). 성적표 숫자를 그대로 받습니다.
    score_100: optionalNumber(
      z
        .number({ error: '숫자로 입력하세요' })
        .min(0, '0 이상으로 입력하세요')
        .max(100, '100점 만점 기준으로 입력하세요'),
    ),
    credits: optionalNumber(
      z
        .number({ error: '숫자로 입력하세요' })
        .int('정수로 입력하세요')
        .min(0, '0 이상으로 입력하세요')
        .max(30, '30학점 이하로 입력하세요'),
    ),
    gpa_total: optionalNumber(
      z
        .number({ error: '숫자로 입력하세요' })
        .min(0, '0 이상으로 입력하세요')
        .max(4.5, '4.5 만점 기준으로 입력하세요'),
    ),
    score_100_total: optionalNumber(
      z
        .number({ error: '숫자로 입력하세요' })
        .min(0, '0 이상으로 입력하세요')
        .max(100, '100점 만점 기준으로 입력하세요'),
    ),
    grade: z.enum(['1', '2', '3', '4'], { error: '학년을 고르세요' }),
    extra_semester: z.boolean(),
    enrollment_status: z.enum(ENROLLMENT_STATUSES, { error: '재학상태를 고르세요' }),
    department: z.enum(['소프트웨어학부', '기타'], { error: '소속 학과를 고르세요' }),
    aibc_member: z.enum(['yes', 'no'], { error: '양성인재 여부를 고르세요' }),

    income_bracket: text(),
    self_sido: text(),
    self_sigungu: text(),
    parent_same: z.boolean(),
    parent_sido: text(),
    parent_sigungu: text(),
    special_flags: z.array(z.enum(SPECIAL_FLAGS)),
    full_tuition_waiver: z.enum(['', '예', '아니오', '모름']),
  })
  .refine((v) => !v.self_sigungu || v.self_sido, {
    path: ['self_sido'],
    message: '시/도를 고르세요',
  })

export type ProfileFormValues = z.output<typeof profileSchema>
export type ProfileFormInput = z.input<typeof profileSchema>

function region(sido: string, sigungu: string): Profile['self_region'] {
  return sido ? { sido, sigungu: sigungu || null } : null
}

/** 폼 값 → API. 민감정보 동의가 없으면 특수자격은 보내지 않습니다(null = 입력 안 함, 4.2). */
export function toProfile(v: ProfileFormValues, sensitiveAgreed: boolean): Profile {
  const self = region(v.self_sido, v.self_sigungu)
  return {
    name: v.name.trim(),
    gender: v.gender,
    birth_year: v.birth_year,
    gpa: v.gpa,
    score_100: v.score_100,
    credits: v.credits,
    gpa_total: v.gpa_total,
    score_100_total: v.score_100_total,
    grade: Number(v.grade),
    extra_semester: v.extra_semester,
    enrollment_status: v.enrollment_status,
    department: v.department,
    aibc_member: v.aibc_member === 'yes',
    income_bracket: v.income_bracket === '' ? null : Number(v.income_bracket),
    self_region: self,
    parent_region: v.parent_same ? self : region(v.parent_sido, v.parent_sigungu),
    // 동의했다면 체크하지 않은 것은 '해당 없음'([])입니다.
    special_flags: sensitiveAgreed ? v.special_flags : null,
    full_tuition_waiver: v.full_tuition_waiver === '' ? null : v.full_tuition_waiver,
  }
}

/** API → 폼 기본값. 처음 입력이면 빈 폼. */
export function toFormValues(p: Profile | null): Partial<ProfileFormValues> {
  const empty = {
    income_bracket: '',
    self_sido: '',
    self_sigungu: '',
    parent_same: false,
    parent_sido: '',
    parent_sigungu: '',
    special_flags: [],
    full_tuition_waiver: '',
    extra_semester: false,
    score_100: null,
    credits: null,
    gpa_total: null,
    score_100_total: null,
  } satisfies Partial<ProfileFormValues>
  if (!p) return empty
  const same =
    !!p.self_region &&
    p.parent_region?.sido === p.self_region.sido &&
    (p.parent_region?.sigungu ?? null) === (p.self_region.sigungu ?? null)
  return {
    ...empty,
    name: p.name,
    gender: p.gender,
    birth_year: p.birth_year,
    gpa: p.gpa,
    score_100: p.score_100 ?? null,
    credits: p.credits ?? null,
    gpa_total: p.gpa_total ?? null,
    score_100_total: p.score_100_total ?? null,
    grade: String(p.grade) as ProfileFormValues['grade'],
    extra_semester: p.extra_semester,
    enrollment_status: p.enrollment_status,
    department: p.department,
    aibc_member: p.aibc_member ? 'yes' : 'no',
    income_bracket: p.income_bracket == null ? '' : String(p.income_bracket),
    self_sido: p.self_region?.sido ?? '',
    self_sigungu: p.self_region?.sigungu ?? '',
    parent_same: same,
    parent_sido: same ? '' : (p.parent_region?.sido ?? ''),
    parent_sigungu: same ? '' : (p.parent_region?.sigungu ?? ''),
    special_flags: (p.special_flags ?? []) as ProfileFormValues['special_flags'],
    full_tuition_waiver: p.full_tuition_waiver ?? '',
  }
}
