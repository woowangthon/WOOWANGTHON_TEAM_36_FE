// "이것만 확인하면 N개가 풀려요" 안내 (계획서 7.1, 2026-11-12). 비교용 3안을 순수 함수로 둡니다.
// 후보: 확인 필요이고, 답하지 않은 추가 조건이 1개뿐이며, 그 밖에 모르는 조건·못 읽은 첨부가 없는 장학금.
// 그 조건 하나에 답하면 판정이 지원 가능(해당돼요) 또는 지원 불가(아니에요)로 정해집니다.
import type { ScholarshipSummary } from '@/api/hooks/scholarships'

export const HINT_VARIANTS = [1, 2, 3] as const
export type HintVariant = (typeof HINT_VARIANTS)[number]

type Item = Pick<
  ScholarshipSummary,
  'id' | 'name' | 'result' | 'status' | 'apply_end' | 'open_conditions' | 'other_unknown'
>

export interface UnlockHint {
  variant: HintVariant
  /** 화면에 보여 줄 한 줄 */
  message: string
  /** 답할 조건 (모든 target에 같은 문장) */
  condition: { key: string; text: string }
  /** 답하면 판정이 정해지는 장학금. 안 1·2는 1개, 안 3은 같은 문장을 가진 장학금 전부 */
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

export function unlockHint(items: readonly Item[], variant: HintVariant): UnlockHint | null {
  const candidates = unlockCandidates(items)
  const [first] = candidates
  if (!first) return null
  const condition = first.open_conditions[0]

  if (variant === 1) {
    // 안 1: 후보 수를 알리고, 마감이 가장 가까운 것부터 하나씩 묻습니다.
    return {
      variant,
      message: `조건 1개만 확인하면 장학금 ${candidates.length}개가 정리돼요`,
      condition,
      targets: [first],
    }
  }
  if (variant === 2) {
    // 안 2: 마감이 가장 가까운 장학금 하나를 이름으로 짚습니다.
    return {
      variant,
      message: `‘${first.name}’은 조건 하나만 확인하면 돼요`,
      condition,
      targets: [first],
    }
  }
  // 안 3: 같은 문장을 가진 후보를 묶어, 한 번 답하면 가장 많이 정해지는 문장을 묻습니다.
  // 수가 같으면 마감이 가까운 장학금이 있는 문장(후보 순서상 먼저 나온 것)을 고릅니다.
  const groups = new Map<string, Item[]>()
  for (const item of candidates) {
    const key = item.open_conditions[0].key
    groups.set(key, [...(groups.get(key) ?? []), item])
  }
  let best: Item[] = []
  for (const group of groups.values()) if (group.length > best.length) best = group
  return {
    variant,
    message:
      best.length > 1
        ? `이 조건 하나로 장학금 ${best.length}개가 정리돼요`
        : `‘${best[0].name}’은 조건 하나만 확인하면 돼요`,
    condition: best[0].open_conditions[0],
    targets: best,
  }
}

/** 주소 ?hint=1|2|3 으로 안을 바꿔 비교합니다. 없거나 잘못된 값이면 안 1. */
export function hintVariantOf(value: string | null): HintVariant {
  const n = Number(value)
  return (HINT_VARIANTS as readonly number[]).includes(n) ? (n as HintVariant) : 1
}
