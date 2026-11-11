import {
  Building2,
  CalendarClock,
  CircleCheck,
  CircleHelp,
  CircleX,
  School,
  Wallet,
} from 'lucide-react'
import { Link } from 'react-router'

import type { ScholarshipSummary } from '@/api/hooks/scholarships'

import { deadlineOf, RESULT_LABEL, STATE_LABEL } from './format'

const RESULT_STYLE = {
  ELIGIBLE: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  CONDITIONAL: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  INELIGIBLE: 'bg-muted text-muted-foreground ring-border',
} as const

const RESULT_ICON = {
  ELIGIBLE: CircleCheck,
  CONDITIONAL: CircleHelp,
  INELIGIBLE: CircleX,
} as const

export function ResultBadge({ result }: { result: ScholarshipSummary['result'] }) {
  const Icon = RESULT_ICON[result]
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${RESULT_STYLE[result]}`}
    >
      <Icon aria-hidden="true" className="size-3.5" />
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

/** 출처 · 교내/교외 · 지원 형태 한 줄. 교내는 학교, 교외는 건물 아이콘 (T38). */
export function SourceLine({
  item,
  className = '',
}: {
  item: Pick<ScholarshipSummary, 'source_name' | 'is_internal' | 'benefit_type'>
  className?: string
}) {
  const Icon = item.is_internal ? School : Building2
  return (
    <p className={`flex items-center gap-1 text-muted-foreground ${className}`}>
      <Icon aria-hidden="true" className="size-3.5 shrink-0" />
      <span>
        {item.source_name} · {item.is_internal ? '교내' : '교외'}
        {item.benefit_type && ` · ${item.benefit_type}`}
      </span>
    </p>
  )
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
        className="block rounded-xl border border-brand-200 bg-background p-4 transition hover:-translate-y-0.5 hover:border-brand-400 hover:shadow-md motion-reduce:transform-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 font-medium break-keep">{item.name}</h3>
          <ResultBadge result={item.result} />
        </div>
        <SourceLine item={item} className="mt-1 text-xs" />
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="inline-flex items-center gap-1">
            <CalendarClock aria-hidden="true" className="size-4 text-muted-foreground" />
            <DeadlineText item={item} />
          </span>
          {item.deadline_conflict && <DeadlineConflictNote />}
          {item.benefit_amount_text && (
            <span className="inline-flex items-center gap-1 text-sm font-medium text-brand-700">
              <Wallet aria-hidden="true" className="size-4" />
              {item.benefit_amount_text}
            </span>
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
