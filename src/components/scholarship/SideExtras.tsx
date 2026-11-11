import { AlarmClock, Lightbulb } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { Link } from 'react-router'

import type { ScholarshipSummary } from '@/api/hooks/scholarships'

import { deadlineOf } from './format'
import { ResultBadge } from './ScholarshipCard'

const WIDE = '(min-width: 1024px)'

/**
 * 넓은 화면인지. 사이드바는 넓은 화면에서만 보이므로, 좁은 화면에서는 아예 그리지 않을 때 씁니다.
 * matchMedia가 없는 환경(테스트)에서는 false입니다.
 */
function useIsWide() {
  const [wide, setWide] = useState(
    () => typeof window.matchMedia === 'function' && window.matchMedia(WIDE).matches,
  )
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const media = window.matchMedia(WIDE)
    const onChange = () => setWide(media.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])
  return wide
}

const BOX = 'grid gap-2 rounded-xl border border-brand-200 bg-background p-3 sm:p-4'

/**
 * 곧 마감되는 장학금 3개 (T57). 이미 받은 목록에서 뽑아 API를 더 부르지 않습니다(계획서 9.8).
 * 같은 장학금 이름이 목록과 겹쳐 보이므로 넓은 화면에서만 그립니다.
 */
export function DeadlineSoon({ items }: { items: ScholarshipSummary[] | undefined }) {
  const id = useId()
  const wide = useIsWide()
  if (!wide || !items) return null

  // 지난 마감은 deadlineOf가 '마감'으로 돌려주므로 거릅니다 (렌더 중 Date.now()를 직접 부르지 않음).
  const soon = items
    .filter((item) => item.status === 'OPEN' && item.apply_end)
    .filter((item) => deadlineOf(item).label !== '마감')
    .sort((a, b) => new Date(a.apply_end!).getTime() - new Date(b.apply_end!).getTime())
    .slice(0, 3)

  return (
    <section aria-labelledby={id} className={BOX}>
      <h2 id={id} className="flex items-center gap-1.5 text-sm font-semibold text-brand-900">
        <AlarmClock aria-hidden="true" className="size-4 text-brand-700" />곧 마감되는 장학금
      </h2>
      {soon.length === 0 ? (
        <p className="text-xs text-muted-foreground">지금 목록에는 가까운 마감이 없어요.</p>
      ) : (
        <ul className="grid gap-1.5 text-sm">
          {soon.map((item) => {
            const deadline = deadlineOf(item)
            return (
              <li key={item.id}>
                <Link
                  to={`/scholarships/${item.id}`}
                  className="flex items-center justify-between gap-2 rounded-md hover:text-brand-800"
                >
                  <span className="min-w-0 truncate">{item.name}</span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${deadline.tone === 'urgent' ? 'bg-red-50 text-destructive' : 'bg-brand-50 text-brand-800'}`}
                  >
                    {deadline.label}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">지금 고른 탭·필터 목록 기준이에요.</p>
    </section>
  )
}

const GUIDE = [
  { result: 'ELIGIBLE', text: '공지 조건을 내 프로필이 모두 충족해요.' },
  {
    result: 'CONDITIONAL',
    text: '정보가 없거나, 공지가 모호하거나, 첨부를 읽지 못해 직접 확인이 필요해요.',
  },
  { result: 'INELIGIBLE', text: '충족하지 못한 조건이 있어요.' },
] as const

/** 판정 결과 뜻 안내 (T57). 처음 쓰는 사람이 뱃지를 바로 이해하도록 돕습니다. */
export function ResultGuide() {
  const id = useId()
  return (
    <section aria-labelledby={id} className={BOX}>
      <h2 id={id} className="flex items-center gap-1.5 text-sm font-semibold text-brand-900">
        <Lightbulb aria-hidden="true" className="size-4 text-brand-700" />
        판정 결과 읽는 법
      </h2>
      <dl className="grid gap-2 text-xs">
        {GUIDE.map(({ result, text }) => (
          <div key={result} className="grid gap-1">
            <dt>
              <ResultBadge result={result} />
            </dt>
            <dd className="text-muted-foreground">{text}</dd>
          </div>
        ))}
      </dl>
      <p className="border-t border-brand-100 pt-2 text-xs text-muted-foreground">
        프로필을 자세히 채울수록 &lsquo;확인 필요&rsquo;가 줄어요.{' '}
        <Link to="/profile" className="font-medium text-brand-800 underline underline-offset-4">
          프로필 수정
        </Link>
      </p>
    </section>
  )
}
