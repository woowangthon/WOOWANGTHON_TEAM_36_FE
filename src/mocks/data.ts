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
  income_bracket: 6,
  self_region: { sido: '충청북도', sigungu: '청주시' },
  parent_region: { sido: '충청남도', sigungu: '논산시' },
  special_flags: null,
  full_tuition_waiver: '아니오',
}

const sw = { source_code: 'SW_DEPT', source_name: '소프트웨어학부', is_internal: true } as const
const aibc = { source_code: 'AIBC', source_name: 'AI부트캠프사업단', is_internal: true } as const
const kosaf = { source_code: 'KOSAF', source_name: '한국장학재단', is_internal: false } as const

const noticeA = {
  id: 101,
  title: '2026학년도 2학기 교외장학금 3종 모집 ( ~11.12 18:00)',
  url: 'https://software.cbnu.ac.kr/index.php?mid=sub0401&document_srl=1154830',
  posted_at: '2026-10-30T09:00:00+09:00',
}

export const mockDetails: ScholarshipDetail[] = [
  {
    id: 1,
    name: '두산연강재단 장학금',
    ...sw,
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
      { condition: 'target_grades', outcome: 'MET', evidence: '2·3학년 재학생' },
      { condition: 'min_gpa', outcome: 'MET', evidence: '직전학기 평점평균 3.5 이상인 자' },
      { condition: 'max_income_bracket', outcome: 'MET', evidence: '학자금지원구간 8구간 이하' },
    ],
    extra_conditions: [],
    required_documents: ['재학증명서', '성적증명서'],
    notice: noticeA,
    siblings: [
      { id: 2, name: '논산시 인재육성 장학금', status: 'OPEN' },
      { id: 3, name: '여성공학인 장학금', status: 'OPEN' },
    ],
  },
  {
    id: 2,
    name: '논산시 인재육성 장학금',
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
      },
      { condition: 'max_income_bracket', outcome: 'UNKNOWN', evidence: '저소득층 우선 선발' },
    ],
    extra_conditions: ['직전학기 봉사활동 20시간 이상'],
    required_documents: ['주민등록등본', '재학증명서'],
    notice: noticeA,
    siblings: [
      { id: 1, name: '두산연강재단 장학금', status: 'OPEN' },
      { id: 3, name: '여성공학인 장학금', status: 'OPEN' },
    ],
  },
  {
    id: 3,
    name: '여성공학인 장학금',
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
    extra_conditions: [],
    required_documents: ['재학증명서'],
    notice: noticeA,
    siblings: [
      { id: 1, name: '두산연강재단 장학금', status: 'OPEN' },
      { id: 2, name: '논산시 인재육성 장학금', status: 'OPEN' },
    ],
  },
  {
    id: 4,
    name: 'AI부트캠프 양성인재 학업장려금',
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
    extra_conditions: [],
    required_documents: [],
    notice: {
      id: 102,
      title: '[장학금] 양성인재 학업장려금 지급 기준 안내',
      url: 'https://aibc.cbnu.ac.kr/menu/1108/aq74eFJIirVMESsaQS7qtM',
      posted_at: '2026-03-02T10:00:00+09:00',
    },
    siblings: [],
  },
  {
    id: 5,
    name: '2026년 2학기 국가근로장학금',
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
    extra_conditions: [],
    required_documents: [],
    notice: {
      id: 103,
      title: '2026년 2학기 국가근로장학금 신청 안내',
      url: 'https://kosaf.go.kr/ko/notice.do?mode=view&seqNo=21449',
      posted_at: '2026-07-28T14:00:00+09:00',
    },
    siblings: [],
  },
  {
    id: 6,
    name: '푸른등대 기부장학금',
    ...kosaf,
    benefit_amount_text: '최대 400만원',
    benefit_type: '등록금성',
    apply_start: '2026-11-01T09:00:00+09:00',
    apply_end: '2026-11-20T18:00:00+09:00',
    status: 'OPEN',
    deadline_conflict: false,
    posted_at: '2026-11-01T09:00:00+09:00',
    result: 'CONDITIONAL',
    my_state: 'HIDDEN',
    conditions: [
      { condition: 'min_gpa', outcome: 'MET', evidence: '직전학기 성적 3.0 이상' },
      { condition: 'required_special', outcome: 'UNKNOWN', evidence: '한부모가정 우대' },
    ],
    extra_conditions: [],
    required_documents: ['가족관계증명서'],
    notice: {
      id: 104,
      title: '2026년 푸른등대 기부장학금 신규장학생 선발',
      url: 'https://kosaf.go.kr/ko/notice.do?mode=view&seqNo=21510',
      posted_at: '2026-11-01T09:00:00+09:00',
    },
    siblings: [],
  },
  {
    id: 7,
    name: '희망사다리 장학금 II유형',
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
    extra_conditions: [],
    required_documents: ['취업 약정서'],
    notice: {
      id: 105,
      title: '2026년 희망사다리 장학금 II유형 신청 안내',
      url: 'https://kosaf.go.kr/ko/notice.do?mode=view&seqNo=21530',
      posted_at: '2026-11-05T09:00:00+09:00',
    },
    siblings: [],
  },
]

export function toSummary(d: ScholarshipDetail): ScholarshipSummary {
  return {
    id: d.id,
    name: d.name,
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
  }
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
