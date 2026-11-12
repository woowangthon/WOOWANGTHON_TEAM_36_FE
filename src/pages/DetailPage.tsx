import {
  ArrowLeft,
  CalendarClock,
  ChevronDown,
  CalendarDays,
  CircleCheck,
  CircleHelp,
  CircleX,
  Info,
  ExternalLink,
  FileText,
  ListChecks,
  Megaphone,
  Square,
  SquareCheckBig,
  Wallet,
} from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { ApiError } from '@/api/hooks/request'
import {
  nextAnswer,
  useScholarship,
  useSetConditionAnswer,
  useSetScholarshipState,
  type ConditionCheck,
  type ExtraCheck,
  type ScholarshipDetail,
  type UnreadAttachment,
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
  SourceLine,
} from '@/components/scholarship/ScholarshipCard'
import { Button } from '@/components/ui/button'
import { conditionLabel } from '@/lib/conditionLabel'

// 상세 (7.1): 조건별 체크리스트(충족·불충족·확인 필요 아이콘), 원문 근거, 제출 서류, 원문 링크, 같은 공지의 다른 장학금,
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
      <section className="rounded-xl border border-brand-200 bg-background p-3 sm:p-4">
        <div className="flex items-start justify-between gap-3">
          <h1 className="min-w-0 text-xl font-semibold break-keep">{item.name}</h1>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <ResultBadge result={item.result} />
            {item.result === 'ELIGIBLE' && (item.extra_checks ?? []).length > 0 && (
              <span className="text-xs text-muted-foreground">본인 확인 포함</span>
            )}
          </div>
        </div>
        <SourceLine item={item} className="mt-1 text-sm" />
        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="flex items-center gap-1 text-muted-foreground">
            <CalendarClock aria-hidden="true" className="size-4" />
            마감
          </dt>
          <dd className="flex flex-wrap items-center gap-2">
            <DeadlineText item={item} />
            {item.apply_end && (
              <span className="text-muted-foreground">{formatDateTime(item.apply_end)}까지</span>
            )}
            {item.deadline_conflict && <DeadlineConflictNote />}
          </dd>
          {item.apply_start && (
            <>
              <dt className="flex items-center gap-1 text-muted-foreground">
                <CalendarDays aria-hidden="true" className="size-4" />
                신청 시작
              </dt>
              <dd>{formatDateTime(item.apply_start)}</dd>
            </>
          )}
          {item.benefit_amount_text && (
            <>
              <dt className="flex items-center gap-1 text-muted-foreground">
                <Wallet aria-hidden="true" className="size-4" />
                금액
              </dt>
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

      <Checklist id={item.id} conditions={item.conditions} extra={item.extra_checks ?? []} />

      <OtherNotes basic={item.basic_conditions ?? []} notes={item.notes ?? []} />

      {(item.unread_attachments.length > 0 || item.input_truncated) && (
        <UnreadNotice files={item.unread_attachments} truncated={item.input_truncated} />
      )}

      {item.required_documents.length > 0 && (
        <section className="rounded-xl border border-brand-200 bg-background p-3 sm:p-4">
          <h2 className="flex items-center gap-1.5 font-semibold">
            <FileText aria-hidden="true" className="size-5 text-brand-700" />
            제출 서류
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {item.required_documents.map((doc) => (
              <li key={doc}>{doc}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-xl border border-brand-200 bg-background p-3 sm:p-4 text-sm">
        <h2 className="flex items-center gap-1.5 font-semibold">
          <Megaphone aria-hidden="true" className="size-5 text-brand-700" />
          원문 공지
        </h2>
        {hasOriginal(item.notice) ? (
          // 원문 링크는 원문 보기 안(맨 아래)에 둡니다.
          <p className="mt-2 break-all">{item.notice.title}</p>
        ) : (
          // 저장된 본문·첨부가 없으면 원문 보기가 없으므로 제목을 원문 링크로 둡니다.
          <a
            href={item.notice.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-start gap-1 break-all underline underline-offset-4"
          >
            {item.notice.title}
            <ExternalLink aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          </a>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          게시일 {formatDate(item.notice.posted_at)}
        </p>
        <NoticeOriginal notice={item.notice} />
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

// 조건 결과 아이콘 (T38). 판정 뱃지와 같은 모양·색을 씁니다.
const OUTCOME_ICON = {
  MET: { Icon: CircleCheck, color: 'text-emerald-600' },
  UNMET: { Icon: CircleX, color: 'text-red-600' },
  UNKNOWN: { Icon: CircleHelp, color: 'text-amber-600' },
} as const

function Mark({ outcome, small }: { outcome: ConditionCheck['outcome']; small?: boolean }) {
  const { Icon, color } = OUTCOME_ICON[outcome]
  return (
    <span role="img" aria-label={OUTCOME[outcome].label} className={`shrink-0 ${color}`}>
      <Icon aria-hidden="true" className={small ? 'size-3.5' : 'size-6'} />
    </span>
  )
}

/** 사용자 답을 체크리스트 아이콘으로: ✓ 충족 / ✗ 불충족 / 아직 답하지 않음 */
const ANSWER_OUTCOME = { YES: 'MET', NO: 'UNMET' } as const
const ANSWER_LABEL = { YES: '충족', NO: '불충족' } as const

/** 아직 답하지 않은 직접 답하는 조건: 주황 점선 원 안의 물음표로 눌러서 답할 수 있음을 보입니다. */
function AskMark() {
  return (
    <span
      aria-hidden="true"
      className="grid size-6 shrink-0 place-items-center rounded-full border-2 border-dashed border-amber-600 text-xs font-bold text-amber-600"
    >
      ?
    </span>
  )
}

function SectionTitle({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="mt-3">
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-0.5 text-xs text-muted-foreground break-keep">{desc}</p>
    </div>
  )
}

/**
 * 조건별 ✓ ✗ ? 와 공지 원문 근거 (5.3). 두 구역으로 나눕니다.
 * - 내 정보로 판정한 조건: 프로필과 공지를 코드로 비교한 결과
 * - 직접 답하는 조건(추가 조건): 코드로 비교할 수 없어 사용자가 답합니다. 아이콘을 누를 때마다
 *   ? → ✓ → ✗ → ? 로 바뀌고 판정도 다시 계산됩니다.
 */
function Checklist({
  id,
  conditions,
  extra,
}: {
  id: number
  conditions: ConditionCheck[]
  extra: ExtraCheck[]
}) {
  const mutation = useSetConditionAnswer()
  return (
    <section className="rounded-xl border border-brand-200 bg-background p-3 sm:p-4">
      <h2 className="flex items-center gap-1.5 font-semibold">
        <ListChecks aria-hidden="true" className="size-5 text-brand-700" />
        조건 확인
      </h2>
      {conditions.length === 0 && extra.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">공지에 따로 적힌 지원 조건이 없습니다.</p>
      ) : (
        <>
          {conditions.length > 0 && (
            <>
              <SectionTitle
                title="내 정보로 판정한 조건"
                desc="프로필에 입력한 정보와 공지를 비교한 결과예요. 물음표는 정보가 없거나 공지가 모호한 조건이에요."
              />
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
              </ul>
            </>
          )}
          {conditions.length > 0 && extra.length > 0 && <hr className="mt-4 border-brand-100" />}
          {extra.length > 0 && (
            <>
              <SectionTitle
                title="직접 답하는 조건"
                desc="내 정보로는 판정할 수 없는 조건이에요. 아이콘을 누를 때마다 충족 → 불충족 → 모름으로 바뀌어요."
              />
              <ul className="mt-3 grid gap-3" aria-label="직접 답하는 조건">
                {extra.map((check) => (
                  <li key={check.key} className="flex gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        mutation.mutate({ id, key: check.key, answer: nextAnswer(check.answer) })
                      }
                      aria-label={`${conditionLabel(check.text)} 답 바꾸기, 지금: ${
                        check.answer ? ANSWER_LABEL[check.answer] : '모름'
                      }`}
                      className="-m-1 self-start rounded-full p-1 transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                    >
                      {check.answer ? <Mark outcome={ANSWER_OUTCOME[check.answer]} /> : <AskMark />}
                    </button>
                    <div className="min-w-0 text-sm">
                      <p className="font-medium">
                        {conditionLabel(check.text)}
                        <span
                          className={`ml-1.5 text-xs font-normal ${
                            check.answer ? 'text-muted-foreground' : 'text-amber-700'
                          }`}
                        >
                          {check.answer ? ANSWER_LABEL[check.answer] : '눌러서 답하기'}
                        </span>
                      </p>
                      <blockquote className="mt-0.5 border-l-2 pl-2 text-muted-foreground break-keep">
                        {check.text}
                      </blockquote>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
      <FormError
        message={mutation.isError ? '저장하지 못했습니다. 잠시 후 다시 시도하세요.' : null}
      />
    </section>
  )
}

/**
 * 판정에 쓰지 않는 공지 문장 (extract_v5). 국적·중복 수혜처럼 대부분 충족하는 기본 조건은
 * "지원 전 확인", 선발 방식·의무·예외 규정처럼 자격이 아닌 문장은 "참고 안내"로 보여 줍니다.
 * v5 이전에 추출한 장학금은 두 목록이 비어 있어 이 상자가 나오지 않습니다.
 */
function OtherNotes({ basic, notes }: { basic: string[]; notes: string[] }) {
  if (basic.length === 0 && notes.length === 0) return null
  return (
    <section className="rounded-xl border border-brand-200 bg-background p-3 sm:p-4 text-sm">
      <h2 className="flex items-center gap-1.5 font-semibold">
        <Info aria-hidden="true" className="size-5 text-brand-700" />
        함께 알아 둘 내용
      </h2>
      <p className="mt-1 text-xs text-muted-foreground break-keep">
        판정에는 쓰지 않았어요. 신청 전에 한 번 읽어 보세요.
      </p>
      {basic.length > 0 && (
        <>
          <h3 className="mt-3 font-medium">지원 전 확인</h3>
          <ul className="mt-1 list-disc space-y-1 pl-5 break-keep" aria-label="지원 전 확인">
            {basic.map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ul>
        </>
      )}
      {notes.length > 0 && (
        <>
          <h3 className="mt-3 font-medium">참고 안내</h3>
          <ul
            className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground break-keep"
            aria-label="참고 안내"
          >
            {notes.map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ul>
        </>
      )}
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
      className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm sm:p-4"
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

/**
 * 공지 원문 (7.1): 수집 때 저장한 본문과 첨부파일 목록을 같은 페이지에서 펼쳐 봅니다.
 * 서버가 HTML이 아닌 평문을 주므로 그대로 텍스트로 보여 줍니다. 첨부 내용은 PDF 추출 글자라
 * 읽기 어려워 보여 주지 않고, 파일 이름과 내려받기만 둡니다.
 */
function hasOriginal(notice: ScholarshipDetail['notice']) {
  return notice.body_text.trim().length > 0 || notice.attachments.length > 0
}

function NoticeOriginal({ notice }: { notice: ScholarshipDetail['notice'] }) {
  const [open, setOpen] = useState(false)
  const hasBody = notice.body_text.trim().length > 0
  if (!hasOriginal(notice)) return null
  return (
    <div className="mt-3">
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-expanded={open}
        aria-controls="notice-original"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? '원문 접기' : '원문 보기'}
        <ChevronDown
          aria-hidden="true"
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </Button>
      {open && (
        <div
          id="notice-original"
          role="region"
          aria-label="공지 원문"
          className="mt-3 grid max-h-[70vh] gap-4 overflow-y-auto rounded-lg border bg-muted/30 p-3"
        >
          {hasBody && (
            <p className="text-sm leading-relaxed wrap-anywhere whitespace-pre-wrap">
              {notice.body_text}
            </p>
          )}
          {notice.attachments.length > 0 && (
            // 첨부 내용은 조건 확인(서버 추출)에만 쓰고, 화면에는 파일 이름과 내려받기만 둡니다.
            <ul className="grid gap-1.5 border-t pt-3" aria-label="첨부파일">
              {notice.attachments.map((file) => (
                <li
                  key={`${file.url}#${file.name}`}
                  className="flex items-start gap-1.5 text-sm break-all"
                >
                  <FileText aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-brand-700" />
                  <span className="min-w-0">
                    {file.name}{' '}
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-1 inline-flex items-center gap-0.5 text-xs text-muted-foreground underline underline-offset-4"
                    >
                      내려받기
                      <ExternalLink aria-hidden className="size-3" />
                    </a>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t pt-3">
            <a
              href={notice.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-medium underline underline-offset-4"
            >
              원문 사이트에서 보기
              <ExternalLink aria-hidden className="size-3.5 shrink-0" />
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * 신청 완료 체크박스 (T63). 관심은 목록 카드의 하트로 옮겼고(T54), 상세에는 신청 완료만 둡니다.
 * 글자는 항상 '신청 완료'이고 체크 여부(aria-pressed)로 상태를 보여 줍니다. 다시 누르면 체크가 풀립니다.
 * 우리 서비스가 대신 신청하지 않으므로, 원문 공지에서 신청한 뒤 표시해 두는 용도입니다.
 */
function StateButtons({ id, state }: { id: number; state: ScholarshipDetail['my_state'] }) {
  const mutation = useSetScholarshipState()
  const applied = state === 'APPLIED'
  const Icon = applied ? SquareCheckBig : Square
  return (
    <div className="mt-5 grid gap-1.5">
      <button
        type="button"
        aria-pressed={applied}
        onClick={() => mutation.mutate({ id, state: applied ? null : 'APPLIED' })}
        className={`flex h-11 items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none ${
          applied
            ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            : 'border-brand-200 bg-white text-foreground hover:border-brand-400 hover:bg-brand-50'
        }`}
      >
        <Icon aria-hidden="true" className="size-5" />
        신청 완료
      </button>
      <p className="text-center text-xs text-muted-foreground break-keep">
        {applied
          ? '내 정보 > 신청완료에 모아 뒀어요. 다시 누르면 체크가 풀려요.'
          : '원문 공지에서 신청을 마쳤다면 체크해 두세요.'}
      </p>
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
      className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft aria-hidden="true" className="size-4" />
      목록으로
    </button>
  )
}

function NotFound() {
  return (
    <div className="rounded-xl border border-brand-200 bg-background p-6 text-center text-sm">
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
