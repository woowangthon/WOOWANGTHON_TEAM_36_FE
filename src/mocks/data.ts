// MSW 목 데이터. 타입은 backend /openapi.json에서 생성한 schema.gen.ts만 씁니다.
// 판정 결과 3종(ELIGIBLE/CONDITIONAL/INELIGIBLE)과 장학금 상태 3종(OPEN/ALWAYS/CLOSED)을 모두 포함합니다.
import type { components } from '@/api/schema.gen'

type Schemas = components['schemas']
export type MeResponse = Schemas['MeResponse']
export type Profile = Schemas['Profile']
export type ScholarshipDetail = Schemas['ScholarshipDetail']
export type ScholarshipSummary = Schemas['ScholarshipSummary']
export type CrawlRunOut = Schemas['CrawlRunOut']
export type AdminNotice = Schemas['AdminNotice']

export const mockMe: MeResponse = {
  id: 1,
  email: 'student@example.com',
  privacy_agreed: true,
  sensitive_agreed: false,
  profile_completed: true,
  is_admin: false,
  google_linked: false,
  has_password: true,
  email_notifications: true,
}

export const mockProfile: Profile = {
  name: '김충북',
  gender: '여',
  birth_year: 2004,
  gpa: 3.8,
  score_100: 90.5, // 평점 × 10 + 52.5
  credits: 18,
  gpa_total: 3.7,
  score_100_total: 89.5,
  completed_semesters: 5,
  enrollment_status: '재학',
  aibc_member: false,
  is_transfer: false,
  is_foreign: false,
  income_bracket: 6,
  self_region: { sido: '충청북도', sigungu: '청주시' },
  parent_region: { sido: '충청남도', sigungu: '논산시' },
  special_flags: null,
  full_tuition_waiver: '아니오',
}

/**
 * 추가 조건마다 사용자 답(처음에는 모두 null = '?'). 목에서는 key를 문장 앞부분으로 만듭니다
 * (backend는 정규화한 문장의 SHA-256 앞 16자, 계획서 5.3). 같은 문장이면 같은 key입니다.
 */
export function mockConditionKey(text: string): string {
  let hash = 0
  for (const ch of text) hash = (hash * 31 + ch.codePointAt(0)!) >>> 0
  return hash.toString(16).padStart(16, '0')
}

/** 문장만 주면 요약 없음(예전 추출 결과), `[문장, 요약]`이면 요약 있음(extract_v10). */
function extraChecks(items: (string | [string, string])[]): Schemas['ExtraCheck'][] {
  return items.map((item) => {
    const [text, summary] = typeof item === 'string' ? [item, null] : item
    return { key: mockConditionKey(text), text, summary, answer: null }
  })
}

const sw = { source_code: 'SW_DEPT', source_name: '소프트웨어학부', is_internal: true } as const
const aibc = { source_code: 'AIBC', source_name: 'AI부트캠프사업단', is_internal: true } as const
const kosaf = { source_code: 'KOSAF', source_name: '한국장학재단', is_internal: false } as const

const noticeA = {
  id: 101,
  title: '2026학년도 2학기 교외장학금 3종 모집 ( ~11.12 18:00)',
  url: 'https://software.cbnu.ac.kr/index.php?mid=sub0401&document_srl=1154830',
  posted_at: '2026-10-30T09:00:00+09:00',
  body_text:
    '2026학년도 2학기 교외장학금 3종 장학생을 아래와 같이 모집하오니 희망하는 학생은 기한 내 신청하기 바랍니다.\n\n1. 신청 기간: 2026. 11. 3.(월) ~ 11. 12.(수) 18:00\n2. 신청 방법: 학부 사무실 방문 제출\n3. 장학금별 자격 요건은 첨부 공고문을 확인하세요.\n\n문의: 소프트웨어학부 행정실 043-000-0000',
  attachments: [
    {
      name: '2026-2 교외장학금 공고문.hwp',
      url: 'https://software.cbnu.ac.kr/files/notice-1154830.hwp',
      text: '장학금명 | 선발 인원 | 지원 금액\n두산연강재단 장학금 | 2명 | 등록금 전액\n논산시 인재육성 장학금 | 1명 | 200만 원\n여성공학인 장학금 | 1명 | 150만 원\n\n지원 자격: 직전학기 평점평균 3.0 이상, 직전학기 12학점 이상 이수',
    },
  ],
}

