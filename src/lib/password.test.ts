// 가입·변경 비밀번호 규칙 (계획서 7.3, T38). backend validate_new_password와 같은 규칙·문장입니다.
import { newPasswordSchema, PASSWORD_RULES } from './password'

const LENGTH = '비밀번호는 8~16자로 입력하세요'
const LETTER = '영문을 1자 이상 넣어 주세요'
const DIGIT = '숫자를 1자 이상 넣어 주세요'
const SPECIAL = '특수문자를 1자 이상 넣어 주세요'
const CHARSET = '영문·숫자·특수문자만 쓸 수 있어요'

function errorOf(value: string) {
  const result = newPasswordSchema.safeParse(value)
  return result.success ? undefined : result.error.issues[0]?.message
}

describe('newPasswordSchema', () => {
  it.each([
    ['abc12!', LENGTH],
    ['abcdefgh12345678!', LENGTH],
    ['abcdefgh', DIGIT],
    ['12345678!', LETTER],
    ['abcd1234', SPECIAL],
    ['abcd 12!', CHARSET],
    ['비밀번호12!a', CHARSET],
  ])('"%s" 는 막는다: %s', (value, message) => {
    expect(errorOf(value)).toBe(message)
  })

  it.each(['abcd123!', 'Abcdefgh1234567!', 'abc12\\]x~'])('"%s" 는 통과한다', (value) => {
    expect(errorOf(value)).toBeUndefined()
  })
})

describe('PASSWORD_RULES', () => {
  it('안내 항목 4개를 순서대로 검사한다', () => {
    expect(PASSWORD_RULES.map((r) => r.label)).toEqual([
      '8~16자',
      '영문 포함',
      '숫자 포함',
      '특수문자 포함',
    ])
    expect(PASSWORD_RULES.map((r) => r.test('abcd1234'))).toEqual([true, true, true, false])
  })
})
