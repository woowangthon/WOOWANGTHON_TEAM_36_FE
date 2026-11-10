import { ExternalLink } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router'

import { ApiError } from '@/api/hooks/request'
import {
  useScholarship,
  useSetScholarshipState,
  type ConditionCheck,
  type ScholarshipDetail,
  type UnreadAttachment,
  type UserState,
} from '@/api/hooks/scholarships'
import { FormError } from '@/components/form/Field'
import { ErrorBox } from '@/components/layout/AppLayout'
import {
  CONDITION_LABEL,
  evidenceSourceLabel,
  formatDateTime,
  formatDate,
  OUTCOME,
  UNREAD_REASON,
} from '@/components/scholarship/format'
import {
  DeadlineConflictNote,
  DeadlineText,
  ResultBadge,
} from '@/components/scholarship/ScholarshipCard'
import { Button } from '@/components/ui/button'

// 상세 (7.1): 조건별 체크리스트(✓ ✗ ?), 원문 근거, 제출 서류, 원문 링크, 같은 공지의 다른 장학금,
// 관심·신청완료 버튼, 중복 안내 문구.
export default function DetailPage() {
  const id = Number(useParams().id)
  const detail = useScholarship(id)

  if (!Number.isInteger(id) || id <= 0) return <NotFound />
  if (detail.isPending) return <DetailSkeleton />
  if (detail.isError) {
    if (detail.error instanceof ApiError && detail.error.status === 404) return <NotFound />
    return <ErrorBox message={detail.error.message} onRetry={() => detail.refetch()} />
  }
  return <Detail item={detail.data} />
}