// 목록용 칸(open_conditions·other_unknown)은 extra_checks에서 계산해 붙입니다(withDerived).
// 조건 요약 칸(ambiguous·basic_items, extract_v10)은 적지 않으면 기본값(모호하지 않음·요약 없음)을 채웁니다.
type RawCheck = Omit<Schemas['ConditionCheck'], 'ambiguous'> & { ambiguous?: boolean }
type RawDetail = Omit<
  ScholarshipDetail,
  'open_conditions' | 'other_unknown' | 'conditions' | 'basic_items' | 'also_posted_in'
> & {
  conditions: RawCheck[]
  basic_items?: Schemas['ConditionTextOut'][]
  also_posted_in?: string[] // 목록에서 묶인 다른 게시판 (T45). 적지 않으면 없음
}

const rawDetails: RawDetail[] = [
  {
    id: 1,
    name: '2026학년도 2학기 (재)두산연강재단 장학생 선발',
    display_name: '두산연강재단 장학금',
    ...sw,
    also_posted_in: ['한국장학재단'], // 재단 누리집에도 같은 공지 (T46)
    benefit_amount_text: '연 600만원',
    benefit_type: '등록금성',
    apply_start: '2026-10-30T09:00:00+09:00',
    apply_end: '2026-11-12T18:00:00+09:00',
    status: 'OPEN',
    deadline_conflict: false,
    posted_at: noticeA.posted_at,
    result: 'ELIGIBLE',
    my_state: 'BOOKMARKED',
    conditions: [
      {
        condition: 'target_grades',
        outcome: 'MET',
        evidence: '2·3학년 재학생',
        requirement: '2·3학년',
      },
      {
        condition: 'target_nationality',
        outcome: 'MET',
        evidence: '대한민국 국적의 대학교 재학생',
        requirement: '대한민국 국적',
      },
      {
        condition: 'min_gpa',
        outcome: 'MET',
        evidence: '직전학기 평점평균 3.5 이상인 자',
        requirement: '직전학기 3.5 이상',
      },
      {
        condition: 'max_income_bracket',
        outcome: 'MET',
        evidence: '학자금지원구간 8구간 이하',
        requirement: '8구간 이하',
      },
    ],
    unread_attachments: [],
    input_truncated: false,
    extra_conditions: [],
    extra_checks: extraChecks([]),
    basic_conditions: [],
    notes: [],
    required_documents: ['재학증명서', '성적증명서'],
    notice: noticeA,
    siblings: [
      {
        id: 2,
        name: '논산시 인재육성 장학금',
        display_name: '논산시 인재육성 장학금',
        status: 'OPEN',
      },
      { id: 3, name: '여성공학인 장학금', display_name: '여성공학인 장학금', status: 'OPEN' },
    ],
  },
  {
    id: 2,
    name: '논산시 인재육성 장학금',
    display_name: '논산시 인재육성 장학금',
    ...sw,
    benefit_amount_text: '200만원',
    benefit_type: '생활비성',
    apply_start: '2026-10-30T09:00:00+09:00',
    apply_end: '2026-11-12T18:00:00+09:00',
    status: 'OPEN',
    deadline_conflict: true,
    posted_at: noticeA.posted_at,
    result: 'CONDITIONAL',
    my_state: null,
    conditions: [
      {
        condition: 'regions',
        outcome: 'MET',
        evidence: '부모가 논산시에 1년 이상 거주한 학생',
        requirement: '부모 주소 충청남도 논산시',
      },
      // 공지 기준이 모호한 조건: 요약 대신 "공지 기준이 명확하지 않아요" (extract_v10)
      {
        condition: 'max_income_bracket',
        outcome: 'UNKNOWN',
        evidence: '저소득층 우선 선발',
        requirement: null,
        ambiguous: true,
      },
    ],
    unread_attachments: [],
    input_truncated: false,
    extra_conditions: ['직전학기 봉사활동 20시간 이상'],
    extra_checks: extraChecks([
      ['직전학기 봉사활동 20시간 이상', '직전학기 봉사 20시간 이상 학생'],
    ]),
    basic_conditions: ['대한민국 국적', '타 장학금과 중복 수혜 불가'],
    basic_items: [
      { text: '대한민국 국적', summary: null },
      { text: '타 장학금과 중복 수혜 불가', summary: '다른 장학금을 받지 않는 학생' },
    ],
    notes: ['면접 점수 석차순 선발'],
    required_documents: ['주민등록등본', '재학증명서'],
    notice: noticeA,
    siblings: [
      {
        id: 1,
        name: '2026학년도 2학기 (재)두산연강재단 장학생 선발',
        display_name: '두산연강재단 장학금',
        status: 'OPEN',
      },
      { id: 3, name: '여성공학인 장학금', display_name: '여성공학인 장학금', status: 'OPEN' },
    ],
  },
  {
    id: 3,
    name: '여성공학인 장학금',
    display_name: '여성공학인 장학금',
    ...sw,
    benefit_amount_text: '300만원',
    benefit_type: '혼합',
    apply_start: '2026-10-30T09:00:00+09:00',
    apply_end: '2026-11-12T18:00:00+09:00',
    status: 'OPEN',
    deadline_conflict: false,
    posted_at: noticeA.posted_at,
    result: 'INELIGIBLE',
    my_state: null,
    conditions: [
      { condition: 'gender', outcome: 'MET', evidence: '여학생' },
      { condition: 'target_grades', outcome: 'UNMET', evidence: '4학년 재학생' },
    ],
    unread_attachments: [],
    input_truncated: false,
    extra_conditions: [],
    extra_checks: extraChecks([]),
    basic_conditions: [],
    notes: [],
    required_documents: ['재학증명서'],
    notice: noticeA,
    siblings: [
      {
        id: 1,
        name: '2026학년도 2학기 (재)두산연강재단 장학생 선발',
        display_name: '두산연강재단 장학금',
        status: 'OPEN',
      },
      {
        id: 2,
        name: '논산시 인재육성 장학금',
        display_name: '논산시 인재육성 장학금',
        status: 'OPEN',
      },
    ],
  },
  {
    id: 4,
    name: 'AI부트캠프 양성인재 학업장려금',
    display_name: 'AI부트캠프 양성인재 학업장려금',
    ...aibc,
    benefit_amount_text: '월 30만원',
    benefit_type: '생활비성',
    apply_start: null,
    apply_end: null,
    status: 'ALWAYS',
    deadline_conflict: false,
    posted_at: '2026-03-02T10:00:00+09:00',
    result: 'INELIGIBLE',
    my_state: null,
    conditions: [{ condition: 'target_program', outcome: 'UNMET', evidence: 'AIBC 양성인재' }],
    unread_attachments: [],
    input_truncated: false,
    extra_conditions: [],
    extra_checks: extraChecks([]),
    basic_conditions: [],
    notes: [],
    required_documents: [],
    notice: {
      id: 102,
      title: '[장학금] 양성인재 학업장려금 지급 기준 안내',
      url: 'https://aibc.cbnu.ac.kr/menu/1108/aq74eFJIirVMESsaQS7qtM',
      posted_at: '2026-03-02T10:00:00+09:00',
      body_text: '공지 본문입니다. 자세한 내용은 원문 링크를 확인하세요.',
      attachments: [],
    },
    siblings: [],
  },
  {
    id: 5,
    name: '2026년 2학기 국가근로장학금',
    display_name: '국가근로장학금',
    ...kosaf,
    benefit_amount_text: '시급 10,030원',
    benefit_type: '생활비성',
    apply_start: '2026-08-01T09:00:00+09:00',
    apply_end: '2026-09-15T18:00:00+09:00',
    status: 'CLOSED',
    deadline_conflict: false,
    posted_at: '2026-07-28T14:00:00+09:00',
    result: 'ELIGIBLE',
    my_state: 'APPLIED',
    conditions: [{ condition: 'max_income_bracket', outcome: 'MET', evidence: '8구간 이하' }],
    unread_attachments: [],
    input_truncated: false,
    extra_conditions: [],
    extra_checks: extraChecks([]),
    basic_conditions: [],
    notes: [],
    required_documents: [],
    notice: {
      id: 103,
      title: '2026년 2학기 국가근로장학금 신청 안내',
      url: 'https://kosaf.go.kr/ko/notice.do?mode=view&seqNo=21449',
      posted_at: '2026-07-28T14:00:00+09:00',
      body_text: '공지 본문입니다. 자세한 내용은 원문 링크를 확인하세요.',
      attachments: [],
    },
    siblings: [],
  },
  {
    id: 6,
    name: '푸른등대 기부장학금',
    display_name: '푸른등대 기부장학금',
    ...kosaf,
    // 긴 금액 문장 (T68, 실제 추출처럼 여러 줄이 되는 경우 확인용)
    benefit_amount_text:
      '매학기 등록금 범위 내 필수경비 전액 지원(기초생활수급자는 학기당 생활비 250만 원 추가 지원)',
    benefit_type: '등록금성',
    apply_start: '2026-11-01T09:00:00+09:00',
    apply_end: '2026-11-20T18:00:00+09:00',
    status: 'OPEN',
    deadline_conflict: false,
    posted_at: '2026-11-01T09:00:00+09:00',
    result: 'CONDITIONAL',
    my_state: null,
    conditions: [
      {
        condition: 'min_gpa',
        outcome: 'MET',
        evidence: '직전학기 성적 3.0 이상',
        evidence_source: '업무처리기준.zip / 업무처리기준.pdf',
      },
      {
        condition: 'required_special',
        outcome: 'UNKNOWN',
        evidence: '한부모가정 우대',
        evidence_source: '본문',
      },
    ],
    // 읽지 못한 첨부가 있어 다른 조건이 충족이어도 확인 필요 (계획서 5.3)
    unread_attachments: [
      {
        name: '업무처리기준.zip / 추천서 양식.jpg',
        url: 'https://www.kosaf.go.kr/ko/download.do?pPath=notice&pSeq_No=21510&pFile_No=1',
        reason: 'UNSUPPORTED',
      },
    ],
    input_truncated: true,
    extra_conditions: [],
    extra_checks: extraChecks([]),
    basic_conditions: [],
    notes: [],
    required_documents: ['가족관계증명서'],
    notice: {
      id: 104,
      title: '2026년 푸른등대 기부장학금 신규장학생 선발',
      url: 'https://kosaf.go.kr/ko/notice.do?mode=view&seqNo=21510',
      posted_at: '2026-11-01T09:00:00+09:00',
      body_text: '공지 본문입니다. 자세한 내용은 원문 링크를 확인하세요.',
      attachments: [],
    },
    siblings: [],
  },
  {
    id: 7,
    name: '희망사다리 장학금 II유형',
    display_name: '희망사다리 장학금 II유형',
    ...kosaf,
    benefit_amount_text: '등록금 전액',
    benefit_type: '등록금성',
    apply_start: '2026-11-05T09:00:00+09:00',
    apply_end: '2026-12-31T18:00:00+09:00',
    status: 'OPEN',
    deadline_conflict: false,
    posted_at: '2026-11-05T09:00:00+09:00',
    result: 'ELIGIBLE',
    my_state: null,
    conditions: [
      { condition: 'max_income_bracket', outcome: 'MET', evidence: '학자금지원 8구간 이하' },
    ],
    unread_attachments: [],
    input_truncated: false,
    extra_conditions: [],
    extra_checks: extraChecks([]),
    basic_conditions: [],
    notes: [],
    required_documents: ['취업 약정서'],
    notice: {
      id: 105,
      title: '2026년 희망사다리 장학금 II유형 신청 안내',
      url: 'https://kosaf.go.kr/ko/notice.do?mode=view&seqNo=21530',
      posted_at: '2026-11-05T09:00:00+09:00',
      body_text: '공지 본문입니다. 자세한 내용은 원문 링크를 확인하세요.',
      attachments: [],
    },
    siblings: [],
  },
  // 추가 조건 하나만 확인하면 판정이 정해지는 장학금 (대시보드 빠른 확인, 계획서 7.1).
  // 9·10번은 같은 문장이라 한 질문으로 묶입니다. 8번은 요약이 없는 예전 추출 결과입니다.
  ...[
    {
      id: 8,
      name: '청주시 미래인재 장학금',
      apply_end: '2026-11-18T18:00:00+09:00',
      extra: '청주시에 1년 이상 주민등록이 되어 있는 자',
      summary: null,
    },
    {
      id: 9,
      name: '글로벌 SW 인재 장학금',
      apply_end: '2026-11-25T18:00:00+09:00',
      extra: '※ 2026-1학기 TOEIC 점수 500점 이상 취득',
      summary: 'TOEIC 500점 이상인 학생',
    },
    {
      id: 10,
      name: '해외 연수 지원 장학금',
      apply_end: '2026-12-05T18:00:00+09:00',
      extra: '※ 2026-1학기 TOEIC 점수 500점 이상 취득',
      summary: 'TOEIC 500점 이상인 학생',
    },
  ].map(({ id, name, apply_end, extra, summary }): RawDetail => ({
    id,
    name,
    display_name: name,
    ...kosaf,
    benefit_amount_text: '200만원',
    benefit_type: '등록금성',
    apply_start: '2026-11-05T09:00:00+09:00',
    apply_end,
    status: 'OPEN',
    deadline_conflict: false,
    posted_at: '2026-11-05T09:00:00+09:00',
    result: 'CONDITIONAL',
    my_state: null,
    conditions: [{ condition: 'min_gpa', outcome: 'MET', evidence: '직전학기 평점 3.0 이상' }],
    unread_attachments: [],
    input_truncated: false,
    extra_conditions: [extra],
    extra_checks: extraChecks([summary ? [extra, summary] : extra]),
    basic_conditions: [],
    notes: [],
    required_documents: [],
    notice: {
      id: 100 + id,
      title: `${name} 선발 안내`,
      url: `https://kosaf.go.kr/ko/notice.do?mode=view&seqNo=${21600 + id}`,
      posted_at: '2026-11-05T09:00:00+09:00',
      body_text: '공지 본문입니다. 자세한 내용은 원문 링크를 확인하세요.',
      attachments: [],
    },
    siblings: [],
  })),
]

