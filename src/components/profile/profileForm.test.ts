// 프로필 폼 검증 규칙 (계획서 4.3, 프로필 입력 정의서). backend `ProfileUpdate`와 같은 규칙이어야 합니다.
import type { Profile } from '@/api/hooks/profile'

import {
  maxBirthYear,
  profileSchema,
  toFormValues,
  toProfile,
  type ProfileFormInput,
} from './profileForm'

const valid: ProfileFormInput = {
  name: '충북이',
  gender: '여',
  birth_year: '2004',
  completed_semesters: '5',
  enrollment_status: '재학',
  aibc_member: 'no',
  gpa: '3.8',
  score_100: '',
  credits: '',
  gpa_total: '',
  score_100_total: '',
  income_bracket: '',
  self_sido: '',
  self_sigungu: '',
  parent_same: false,
  parent_sido: '',
  parent_sigungu: '',
  special_flags: [],
  full_tuition_waiver: '',
}

/** 한 칸만 바꿔 검사하고, 그 칸의 오류 메시지를 돌려줍니다(없으면 undefined). */
function errorOf(field: keyof ProfileFormInput, patch: Partial<ProfileFormInput>) {
  const result = profileSchema.safeParse({ ...valid, ...patch })
  if (result.success) return undefined
  return result.error.issues.find((i) => i.path[0] === field)?.message
}

describe('닉네임', () => {
  it.each(['충북이', 'ab', 'cbnu2026', '가나다라마바사아자차'])('%s 는 통과한다', (name) => {
    expect(errorOf('name', { name })).toBeUndefined()
  })

  it.each([
    ['', '닉네임을 입력하세요'],
    ['   ', '닉네임을 입력하세요'],
    ['가', '닉네임은 한글·영문·숫자로 2~10자 입력하세요'],
    ['가나다라마바사아자차카', '닉네임은 한글·영문·숫자로 2~10자 입력하세요'],
    ['김 충북', '닉네임은 한글·영문·숫자로 2~10자 입력하세요'],
    ['ㅋㅋㅋ', '닉네임은 한글·영문·숫자로 2~10자 입력하세요'],
    ['hi!', '닉네임은 한글·영문·숫자로 2~10자 입력하세요'],
    ['😀😀', '닉네임은 한글·영문·숫자로 2~10자 입력하세요'],
    ['1234', '닉네임은 숫자만으로 만들 수 없어요'],
  ])('"%s" 는 막는다', (name, message) => {
    expect(errorOf('name', { name })).toBe(message)
  })

  it('분해형 한글(NFD)과 앞뒤 공백은 고쳐서 받는다', () => {
    const parsed = profileSchema.parse({ ...valid, name: `  ${'충북이'.normalize('NFD')} ` })
    expect(parsed.name).toBe('충북이')
  })
})

describe('출생연도', () => {
  it('범위는 1950 ~ (올해 − 15)이고 올해는 한국 시간 기준이다', () => {
    // UTC로는 아직 2026-12-31이지만 한국은 2027-01-01
    expect(maxBirthYear(new Date('2026-12-31T15:00:00Z'))).toBe(2012)
    expect(maxBirthYear(new Date('2026-12-31T14:59:59Z'))).toBe(2011)
    expect(errorOf('birth_year', { birth_year: '1950' })).toBeUndefined()
    expect(errorOf('birth_year', { birth_year: String(maxBirthYear()) })).toBeUndefined()
    expect(errorOf('birth_year', { birth_year: '1949' })).toBe('연도를 확인하세요')
    expect(errorOf('birth_year', { birth_year: String(maxBirthYear() + 1) })).toBe(
      '연도를 확인하세요',
    )
  })

  it.each(['04', '20045', '2e3', '2004.0', '-2004', '이천사'])('"%s" 는 막는다', (birth_year) => {
    expect(errorOf('birth_year', { birth_year })).toBe('연도를 숫자 4자리로 입력하세요')
  })

  it('비우면 입력하라고 알린다', () => {
    expect(errorOf('birth_year', { birth_year: '' })).toBe('출생연도를 입력하세요')
  })
})

