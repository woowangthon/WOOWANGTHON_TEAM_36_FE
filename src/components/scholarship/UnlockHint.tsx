import { useState } from 'react'

import {
  useSetConditionAnswer,
  type ConditionAnswer,
  type ScholarshipSummary,
} from '@/api/hooks/scholarships'
import { FormError } from '@/components/form/Field'
import { questionNote, quickQuestions } from '@/lib/unlockHint'

// 이미 답했거나 건너뛴 질문(key)은 이 브라우저 탭을 닫기 전까지 다시 묻지 않습니다.
// 화면 편의용이라 저장소를 쓸 수 없으면(사생활 보호 모드 등) 화면 안에서만 기억합니다.
const STORAGE_KEY = 'quick-check-done'

function loadDone(): Set<string> {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '[]') as string[])
  } catch {
    return new Set()
  }
}

function saveDone(done: Set<string>) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...done]))
  } catch {
    // 저장하지 못해도 화면 안에서는 기억합니다.
  }
}

/**
 * 대시보드 "빠른 확인" 카드 (계획서 7.1). 조건 하나만 답하면 판정이 정해지는 장학금을 질문으로 묶어
 * 하나씩 묻습니다. [맞아요]·[안 맞아요]는 상세의 아이콘과 같은 API로 답하고, [모르겠어요]는 판정을
 * 바꾸지 않고 다음 질문으로 넘어갑니다. 이미 받은 목록으로 계산해 API를 더 부르지 않습니다(9.8).
 */
export function UnlockHint({ items }: { items: ScholarshipSummary[] }) {
  const mutation = useSetConditionAnswer()
  const [done, setDone] = useState(loadDone)
  const [finished, setFinished] = useState(false)
  const questions = quickQuestions(items, done)
  const [question] = questions

  if (!question) {
    if (!finished) return null
    return (
      <section aria-label="빠른 확인" className={CARD}>
        <p className="font-medium text-brand-900">빠르게 확인할 질문을 다 끝냈어요.</p>
      </section>
    )
  }

  const next = (answer: ConditionAnswer | null) => {
    if (answer) {
      for (const target of question.targets) {
        mutation.mutate({ id: target.id, key: question.condition.key, answer })
      }
    }
    const updated = new Set(done).add(question.condition.key)
    saveDone(updated)
    setDone(updated)
    setFinished(true)
  }

  return (
    <section aria-label="빠른 확인" className={CARD}>
      <p className="flex items-center justify-between text-xs font-semibold text-brand-700">
        빠른 확인
        <span aria-label={`${questions.length}개 남음`} className="font-normal tabular-nums">
          {done.size + 1}/{done.size + questions.length}
        </span>
      </p>
      <p className="mt-2 text-xs text-muted-foreground">이 조건에 맞나요?</p>
      <p className="mt-0.5 text-base font-semibold text-brand-900 break-keep">
        {question.condition.text}
      </p>
      <p className="mt-1.5 text-xs text-muted-foreground break-keep">{questionNote(question)}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => next('YES')} className={BUTTON}>
          맞아요
        </button>
        <button type="button" onClick={() => next('NO')} className={BUTTON}>
          안 맞아요
        </button>
        <button
          type="button"
          onClick={() => next(null)}
          className="h-9 px-2 text-sm text-muted-foreground underline underline-offset-4"
        >
          모르겠어요
        </button>
      </div>
      <FormError
        message={mutation.isError ? '저장하지 못했습니다. 잠시 후 다시 시도하세요.' : null}
      />
    </section>
  )
}

const CARD = 'rounded-xl border border-brand-200 bg-brand-50 p-3 text-sm sm:p-4'
const BUTTON =
  'h-9 rounded-lg border border-brand-200 bg-white px-4 text-sm font-medium text-brand-900 hover:bg-brand-100 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none'