export const mockDetails: ScholarshipDetail[] = rawDetails.map(withDerived)

/** extra_checks의 답에 맞춰 답하지 않은 조건·다른 모름 여부를 다시 계산합니다(backend와 같음). */
export function withDerived<T extends RawDetail>(d: T): T & ScholarshipDetail {
  const open_conditions = d.extra_checks
    .filter((check) => check.answer === null)
    .map(({ key, text, summary }) => ({ key, text, summary }))
  return {
    ...d,
    conditions: d.conditions.map((c) => ({ ...c, ambiguous: c.ambiguous ?? false })),
    basic_items: d.basic_items ?? d.basic_conditions.map((text) => ({ text, summary: null })),
    open_conditions,
    other_unknown: otherUnknown(d),
    also_posted_in: d.also_posted_in ?? [],
  }
}

export function toSummary(d: ScholarshipDetail): ScholarshipSummary {
  return {
    id: d.id,
    name: d.name,
    display_name: d.display_name,
    source_code: d.source_code,
    source_name: d.source_name,
    is_internal: d.is_internal,
    benefit_amount_text: d.benefit_amount_text,
    benefit_type: d.benefit_type,
    apply_end: d.apply_end,
    status: d.status,
    deadline_conflict: d.deadline_conflict,
    posted_at: d.posted_at,
    result: d.result,
    my_state: d.my_state,
    open_conditions: d.open_conditions,
    other_unknown: d.other_unknown,
    also_posted_in: d.also_posted_in,
  }
}