describe('이수학기', () => {
  it.each(['0', '1', '16'])('%s 는 통과한다', (completed_semesters) => {
    expect(errorOf('completed_semesters', { completed_semesters })).toBeUndefined()
  })

  it.each([
    ['', '이수학기를 입력하세요'],
    ['17', '0~16 사이로 입력하세요'],
    ['-1', '정수로 입력하세요'],
    ['2.5', '정수로 입력하세요'],
    ['3e0', '정수로 입력하세요'],
  ])('"%s" 는 막는다', (completed_semesters, message) => {
    expect(errorOf('completed_semesters', { completed_semesters })).toBe(message)
  })
})

describe('성적', () => {
  it('이수학기가 1 이상이면 직전학기 평점이 필수다', () => {
    expect(errorOf('gpa', { gpa: '' })).toBe('평점을 입력하세요')
  })

  it.each([
    ['gpa', '4.5', undefined],
    ['gpa', '0', undefined],
    ['gpa', '4.51', '0~4.5 사이로 입력하세요'],
    ['gpa', '3.755', '소수 둘째 자리까지 입력하세요'],
    ['gpa', '3,8', '숫자로 입력하세요'],
    ['gpa', '-1', '숫자로 입력하세요'],
    ['gpa', '4e0', '숫자로 입력하세요'],
    ['gpa_total', '4.6', '0~4.5 사이로 입력하세요'],
    ['score_100', '100', undefined],
    ['score_100', '100.01', '0~100 사이로 입력하세요'],
    ['score_100_total', '88.123', '소수 둘째 자리까지 입력하세요'],
    ['credits', '30', undefined],
    ['credits', '31', '0~30 사이로 입력하세요'],
    ['credits', '17.5', '정수로 입력하세요'],
  ] as const)('%s = "%s"', (field, value, message) => {
    expect(errorOf(field, { [field]: value })).toBe(message)
  })

  it('이수학기 0이면 성적을 검사하지 않고 모두 null로 보낸다', () => {
    const parsed = profileSchema.parse({
      ...valid,
      completed_semesters: '0',
      gpa: '9.9', // 칸이 숨겨지기 전에 남은 값
      credits: '18',
    })
    expect(toProfile(parsed, false)).toMatchObject({
      completed_semesters: 0,
      gpa: null,
      score_100: null,
      credits: null,
      gpa_total: null,
      score_100_total: null,
    })
  })
})

describe('주소', () => {
  it('"부모 주소가 본인 주소와 같음"인데 본인 주소가 없으면 막는다', () => {
    expect(errorOf('parent_same', { parent_same: true })).toBe('본인 주소를 먼저 입력하세요')
    expect(errorOf('parent_same', { parent_same: true, self_sido: '충청북도' })).toBeUndefined()
  })
})

describe('API 변환', () => {
  it('양성인재 모름과 감면 모름은 null로 보낸다', () => {
    const body = toProfile(profileSchema.parse({ ...valid, aibc_member: 'unknown' }), false)
    expect(body.aibc_member).toBeNull()
    expect(body.full_tuition_waiver).toBeNull()
    expect(body).not.toHaveProperty('grade')
    expect(body).not.toHaveProperty('department')
  })

  it('저장된 값을 폼으로 되돌린다(닉네임이 지워진 사용자는 빈 칸)', () => {
    const saved: Profile = {
      name: null,
      gender: '남',
      birth_year: 2003,
      completed_semesters: 0,
      enrollment_status: '휴학',
      aibc_member: null,
    }
    expect(toFormValues(saved)).toMatchObject({
      name: '',
      completed_semesters: '0',
      enrollment_status: '휴학',
      aibc_member: 'unknown',
      gpa: '',
      full_tuition_waiver: '',
    })
  })
})
