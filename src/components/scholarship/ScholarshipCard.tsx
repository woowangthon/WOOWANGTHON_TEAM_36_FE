import {
  Building2,
  CalendarClock,
  CircleCheck,
  CircleHelp,
  CircleX,
  Heart,
  School,
  Wallet,
  X,
} from 'lucide-react'
import { Link } from 'react-router'

import { useSetScholarshipState, type ScholarshipSummary } from '@/api/hooks/scholarships'
import { FormError } from '@/components/form/Field'

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
      {/* 단어 중간에서 줄이 바뀌지 않게 ('생활비 / 성' 방지, T67) */}
      <span className="min-w-0 break-keep">
        {item.source_name} · {item.is_internal ? '교내' : '교외'}
        {item.benefit_type && ` · ${item.benefit_type}`}
      </span>
    </p>
  )
}

/** 같은 장학금이 다른 게시판에도 올라와 목록에서 하나로 묶였을 때 (7.1, T46). */
export function AlsoPostedNote({ sources }: { sources: string[] }) {
  if (sources.length === 0) return null
  return <p className="text-xs text-muted-foreground break-keep">{sources.join('·')}에도 게시됨</p>
}

export function DeadlineConflictNote() {
  return (
    <span className="rounded bg-amber-50 px-1.5 py-0.5 text-xs text-amber-800">
      마감일 확인 필요
    </span>
  )
}

type ScholarshipItemProps = {
  item: ScholarshipSummary
  onBookmarkError: (message: string | null) => void
}

/**
 * 대시보드·내 정보 카드 1장 (장학금 단위, 7.1). 넓은 화면에서는 한 줄에 2장씩 놓습니다.
 * 카드 전체를 누르면 상세로 가고(제목 링크를 카드 크기로 넓힘), 하트는 따로 눌러 관심을 켜고 끕니다.
 */
function ScholarshipCard({ item, onBookmarkError }: ScholarshipItemProps) {
  return (
    <li className="relative isolate flex flex-col rounded-xl border border-brand-200 bg-background p-3 transition focus-within:ring-3 focus-within:ring-ring/50 hover:-translate-y-0.5 hover:border-brand-400 hover:shadow-md motion-reduce:transform-none sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="grid min-w-0 gap-1">
          <h3 className="font-medium break-keep">
            <Link
              to={`/scholarships/${item.id}`}
              className="after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none"
            >
              {item.display_name}
            </Link>
          </h3>
          <SourceLine item={item} className="text-xs" />
          <AlsoPostedNote sources={item.also_posted_in} />
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <ResultBadge result={item.result} />
          <BookmarkHeart item={item} onBookmarkError={onBookmarkError} />
        </div>
      </div>
      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-3">
        <span className="inline-flex items-start gap-1">
          <CalendarClock
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
          />
          <DeadlineText item={item} />
        </span>
        {item.deadline_conflict && <DeadlineConflictNote />}
        {item.benefit_amount_text && (
          <span className="inline-flex items-start gap-1 text-sm font-medium text-brand-700">
            {/* 글이 길어 여러 줄이 되어도 아이콘이 줄어들지 않고 첫 줄 옆에 붙게 (T68) */}
            <Wallet aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {item.benefit_amount_text}
          </span>
        )}
        {item.my_state === 'APPLIED' && (
          <span className="ml-auto text-xs font-medium text-primary">{STATE_LABEL.APPLIED}</span>
        )}
      </div>
    </li>
  )
}

/**
 * 관심 하트 (T54). 누르면 바로 채워지고(optimistic update) 실패하면 되돌아갑니다.
 * 신청완료한 장학금은 관심과 함께 둘 수 없어 하트를 숨기고 '신청완료'만 보여 줍니다.
 */