/** 답하지 않은 추가 조건 말고도 판정을 막는 것(모르는 조건·못 읽은 첨부)이 있는지 */
export function otherUnknown(d: RawDetail): boolean {
  return d.conditions.some((c) => c.outcome === 'UNKNOWN') || d.unread_attachments.length > 0
}

/** backend 판정과 같은 규칙 (계획서 5.3): 미충족·✗ → 지원 불가, 모름·미답 → 확인 필요 */
export function judge(d: ScholarshipDetail): ScholarshipDetail['result'] {
  const answers = d.extra_checks.map((check) => check.answer)
  if (d.conditions.some((c) => c.outcome === 'UNMET') || answers.includes('NO')) return 'INELIGIBLE'
  if (otherUnknown(d) || answers.includes(null)) return 'CONDITIONAL'
  return 'ELIGIBLE'
}

export const mockCrawlRuns: CrawlRunOut[] = [
  {
    id: 3,
    source_code: 'KOSAF',
    status: 'FAILED',
    started_at: '2026-11-05T09:00:01+09:00',
    finished_at: '2026-11-05T09:00:31+09:00',
    new_count: 0,
    error: 'HTTP 503',
  },
  {
    id: 2,
    source_code: 'AIBC',
    status: 'DONE',
    started_at: '2026-11-05T09:00:01+09:00',
    finished_at: '2026-11-05T09:00:15+09:00',
    new_count: 0,
    error: null,
  },
  {
    id: 1,
    source_code: 'SW_DEPT',
    status: 'DONE',
    started_at: '2026-11-05T09:00:01+09:00',
    finished_at: '2026-11-05T09:01:02+09:00',
    new_count: 2,
    error: null,
  },
]

