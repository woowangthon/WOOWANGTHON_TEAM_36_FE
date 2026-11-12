// 가입·변경 비밀번호 규칙 (계획서 7.3, T38). backend `validate_new_password`와 같은 규칙·문장이어야 합니다.
// 8~16자, 영문·숫자·특수문자(ASCII) 각 1자 이상. 로그인 칸은 이 규칙을 쓰지 않습니다.
import { z } from 'zod'

export const PASSWORD_MIN = 8
export const PASSWORD_MAX = 16

const LETTER = /[A-Za-z]/
const DIGIT = /[0-9]/
// Python string.punctuation과 같은 32자 (정규식 이스케이프 실수를 피하려고 글자 목록으로 둡니다)
const SPECIALS = new Set('!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~')
const isSpecial = (ch: string) => SPECIALS.has(ch)
const isAllowed = (ch: string) => LETTER.test(ch) || DIGIT.test(ch) || isSpecial(ch)
const SPECIAL = { test: (v: string) => [...v].some(isSpecial) }
const ALLOWED = { test: (v: string) => [...v].every(isAllowed) }

const inLength = (v: string) => v.length >= PASSWORD_MIN && v.length <= PASSWORD_MAX

/** 입력 칸 아래 안내 목록. 입력하는 동안 충족한 항목에 ✓를 붙입니다. */
export const PASSWORD_RULES = [
  { key: 'length', label: `${PASSWORD_MIN}~${PASSWORD_MAX}자`, test: inLength },
  { key: 'letter', label: '영문 포함', test: (v: string) => LETTER.test(v) },
  { key: 'digit', label: '숫자 포함', test: (v: string) => DIGIT.test(v) },
  { key: 'special', label: '특수문자 포함', test: (v: string) => SPECIAL.test(v) },
] as const

/** 어긴 규칙 하나를 알려 줍니다. 순서: 길이 → 허용 문자 → 영문 → 숫자 → 특수문자(backend와 같음). */
export function passwordError(v: string): string | null {
  if (!inLength(v)) return `비밀번호는 ${PASSWORD_MIN}~${PASSWORD_MAX}자로 입력하세요`
  if (!ALLOWED.test(v)) return '영문·숫자·특수문자만 쓸 수 있어요'
  if (!LETTER.test(v)) return '영문을 1자 이상 넣어 주세요'
  if (!DIGIT.test(v)) return '숫자를 1자 이상 넣어 주세요'
  if (!SPECIAL.test(v)) return '특수문자를 1자 이상 넣어 주세요'
  return null
}

export const newPasswordSchema = z.string().superRefine((v, ctx) => {
  const message = passwordError(v)
  if (message) ctx.addIssue({ code: 'custom', message })
})
