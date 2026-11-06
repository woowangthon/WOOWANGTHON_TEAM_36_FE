import { Link } from 'react-router'

import type { ScholarshipSummary } from '@/api/hooks/scholarships'

import { deadlineOf, RESULT_LABEL, STATE_LABEL } from './format'

const RESULT_STYLE = {
  ELIGIBLE: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  CONDITIONAL: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  INELIGIBLE: 'bg-muted text-muted-foreground ring-border',
} as const

export function ResultBadge({ result }: { result: ScholarshipSummary['result'] }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${RESULT_STYLE[result]}`}
    >
      {RESULT_LABEL[result]}
    </span>
  )
}

const DEADLINE_STYLE = {
  urgent: 'text-destructive font-semibold',
  normal: 'text-foreground font-semibold',
  muted: 'text-muted-foreground',
} as const

export function DeadlineText({ item }: { item: Pick<ScholarshipSummary, 'status' | 'apply_end'> }) {
  const deadline = deadlineOf(item)
  return <span className={`text-sm ${DEADLINE_STYLE[deadline.tone]}`}>{deadline.label}</span>
}

export function DeadlineConflictNote() {
  return (
    <span className="rounded bg-amber-50 px-1.5 py-0.5 text-xs text-amber-800">
      마감일 확인 필요
    </span>
  )
}

/** 대시보드·내 장학금 카드 1장 (장학금 단위, 7.1). */
export function ScholarshipCard({ item }: { item: ScholarshipSummary }) {
  return (
    <li>
      <Link
        to={`/scholarships/${item.id}`}
        className="block rounded-xl border bg-background p-4 transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 font-medium break-keep">{item.name}</h3>
          <ResultBadge result={item.result} />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {item.source_name} · {item.is_internal ? '교내' : '교외'}
          {item.benefit_type && ` · ${item.benefit_type}`}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
          <DeadlineText item={item} />
          {item.deadline_conflict && <DeadlineConflictNote />}
          {item.benefit_amount_text && (
            <span className="text-sm text-muted-foreground">{item.benefit_amount_text}</span>
          )}
          {item.my_state && (
            <span className="ml-auto text-xs font-medium text-primary">
              {STATE_LABEL[item.my_state]}
            </span>
          )}
        </div>
      </Link>
    </li>
  )
}

export function ListSkeleton() {
  return (
    <ul className="grid gap-3" aria-busy="true" aria-label="불러오는 중">
      {[0, 1, 2].map((i) => (
        <li key={i} className="h-28 animate-pulse rounded-xl border bg-muted/60" />
      ))}
    </ul>
  )
}

export function ScholarshipList({
  items,
  empty,
}: {
  items: ScholarshipSummary[]
  empty: React.ReactNode
}) {
  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        {empty}
      </p>
    )
  }
  return (
    <ul className="grid gap-3">
      {items.map((item) => (
        <ScholarshipCard key={item.id} item={item} />
      ))}
    </ul>
  )
}
