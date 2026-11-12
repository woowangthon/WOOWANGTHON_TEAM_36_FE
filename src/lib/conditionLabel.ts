// 직접 답하는 조건(추가 조건)의 짧은 이름 (계획서 7.1). 추출 결과는 원문 문장뿐이라
// 화면에서 단어로 이름을 붙입니다. 위에서부터 먼저 맞는 규칙을 쓰고, 없으면 '기타 조건'입니다.
const RULES: [RegExp, string][] = [
  [/TOEIC|TOEFL|토익|토플|IELTS|OPIc|어학/i, '어학 성적'],
  [/주민등록|거주/, '거주 기간'],
  [/휴학/, '휴학 계획'],
  [/편입/, '편입 계획'],
  [/고등학교/, '출신 학교'],
  [/수혜|중복|장학생|선발 이력|신청하였|신청하여|신청 후|미선발/, '신청 이력'],
  [/학과|전공/, '전공'],
  [/수료|이수|교육과정/, '교육 이수'],
]

export function conditionLabel(text: string): string {
  for (const [pattern, label] of RULES) if (pattern.test(text)) return label
  return '기타 조건'
}
