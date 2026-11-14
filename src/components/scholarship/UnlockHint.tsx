import { useQueryClient } from '@tanstack/react-query'
import { Award } from 'lucide-react'
import { useState } from 'react'

import { meKey, useMe, type Me } from '@/api/hooks/auth'
import {
  useSetConditionAnswer,
  type ConditionAnswer,
  type ScholarshipSummary,
} from '@/api/hooks/scholarships'
import { FormError } from '@/components/form/Field'
import { quickQuestions, targetLabel, type QuickQuestion } from '@/lib/unlockHint'

// 저장에 성공했거나 건너뛴 질문은 같은 계정과 브라우저 탭에서 다시 묻지 않습니다.
// 화면 편의용이라 저장소를 쓸 수 없으면(사생활 보호 모드 등) 화면 안에서만 기억합니다.
function loadDone(storageKey: string): Set<string> {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(storageKey) ?? '[]') as string[])
  } catch {
    return new Set()
  }
}

function saveDone(storageKey: string, done: Set<string>) {
  try {
    sessionStorage.setItem(storageKey, JSON.stringify([...done]))
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
  const { data: me } = useMe()
  return me ? <QuickCheck key={me.id} userId={me.id} items={items} /> : null
}

type AnswerAttempt = { question: QuickQuestion; status: 'saving' | 'failed' }

function QuickCheck({ userId, items }: { userId: number; items: ScholarshipSummary[] }) {
  const storageKey = `quick-check-done:${userId}`
  const queryClient = useQueryClient()
  const { mutateAsync } = useSetConditionAnswer()
  const [done, setDone] = useState(() => loadDone(storageKey))
  const [finished, setFinished] = useState(false)
  const [attempt, setAttempt] = useState<AnswerAttempt | null>(null)
  const questions = quickQuestions(items, done)
  const question = attempt?.question ?? questions[0]

  if (!question) {
    if (!finished) return null
    return (
      <section aria-label="빠른 확인" className={CARD}>
        <p className="font-medium text-brand-900">빠르게 확인할 질문을 다 끝냈어요.</p>
      </section>
    )
  }

  const saving = attempt?.status === 'saving'
  const remaining = questions.some(({ condition }) => condition.key === question.condition.key)
    ? questions.length
    : questions.length + 1

  const next = async (answer: ConditionAnswer | null) => {
    if (saving) return
    if (answer !== null) {
      // 목록이 낙관적으로 바뀌어도 저장이 끝날 때까지 같은 질문을 보여 줍니다.
      setAttempt({ question, status: 'saving' })
      try {
        // 장학금마다 순서대로 저장해 실패한 요청의 캐시 복구가 다른 요청과 겹치지 않게 합니다.
        for (const target of question.targets) {
          if (queryClient.getQueryData<Me | null>(meKey)?.id !== userId) {
            setAttempt(null)
            return
          }
          await mutateAsync({ id: target.id, key: question.condition.key, answer })
        }
      } catch {
        setAttempt({ question, status: 'failed' })
        return
      }
    }
    const updated = new Set([...loadDone(storageKey), ...done, question.condition.key])
    saveDone(storageKey, updated)
    setDone(updated)
    setFinished(true)
    setAttempt(null)
  }

  return (
    <section aria-label="빠른 확인" className={CARD}>
      <p className="flex items-center justify-between text-xs text-muted-foreground">
        빠른 확인
        <span aria-label={`${remaining}개 남음`} className="tabular-nums">
          {done.size + 1}/{done.size + remaining}
        </span>
      </p>
      {/* 답하면 판정이 정해지는 장학금을 질문 바로 위에 크게 보여 줍니다 */}
      <p className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-lg bg-brand-100 px-2.5 py-1 text-sm font-semibold text-brand-800">
        <Award aria-hidden="true" className="size-4 shrink-0" />
        <span className="break-keep">{targetLabel(question)}</span>
      </p>
      <p className="mt-2 text-xs text-muted-foreground">이 조건에 맞나요?</p>
      <p className="mt-0.5 text-lg font-semibold text-brand-900 break-keep sm:text-xl">
        {question.condition.summary ?? question.condition.text}
      </p>
      {question.condition.summary && (
        // 요약이 틀렸을 때 대조할 수 있게 공지 원문을 2줄까지 함께 보여 줍니다(T44)
        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground break-keep">
          {question.condition.text}
        </p>
      )}
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => void next('YES')}
          disabled={saving}
          className={`${ANSWER} border-emerald-300 hover:bg-emerald-50`}
        >
          맞아요
          <span aria-hidden="true" className="block text-xs font-normal text-emerald-700">
            → 지원 가능으로 바뀌어요
          </span>
        </button>
        <button
          type="button"
          onClick={() => void next('NO')}
          disabled={saving}
          className={`${ANSWER} border-brand-200 hover:bg-brand-100`}
        >
          안 맞아요
          <span aria-hidden="true" className="block text-xs font-normal text-muted-foreground">
            → 지원 불가로 정리돼요
          </span>
        </button>
      </div>
      <button
        type="button"
        onClick={() => void next(null)}
        disabled={saving}
        className="mt-1 h-8 px-0 text-sm text-muted-foreground underline underline-offset-4"
      >
        모르겠어요
      </button>
      <FormError
        message={
          attempt?.status === 'failed' ? '저장하지 못했습니다. 잠시 후 다시 시도하세요.' : null
        }
      />
    </section>
  )
}

const CARD = 'rounded-xl border border-brand-200 bg-brand-50 p-3 text-sm sm:p-4'
// 답 버튼에는 누르면 판정이 어떻게 바뀌는지를 함께 적습니다
const ANSWER =
  'rounded-lg border bg-white px-4 py-2.5 text-left text-sm font-medium text-brand-900 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none'
