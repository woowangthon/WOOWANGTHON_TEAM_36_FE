import { Lightbulb } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'

import { useSetConditionAnswer, type ScholarshipSummary } from '@/api/hooks/scholarships'
import { FormError } from '@/components/form/Field'
import { hintVariantOf, unlockHint } from '@/lib/unlockHint'

/**
 * "이것만 확인하면 N개가 풀려요" 한 줄 (계획서 7.1). 이미 받은 목록으로 계산해 API를 더 부르지 않습니다(9.8).
 * [해당돼요]·[아니에요]를 누르면 상세의 아이콘과 같은 API로 답하고 판정이 바로 바뀝니다.
 * 비교용으로 주소 ?hint=1|2|3 에 따라 안을 바꿉니다(기본 안 1).
 */
export function UnlockHint({ items }: { items: ScholarshipSummary[] }) {
  const [search] = useSearchParams()
  const mutation = useSetConditionAnswer()
  const hint = unlockHint(items, hintVariantOf(search.get('hint')))
  if (!hint) return null

  const answer = (value: 'YES' | 'NO') => {
    for (const target of hint.targets) {
      mutation.mutate({ id: target.id, key: hint.condition.key, answer: value })
    }
  }
  const [only] = hint.targets

  return (
    <section
      aria-label="이것만 확인하면 정리돼요"
      className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm"
    >
      <p className="flex items-start gap-1.5 font-semibold text-amber-900 break-keep">
        <Lightbulb aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        {hint.message}
      </p>
      <p className="mt-1.5 text-amber-900/90 break-keep">{hint.condition.text}</p>
      {hint.targets.length === 1 ? (
        <p className="mt-1 text-xs text-amber-900/70 break-keep">
          <Link to={`/scholarships/${only.id}`} className="underline underline-offset-4">
            {only.name}
          </Link>
        </p>
      ) : (
        <p className="mt-1 text-xs text-amber-900/70 break-keep">
          {hint.targets.map((target) => target.name).join(', ')}
        </p>
      )}
      <div className="mt-2.5 flex gap-2">
        <button
          type="button"
          onClick={() => answer('YES')}
          className="h-9 rounded-lg border border-emerald-300 bg-white px-3 font-medium text-emerald-700 hover:bg-emerald-50"
        >
          해당돼요
        </button>
        <button
          type="button"
          onClick={() => answer('NO')}
          className="h-9 rounded-lg border border-red-200 bg-white px-3 font-medium text-red-700 hover:bg-red-50"
        >
          아니에요
        </button>
      </div>
      <FormError
        message={mutation.isError ? '저장하지 못했습니다. 잠시 후 다시 시도하세요.' : null}
      />
    </section>
  )
}
