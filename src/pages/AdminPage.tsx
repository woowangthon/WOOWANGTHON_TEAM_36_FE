import { ExternalLink } from 'lucide-react'
import { Navigate } from 'react-router'

import { useAdminOverview, useReextract, type AdminNotice, type CrawlRun } from '@/api/hooks/admin'
import { useMe } from '@/api/hooks/auth'
import { FormError } from '@/components/form/Field'
import { ErrorBox } from '@/components/layout/AppLayout'
import { formatDate, formatDateTime } from '@/components/scholarship/format'
import { Button } from '@/components/ui/button'

const SOURCES = [
  { code: 'SW_DEPT', name: '소프트웨어학부' },
  { code: 'AIBC', name: 'AI부트캠프사업단' },
  { code: 'KOSAF', name: '한국장학재단' },
] as const
const SOURCE_NAME = Object.fromEntries(SOURCES.map((s) => [s.code, s.name])) as Record<
  CrawlRun['source_code'],
  string
>

const RUN_STATUS = {
  RUNNING: { label: '수집 중', style: 'bg-sky-50 text-sky-700' },
  DONE: { label: '성공', style: 'bg-emerald-50 text-emerald-700' },
  FAILED: { label: '실패', style: 'bg-red-50 text-red-700' },
} as const

const EXTRACT_STATUS = {
  PENDING: { label: '재추출 대기', style: 'bg-amber-50 text-amber-800' },
  DONE: { label: '추출 완료', style: 'bg-muted text-muted-foreground' },
  FAILED: { label: '추출 실패', style: 'bg-red-50 text-red-700' },
} as const

// 관리자 (7.1): 사이트별 마지막 수집 시각·결과·오류, 추출 실패·대기 공지, 공지 재추출 버튼.
// 관리자가 아니면 화면을 숨기고 대시보드로 보냅니다(API도 403, 7.3).
export default function AdminPage() {
  const me = useMe().data
  if (!me?.is_admin) return <Navigate to="/dashboard" replace />
  return <AdminOverview />
}

function AdminOverview() {
  const overview = useAdminOverview()
  if (overview.isPending) return <AdminSkeleton />
  if (overview.isError) {
    return <ErrorBox message={overview.error.message} onRetry={() => overview.refetch()} />
  }
  const { items, notices } = overview.data
  const attention = notices.filter((n) => n.extract_status !== 'DONE')
  const recent = notices.filter((n) => n.extract_status === 'DONE')

  return (
    <div className="grid gap-6">
      <h1 className="text-xl font-semibold">관리자</h1>

      <section className="grid gap-3" aria-labelledby="runs-heading">
        <h2 id="runs-heading" className="font-semibold">
          사이트별 마지막 수집
        </h2>
        <ul className="grid gap-3 sm:grid-cols-3">
          {SOURCES.map((source) => (
            <LastRun
              key={source.code}
              name={source.name}
              run={items.find((run) => run.source_code === source.code)}
            />
          ))}
        </ul>
      </section>

      <NoticeSection
        id="attention"
        title="추출 실패·대기 공지"
        notices={attention}
        empty="추출 실패나 대기 중인 공지가 없습니다."
      />
      <NoticeSection
        id="recent"
        title="최근 공지"
        description="추출 결과가 이상하면 재추출을 요청하세요. 다음 정기 수집 때 다시 추출합니다."
        notices={recent}
        empty="수집한 공지가 없습니다."
      />
    </div>
  )
}

function LastRun({ name, run }: { name: string; run?: CrawlRun }) {
  return (
    <li className="rounded-xl border bg-background p-4 text-sm">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-medium">{name}</h3>
        {run && (
          <span className={`rounded-md px-2 py-0.5 text-xs ${RUN_STATUS[run.status].style}`}>
            {RUN_STATUS[run.status].label}
          </span>
        )}
      </div>
      {run ? (
        <>
          <p className="mt-2 text-muted-foreground">{formatDateTime(run.started_at)}</p>
          <p className="text-muted-foreground">새 공지 {run.new_count}건</p>
          {run.error && (
            <p className="mt-2 rounded bg-red-50 px-2 py-1 text-xs break-all text-red-700">
              {run.error}
            </p>
          )}
        </>
      ) : (
        <p className="mt-2 text-muted-foreground">수집 기록 없음</p>
      )}
    </li>
  )
}

function NoticeSection({
  id,
  title,
  description,
  notices,
  empty,
}: {
  id: string
  title: string
  description?: string
  notices: AdminNotice[]
  empty: string
}) {
  return (
    <section className="grid gap-3" aria-labelledby={`${id}-heading`}>
      <div>
        <h2 id={`${id}-heading`} className="font-semibold">
          {title} <span className="font-normal text-muted-foreground">{notices.length}</span>
        </h2>
        {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
      </div>
      {notices.length === 0 ? (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          {empty}
        </p>
      ) : (
        <ul className="grid gap-2" aria-label={title}>
          {notices.map((notice) => (
            <NoticeRow key={notice.id} notice={notice} />
          ))}
        </ul>
      )}
    </section>
  )
}

function NoticeRow({ notice }: { notice: AdminNotice }) {
  const reextract = useReextract()
  const pending = notice.extract_status === 'PENDING'
  const status = EXTRACT_STATUS[notice.extract_status]
  return (
    <li className="grid gap-2 rounded-xl border bg-background p-4 text-sm sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="min-w-0">
        <a
          href={notice.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-start gap-1 font-medium break-words hover:underline"
        >
          {notice.title}
          <ExternalLink aria-hidden className="mt-0.5 size-3.5 shrink-0" />
        </a>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span className={`rounded px-1.5 py-0.5 ${status.style}`}>{status.label}</span>
          <span>{SOURCE_NAME[notice.source_code]}</span>
          <span>게시 {formatDate(notice.posted_at)}</span>
          {notice.notice_kind && <span>{notice.notice_kind}</span>}
          <span>장학금 {notice.scholarship_count}개</span>
        </p>
        {pending && <p className="mt-1 text-xs text-amber-800">다음 수집 때 처리됩니다.</p>}
        <FormError message={reextract.isError ? reextract.error.message : null} />
      </div>
      <Button
        variant="outline"
        size="sm"
        disabled={pending || reextract.isPending}
        onClick={() => reextract.mutate(notice.id)}
      >
        {pending ? '재추출 대기' : reextract.isPending ? '요청 중…' : '재추출'}
      </Button>
    </li>
  )
}

function AdminSkeleton() {
  return (
    <div className="grid gap-4" aria-busy="true" aria-label="불러오는 중">
      <div className="h-6 w-24 animate-pulse rounded bg-muted" />
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-muted/60" />
        ))}
      </div>
      <div className="h-40 animate-pulse rounded-xl bg-muted/60" />
    </div>
  )
}