function BookmarkHeart({ item, onBookmarkError }: ScholarshipItemProps) {
  const mutation = useSetScholarshipState(item.id)
  if (item.my_state === 'APPLIED') return null
  const on = item.my_state === 'BOOKMARKED'
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? '관심 해제' : '관심'}
      title={on ? '관심 해제' : '관심'}
      disabled={mutation.isPending}
      onClick={() => {
        onBookmarkError(null)
        void mutation.mutateAsync({ id: item.id, state: on ? null : 'BOOKMARKED' }).catch(() => {
          const action = on ? '관심을 해제하지 못했어요.' : '관심 장학금에 추가하지 못했어요.'
          onBookmarkError(`${action} 다시 시도해 주세요.`)
        })
      }}
      className="relative z-10 -mr-1 grid size-8 place-items-center rounded-full text-rose-500 transition-colors hover:bg-rose-50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <Heart aria-hidden="true" className={`size-5 ${on ? 'fill-current' : ''}`} />
    </button>
  )
}

/**
 * 바 형태 한 줄 (T58, 내 정보). 이미 고른 장학금을 마감 순으로 훑기 좋게 한 줄에 하나씩 둡니다.
 * 카드와 같은 정보·하트를 쓰고, 줄 전체를 누르면 상세로 갑니다.
 */
function ScholarshipRow({ item, onBookmarkError }: ScholarshipItemProps) {
  return (
    <li className="relative isolate flex items-start gap-3 rounded-lg px-2 py-3 transition-colors focus-within:ring-3 focus-within:ring-ring/50 hover:bg-brand-50">
      <div className="grid min-w-0 flex-1 gap-1">
        <h3 className="font-medium break-keep">
          <Link
            to={`/scholarships/${item.id}`}
            className="after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none"
          >
            {item.display_name}
          </Link>
        </h3>
        <SourceLine item={item} className="text-xs" />
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="inline-flex items-start gap-1">
            <CalendarClock
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-muted-foreground"
            />
            <DeadlineText item={item} />
          </span>
          {item.deadline_conflict && <DeadlineConflictNote />}
          {item.benefit_amount_text && (
            <span className="inline-flex items-start gap-1 text-sm font-medium text-brand-700">
              {/* 글이 길어 여러 줄이 되어도 아이콘이 줄어들지 않고 첫 줄 옆에 붙게 (T68) */}
              <Wallet aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              {item.benefit_amount_text}
            </span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <ResultBadge result={item.result} />
        {item.my_state === 'APPLIED' ? (
          <span className="text-xs font-medium text-primary">{STATE_LABEL.APPLIED}</span>
        ) : (
          <BookmarkHeart item={item} onBookmarkError={onBookmarkError} />
        )}
      </div>
    </li>
  )
}

export function ListSkeleton({ variant = 'card' }: { variant?: 'card' | 'row' }) {
  return (
    <ul
      className={`grid gap-3 ${variant === 'card' ? 'sm:grid-cols-2' : ''}`}
      aria-busy="true"
      aria-label="불러오는 중"
    >
      {[0, 1, 2, 3].map((i) => (
        <li key={i} className="h-28 animate-pulse rounded-xl border border-brand-200 bg-muted/60" />
      ))}
    </ul>
  )
}

export function ScholarshipList({
  items,
  empty,
  onBookmarkError,
  variant = 'card',
}: {
  items: ScholarshipSummary[]
  empty: React.ReactNode
  onBookmarkError: ScholarshipItemProps['onBookmarkError']
  /** card: 대시보드 2열 카드, row: 내 정보 바 형태 */
  variant?: 'card' | 'row'
}) {
  const Item = variant === 'row' ? ScholarshipRow : ScholarshipCard
  const listClass =
    variant === 'row' ? 'grid divide-y divide-brand-100' : 'grid gap-3 sm:grid-cols-2'

  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-brand-200 p-8 text-center text-sm text-muted-foreground">
        {empty}
      </p>
    )
  }

  return (
    <ul className={listClass}>
      {items.map((item) => (
        <Item key={item.id} item={item} onBookmarkError={onBookmarkError} />
      ))}
    </ul>
  )
}

export function BookmarkError({
  message,
  onDismiss,
}: {
  message: string | null
  onDismiss: () => void
}) {
  if (!message) return null

  return (
    <div className="fixed inset-x-4 bottom-4 z-20 mx-auto flex max-w-md items-center gap-2 rounded-xl border border-brand-200 bg-background p-2 shadow-lg">
      <div className="min-w-0 flex-1">
        <FormError message={message} />
      </div>
      <button
        type="button"
        aria-label="관심 오류 닫기"
        className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
        onClick={onDismiss}
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </div>
  )
}