/** 관리자 화면 공지: 추출 실패·대기 공지가 먼저, 그다음 최근 공지 (backend 정렬과 같음). */
export const mockAdminNotices: AdminNotice[] = [
  {
    id: 110,
    source_code: 'KOSAF',
    title: '2026년 하반기 국가장학금 2차 신청 안내',
    url: 'https://kosaf.go.kr/ko/notice.do?mode=view&seqNo=21400',
    posted_at: '2026-10-20T10:00:00+09:00',
    notice_kind: null,
    extract_status: 'FAILED',
    extracted_at: null,
    scholarship_count: 0,
  },
  {
    id: 104,
    source_code: 'KOSAF',
    title: '2026년 푸른등대 기부장학금 신규장학생 선발',
    url: 'https://kosaf.go.kr/ko/notice.do?mode=view&seqNo=21510',
    posted_at: '2026-11-01T09:00:00+09:00',
    notice_kind: '모집',
    extract_status: 'DONE',
    extracted_at: '2026-11-01T10:00:00+09:00',
    scholarship_count: 1,
  },
  {
    id: 101,
    source_code: 'SW_DEPT',
    title: '2026학년도 2학기 교외장학금 3종 모집 ( ~11.12 18:00)',
    url: 'https://software.cbnu.ac.kr/index.php?mid=sub0401&document_srl=1154830',
    posted_at: '2026-10-30T09:00:00+09:00',
    notice_kind: '모집',
    extract_status: 'DONE',
    extracted_at: '2026-10-30T10:00:00+09:00',
    scholarship_count: 3,
  },
]