function Detail({ item }: { item: ScholarshipDetail }) {
  return (
    <article className="grid gap-4">
      <BackLink />
      <section className="rounded-xl border bg-background p-5">
        <div className="flex items-start justify-between gap-3">
          <h1 className="min-w-0 text-xl font-semibold break-keep">{item.name}</h1>
          <ResultBadge result={item.result} />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {item.source_name} · {item.is_internal ? '교내' : '교외'}
          {item.benefit_type && ` · ${item.benefit_type}`}
        </p>
        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted-foreground">마감</dt>
          <dd className="flex flex-wrap items-center gap-2">
            <DeadlineText item={item} />
            {item.apply_end && (
              <span className="text-muted-foreground">{formatDateTime(item.apply_end)}까지</span>
            )}
            {item.deadline_conflict && <DeadlineConflictNote />}
          </dd>
          {item.apply_start && (
            <>
              <dt className="text-muted-foreground">신청 시작</dt>
              <dd>{formatDateTime(item.apply_start)}</dd>
            </>
          )}
          {item.benefit_amount_text && (
            <>
              <dt className="text-muted-foreground">금액</dt>
              <dd>{item.benefit_amount_text}</dd>
            </>
          )}
        </dl>
        {item.deadline_conflict && (
          <p className="mt-3 text-xs text-amber-800">
            공지 제목과 본문의 마감일이 다릅니다. 원문에서 마감일을 확인하세요.
          </p>
        )}
        <StateButtons id={item.id} state={item.my_state} />
      </section>

      <Checklist conditions={item.conditions} extra={item.extra_conditions} />

      {(item.unread_attachments.length > 0 || item.input_truncated) && (
        <UnreadNotice files={item.unread_attachments} truncated={item.input_truncated} />
      )}

      {item.required_documents.length > 0 && (
        <section className="rounded-xl border bg-background p-5">
          <h2 className="font-semibold">제출 서류</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {item.required_documents.map((doc) => (
              <li key={doc}>{doc}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-xl border bg-background p-5 text-sm">
        <h2 className="font-semibold">원문 공지</h2>
        <a
          href={item.notice.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-start gap-1 break-all underline underline-offset-4"
        >
          {item.notice.title}
          <ExternalLink aria-hidden className="mt-0.5 size-3.5 shrink-0" />
        </a>
        <p className="mt-1 text-xs text-muted-foreground">
          게시일 {formatDate(item.notice.posted_at)}
        </p>
        {item.siblings.length > 0 && (
          <div className="mt-4">
            <h3 className="font-medium">같은 공지의 다른 장학금</h3>
            <ul className="mt-2 grid gap-1">
              {item.siblings.map((sibling) => (
                <li key={sibling.id}>
                  <Link to={`/scholarships/${sibling.id}`} className="underline underline-offset-4">
                    {sibling.name}
                  </Link>
                  {sibling.status === 'CLOSED' && (
                    <span className="ml-1 text-xs text-muted-foreground">(마감)</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="mt-4 text-xs text-muted-foreground">
          다른 게시판에도 같은 장학금이 있을 수 있습니다. 신청 전에 원문을 꼭 확인하세요.
        </p>
      </section>
    </article>
  )
}

const OUTCOME_STYLE = {
  MET: 'bg-emerald-100 text-emerald-700',
  UNMET: 'bg-red-100 text-red-700',
  UNKNOWN: 'bg-amber-100 text-amber-800',
} as const

function Mark({ outcome }: { outcome: ConditionCheck['outcome'] }) {
  const { mark, label } = OUTCOME[outcome]
  return (
    <span
      role="img"
      aria-label={label}
      className={`grid size-6 shrink-0 place-items-center rounded-full text-sm font-semibold ${OUTCOME_STYLE[outcome]}`}
    >
      {mark}
    </span>
  )
}

/** 조건별 ✓ ✗ ? 와 공지 원문 근거 (5.3). extra_conditions는 코드로 비교할 수 없어 ?로 둡니다. */
function Checklist({ conditions, extra }: { conditions: ConditionCheck[]; extra: string[] }) {
  return (
    <section className="rounded-xl border bg-background p-5">
      <h2 className="font-semibold">조건 확인</h2>
      {conditions.length === 0 && extra.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">공지에 따로 적힌 지원 조건이 없습니다.</p>
      ) : (
        <ul className="mt-3 grid gap-3" aria-label="조건 체크리스트">
          {conditions.map((check) => (
            <li key={check.condition} className="flex gap-3">
              <Mark outcome={check.outcome} />
              <div className="min-w-0 text-sm">
                <p className="font-medium">
                  {CONDITION_LABEL[check.condition]}
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                    {OUTCOME[check.outcome].label}
                  </span>
                </p>
                {check.evidence && (
                  <blockquote className="mt-0.5 border-l-2 pl-2 text-muted-foreground break-keep">
                    {check.evidence}
                  </blockquote>
                )}
                {check.evidence && check.evidence_source && (
                  <p className="mt-0.5 text-xs text-muted-foreground break-all">
                    출처: {evidenceSourceLabel(check.evidence_source)}
                  </p>
                )}
              </div>
            </li>
          ))}
          {extra.map((text) => (
            <li key={text} className="flex gap-3">
              <Mark outcome="UNKNOWN" />
              <div className="min-w-0 text-sm">
                <p className="font-medium">
                  추가 조건
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                    직접 확인
                  </span>
                </p>
                <p className="mt-0.5 text-muted-foreground break-keep">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-xs text-muted-foreground">
        ✓ 충족 · ✗ 불충족 · ? 정보가 없거나 공지가 모호해 직접 확인이 필요합니다.
      </p>
    </section>
  )
}

/**
 * 읽지 못한 첨부와 잘린 공고문 (5.2·5.3). 읽지 못한 첨부에 조건이 있을 수 있어
 * 서버가 "지원 가능"을 "확인 필요"로 낮춥니다. 학생이 직접 열어 보게 링크를 줍니다.
 */
function UnreadNotice({ files, truncated }: { files: UnreadAttachment[]; truncated: boolean }) {
  return (
    <section
      aria-labelledby="unread-title"
      className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm"
    >
      <h2 id="unread-title" className="font-semibold text-amber-900">
        첨부파일을 직접 확인하세요
      </h2>
      {files.length > 0 && (
        <>
          <p className="mt-1 text-amber-900/80 break-keep">
            아래 첨부는 읽지 못해 조건을 확인하지 못했어요. 그래서 다른 조건이 맞아도 ‘확인 필요’로
            보여요.
          </p>
          <ul className="mt-3 grid gap-2" aria-label="읽지 못한 첨부">
            {files.map((file) => (
              <li key={`${file.url}#${file.name}`}>
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-start gap-1 break-all underline underline-offset-4"
                >
                  {file.name}
                  <ExternalLink aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                </a>
                <p className="text-xs text-amber-900/70">{UNREAD_REASON[file.reason]}</p>
              </li>
            ))}
          </ul>
        </>
      )}
      {truncated && (
        <p className={`${files.length > 0 ? 'mt-3' : 'mt-1'} text-amber-900/80 break-keep`}>
          공고문이 길어 뒷부분 일부는 읽지 못했어요. 원문 공지에서 조건을 확인하세요.
        </p>
      )}
    </section>
  )
}

const STATE_BUTTONS: { state: UserState; on: string; off: string }[] = [
  { state: 'BOOKMARKED', on: '관심 해제', off: '관심' },
  { state: 'APPLIED', on: '신청완료 취소', off: '신청완료' },
]

/** 관심·신청완료는 하나만 고를 수 있습니다. 누른 상태를 다시 누르면 지웁니다. */
function StateButtons({ id, state }: { id: number; state: ScholarshipDetail['my_state'] }) {
  const mutation = useSetScholarshipState()
  return (
    <div className="mt-5 grid gap-2">
      <div className="grid grid-cols-2 gap-2">
        {STATE_BUTTONS.map((button) => {
          const active = state === button.state
          return (
            <Button
              key={button.state}
              variant={active ? 'default' : 'outline'}
              aria-pressed={active}
              onClick={() => mutation.mutate({ id, state: active ? null : button.state })}
            >
              {active ? button.on : button.off}
            </Button>
          )
        })}
      </div>
      <FormError
        message={mutation.isError ? '저장하지 못했습니다. 잠시 후 다시 시도하세요.' : null}
      />
    </div>
  )
}

function BackLink() {
  const navigate = useNavigate()
  return (
    <button
      type="button"
      onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/dashboard'))}
      className="w-fit text-sm text-muted-foreground hover:text-foreground"
    >
      ← 목록으로
    </button>
  )
}

function NotFound() {
  return (
    <div className="rounded-xl border bg-background p-6 text-center text-sm">
      <p className="text-muted-foreground">장학금을 찾을 수 없습니다.</p>
      <Link to="/dashboard" className="mt-3 inline-block underline underline-offset-4">
        목록으로
      </Link>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="grid gap-4" aria-busy="true" aria-label="불러오는 중">
      <div className="h-5 w-20 animate-pulse rounded bg-muted" />
      <div className="h-56 animate-pulse rounded-xl bg-muted/60" />
      <div className="h-40 animate-pulse rounded-xl bg-muted/60" />
    </div>
  )
}
