// 대시보드 "빠른 확인" 질문 (계획서 7.1). 이미 받은 목록으로 계산합니다(9.8).
// 후보: 확인 필요이고, 답하지 않은 추가 조건이 1개뿐이며, 그 밖에 모르는 조건·못 읽은 첨부가 없는 장학금.
// 그 조건 하나에 답하면 판정이 지원 가능(맞아요) 또는 지원 불가(안 맞아요)로 정해집니다.
// 같은 문장(key)을 가진 후보는 한 질문으로 묶어 한 번 답하면 모두에 반영합니다.
import type { ScholarshipSummary } from '@/api/hooks/scholarships'

type Item = Pick<
  ScholarshipSummary,
  | 'id'
  | 'name'
  | 'display_name'
  | 'result'
  | 'status'
  | 'apply_end'
  | 'open_conditions'
  | 'other_unknown'
>

export interface QuickQuestion {
  /** 답할 조건 (모든 target에 같은 문장) */
  condition: { key: string; text: string }
  /** 답하면 판정이 정해지는 장학금. 마감 빠른 순 */
  targets: Pick<Item, 'id' | 'name'>[]
}

/** 하나만 확인하면 판정이 정해지는 장학금. 마감 빠른 순, 마감 없는 것은 뒤. */
export function unlockCandidates<T extends Item>(items: readonly T[]): T[] {
  return items
    .filter(
      (item) =>
        item.result === 'CONDITIONAL' &&
        item.status !== 'CLOSED' &&
        !item.other_unknown &&
        item.open_conditions.length === 1,
    )
    .sort(byDeadline)
}

function byDeadline(a: Item, b: Item): number {
  if (a.apply_end === b.apply_end) return a.id - b.id
  if (a.apply_end === null) return 1
  if (b.apply_end === null) return -1
  return new Date(a.apply_end).getTime() - new Date(b.apply_end).getTime()
}

/**
 * 물어볼 질문 목록. 한 번 답하면 정해지는 장학금이 많은 질문부터, 수가 같으면 마감이 가까운 장학금이
 * 있는 질문부터입니다. `done`(이미 답했거나 건너뛴 key)은 다시 묻지 않습니다.
 */
export function quickQuestions(
  items: readonly Item[],
  done: ReadonlySet<string> = new Set(),
): QuickQuestion[] {
  const groups = new Map<string, QuickQuestion>()
  for (const item of unlockCandidates(items)) {
    const condition = item.open_conditions[0]
    if (done.has(condition.key)) continue
    const group = groups.get(condition.key) ?? { condition, targets: [] }
    group.targets.push({ id: item.id, name: item.display_name }) // 안내 문구에는 쉬운 이름
    groups.set(condition.key, group)
  }
  // Map은 넣은 순서(마감 빠른 순)를 지키고 sort는 안정 정렬이라, 수가 같으면 마감 순이 됩니다.
  return [...groups.values()].sort((a, b) => b.targets.length - a.targets.length)
}

/** "답하면 '○○' 외 N개의 지원 가능 여부를 바로 알려 드려요." */
export function questionNote(question: QuickQuestion): string {
  const [first, ...rest] = question.targets
  const who = rest.length > 0 ? `‘${first.name}’ 외 ${rest.length}개의` : `‘${first.name}’의`
  return `답하면 ${who} 지원 가능 여부를 바로 알려 드려요.`
}
