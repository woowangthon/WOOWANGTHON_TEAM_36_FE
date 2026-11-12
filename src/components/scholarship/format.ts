// 장학금 화면의 표시 규칙. 날짜는 모두 한국 시간(Asia/Seoul)으로 계산·표시합니다(frontend CLAUDE.md).
import type {
  ConditionCheck,
  ScholarshipSummary,
  UnreadAttachment,
  UserState,
} from '@/api/hooks/scholarships'

const TIME_ZONE = 'Asia/Seoul'
const DAY_MS = 24 * 60 * 60 * 1000

/** 그 시각의 한국 날짜를 UTC 자정 밀리초로 (날짜끼리 빼기 위해). */
function seoulDay(value: Date): number {
  const [y, m, d] = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE })
    .format(value)
    .split('-')
    .map(Number)
  return Date.UTC(y, m - 1, d)
}

export type Deadline = { label: string; tone: 'urgent' | 'normal' | 'muted' }

/** 마감 D-Day. `apply_end` 기준이며 `ALWAYS`는 "상시·확인 필요"입니다(7.1). */
export function deadlineOf(
  item: Pick<ScholarshipSummary, 'status' | 'apply_end'>,
  now: Date = new Date(),
): Deadline {
  if (item.status === 'ALWAYS') return { label: '상시·확인 필요', tone: 'muted' }
  if (item.status === 'CLOSED') return { label: '마감', tone: 'muted' }
  if (!item.apply_end) return { label: '마감일 미정', tone: 'muted' }
  const end = new Date(item.apply_end)
  if (end.getTime() < now.getTime()) return { label: '마감', tone: 'muted' }
  const days = Math.round((seoulDay(end) - seoulDay(now)) / DAY_MS)
  if (days === 0) return { label: 'D-Day', tone: 'urgent' }
  return { label: `D-${days}`, tone: days <= 3 ? 'urgent' : 'normal' }
}

const dateTime = new Intl.DateTimeFormat('ko-KR', {
  timeZone: TIME_ZONE,
  month: 'long',
  day: 'numeric',
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})
const dateOnly = new Intl.DateTimeFormat('ko-KR', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})

export const formatDateTime = (value: string) => dateTime.format(new Date(value))
export const formatDate = (value: string) => dateOnly.format(new Date(value))

export const RESULT_LABEL = {
  ELIGIBLE: '지원 가능',
  CONDITIONAL: '확인 필요',
  INELIGIBLE: '지원 불가',
} as const satisfies Record<ScholarshipSummary['result'], string>

export const STATE_LABEL = {
  BOOKMARKED: '관심',
  APPLIED: '신청완료',
} as const satisfies Record<UserState, string>

/** 체크리스트에 쓰는 조건 이름 (5.2, 5.3). */
export const CONDITION_LABEL = {
  target_grades: '학년',
  excludes_extra_semester: '초과학기 제외',
  excludes_new_students: '신·편입생 제외',
  min_remaining_semesters: '남은 정규학기',
  enrollment_status: '재학상태',
  min_gpa: '평점',
  min_score_100: '100점 환산 성적',
  min_credits: '이수학점',
  gender: '성별',
  max_age: '나이',
  max_income_bracket: '소득분위',
  regions: '지역',
  required_special: '특수자격',
  excludes_full_tuition: '등록금 전액 감면자 제외',
  target_department: '학과',
  target_program: 'AI부트캠프사업단 양성인재',
} as const satisfies Record<ConditionCheck['condition'], string>

/** 근거가 나온 곳. 서버는 "본문" 또는 첨부 파일 이름을 줍니다(5.2 `evidence_source`). */
export function evidenceSourceLabel(source: string): string {
  return source === '본문' ? '공지 본문' : `첨부 ${source}`
}

/** 첨부를 읽지 못한 이유 (5.3). */
export const UNREAD_REASON = {
  NO_TEXT: '글자를 읽을 수 없는 파일 (스캔본·이미지)',
  UNSUPPORTED: '읽을 수 없는 파일 형식',
  FAILED: '파일을 열지 못함',
  TOO_LARGE: '파일이 너무 큼',
} as const satisfies Record<UnreadAttachment['reason'], string>

export const OUTCOME = {
  MET: { mark: '✓', label: '충족' },
  UNMET: { mark: '✗', label: '불충족' },
  UNKNOWN: { mark: '?', label: '확인 필요' },
} as const satisfies Record<ConditionCheck['outcome'], { mark: string; label: string }>
