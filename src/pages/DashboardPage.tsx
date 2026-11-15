import { Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'

import { useScholarships, type ListParams } from '@/api/hooks/scholarships'
import { ErrorBox } from '@/components/layout/AppLayout'
import { SidePanel } from '@/components/layout/SidePanel'
import {
  BookmarkError,
  ListSkeleton,
  ScholarshipList,
} from '@/components/scholarship/ScholarshipCard'
import { DeadlineSoon, ResultGuide } from '@/components/scholarship/SideExtras'
import { SegmentedTabs } from '@/components/scholarship/SegmentedTabs'
import { UnlockHint } from '@/components/scholarship/UnlockHint'

const TABS = [
  { value: 'eligible', label: '지원 가능' },
  { value: 'conditional', label: '확인 필요' },
  { value: 'all', label: '전체' },
] as const
type Tab = (typeof TABS)[number]['value']
const TAB_RESULT = { eligible: 'ELIGIBLE', conditional: 'CONDITIONAL' } as const

const SORTS = [
  { value: 'deadline', label: '마감 임박순' },
  { value: 'latest', label: '최신순' },
] as const

const SOURCES = [
  { value: '', label: '교내·교외' },
  { value: 'internal', label: '교내' },
  { value: 'external', label: '교외' },
] as const

const BENEFITS = [
  { value: '', label: '등록금·생활비' },
  { value: '등록금성', label: '등록금' },
  { value: '생활비성', label: '생활비' },
] as const

const EMPTY: Record<Tab, string> = {
  eligible: '지금 지원 가능한 장학금이 없습니다. ‘확인 필요’ 탭도 살펴보세요.',
  conditional: '확인이 필요한 장학금이 없습니다.',
  all: '조건에 맞는 장학금이 없습니다.',
}

// 검색창·드롭다운 공통 모양 (흰 바탕, 큰 높이). 휴대폰에서는 16px 글자로 두어 눌렀을 때 화면이 확대되지 않게 합니다.
const FIELD =
  'h-11 w-full min-w-0 rounded-xl border border-input bg-white text-base outline-none transition-colors hover:border-foreground/25 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:text-sm'

// 우왕이 옆에서 둥실거리는 장식의 공통 모양
const FLOAT = 'absolute animate-float motion-reduce:animate-none'

function Sparkle({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={`${FLOAT} ${className}`}>
      <path d="M12 0c1 7 5 11 12 12-7 1-11 5-12 12-1-7-5-11-12-12 7-1 11-5 12-12z" />
    </svg>
  )
}

/** 띄어쓰기·대소문자와 상관없이 찾도록 맞춥니다 ("두산 연강" = "두산연강"). */
const normalize = (text: string) => text.toLowerCase().replace(/\s+/g, '')

function pick<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback
}

// 대시보드 (7.1): 탭 지원 가능/확인 필요/전체, 정렬 마감 임박순·최신순, 필터 교내/교외·등록금성/생활비성.
// 위쪽 흰 띠에 큰 문구와 '검색창 + 드롭다운 3개 + 초기화'를 두고,
// 아래에 탭·목록(왼쪽)과 곧 마감·바로가기(오른쪽, 넓은 화면만)를 둡니다 (T40·T51).
// 탭·정렬·필터·검색어는 주소(?tab=...&q=...)에 두어 상세에서 뒤로 와도 그대로 남습니다.
// 검색은 이미 받은 목록에서 장학금명·출처로 거르며 API를 더 부르지 않습니다 (T44, 계획서 9.8).
export default function DashboardPage() {
  const [search, setSearch] = useSearchParams()
  const [bookmarkError, setBookmarkError] = useState<string | null>(null)
  const tab = pick(search.get('tab'), ['eligible', 'conditional', 'all'], 'eligible')
  const sort = pick(search.get('sort'), ['deadline', 'latest'], 'deadline')
  const source = pick(search.get('source'), ['', 'internal', 'external'], '')
  const benefit = pick(search.get('benefit'), ['', '등록금성', '생활비성'], '')
  const query = search.get('q') ?? ''
  // 검색창 값은 화면 안에 두고, 주소에는 타자를 멈춘 뒤 한 번만 씁니다.
  // 키를 누를 때마다 주소를 바꾸면 한글 조합이 끊겨 글자가 겹쳐 들어갑니다.
  const [text, setText] = useState(query)
  const keyword = normalize(text)

  useEffect(() => {
    if (text === query) return
    const timer = setTimeout(() => {
      setSearch(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (text) next.set('q', text)
          else next.delete('q')
          return next
        },
        { replace: true },
      )
    }, 300)
    return () => clearTimeout(timer)
  }, [text, query, setSearch])

  // 판정과 상관없이 한 번 받아 탭별로 나눕니다. 탭 이름 옆 개수를 API를 더 부르지 않고 셉니다(9.8).
  // backend는 같은 정렬 목록에서 판정만 거르므로, 여기서 나눠도 탭별 순서는 그대로입니다.
  const params: ListParams = {
    result: 'all',
    sort,
    source: source || undefined,
    benefit_type: benefit || undefined,
  }
  const list = useScholarships(params)
  // 탭 옆 개수는 검색어까지 반영해, 탭을 눌렀을 때 보이는 개수와 같게 합니다.
  const matches = (item: { display_name: string; name: string; source_name: string }) =>
    !keyword || normalize(`${item.display_name} ${item.name} ${item.source_name}`).includes(keyword)
  const found = list.data?.filter(matches)
  const counts = found && {
    eligible: found.filter((item) => item.result === TAB_RESULT.eligible).length,
    conditional: found.filter((item) => item.result === TAB_RESULT.conditional).length,
    all: found.length,
  }
  const tabItems =
    tab === 'all' ? list.data : list.data?.filter((item) => item.result === TAB_RESULT[tab])
  const items = tabItems?.filter(matches)

  // 초기화는 정렬·출처·지원 형태와 검색어를 함께 지웁니다 (판정 탭은 그대로)
  const filtered = sort !== 'deadline' || source !== '' || benefit !== '' || text !== ''
  const resetFilters = () => {
    setText('')
    setSearch(
      (prev) => {
        const next = new URLSearchParams(prev)
        for (const key of ['sort', 'source', 'benefit', 'q']) next.delete(key)
        return next
      },
      { replace: true },
    )
  }

  const update = (key: string, value: string, fallback: string) =>
    setSearch(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value === fallback) next.delete(key)
        else next.set(key, value)
        return next
      },
      { replace: true },
    )

  return (
    <div>
      {/* 위쪽은 연한 크림에서 살구색으로 번지게 해 아래 바탕과 자연스럽게 잇습니다 */}
      <section
        aria-label="장학금 찾기"
        className="border-b border-[#fbe3c6] bg-linear-to-b from-[#fff8ee] to-[#ffebd2]"
      >
        <div className="mx-auto max-w-5xl px-4 pt-6 pb-6 sm:pt-7 sm:pb-8">
          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0 sm:pt-3">
              <h1 className="text-sm font-semibold text-brand-700">맞춤 장학금</h1>
              <p className="mt-2 text-[26px] leading-[1.3] font-bold tracking-tight break-keep sm:text-4xl sm:leading-[1.25]">
                내 조건에 맞는 장학금,
                <br />
                놓치지 말고 한 번에 찾아보세요
              </p>
            </div>
            {/* 장학금을 찾는 우왕이 (꾸밈용). 천천히 둥실거리고, 태블릿 너비부터 보입니다 */}
            <div aria-hidden="true" className="relative hidden h-44 w-60 shrink-0 sm:block">
              <img
                src="/avatars/avatar-search.png"
                alt=""
                width={360}
                height={360}
                className="absolute right-0 bottom-0 size-40 animate-float object-contain object-bottom motion-reduce:animate-none"
              />
              {/* 글자 없는 장식: 반짝이 셋과 동전 하나 */}
              <Sparkle className="top-3.5 left-14 size-[22px] text-brand-400 [animation-delay:-1.2s]" />
              <Sparkle className="top-14 left-7 size-3 text-brand-300 [animation-delay:-2.6s]" />
              <Sparkle className="top-1.5 right-2 size-3.5 text-brand-500 [animation-delay:-3.4s]" />
              <span className={`${FLOAT} top-[74px] left-16 [animation-delay:-2s]`}>
                <span className="grid size-[30px] -rotate-12 place-items-center rounded-full border-2 border-[#e9a70f] bg-[#ffd45c] text-[15px] font-extrabold text-[#a86a00]">
                  ₩
                </span>
              </span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-[repeat(3,minmax(0,1fr))_auto] lg:grid-cols-[minmax(0,1fr)_repeat(3,10rem)_auto] lg:items-center">
            <div className="relative col-span-2 sm:col-span-4 lg:col-span-1">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="search"
                aria-label="장학금 검색"
                placeholder="장학금 이름이나 출처로 검색"
                value={text}
                onChange={(e) => setText(e.target.value)}
                className={`${FIELD} pr-3 pl-10 placeholder:text-muted-foreground/70`}
              />
            </div>
            <FilterSelect
              label="정렬"
              options={SORTS}
              value={sort}
              onChange={(value) => update('sort', value, 'deadline')}
            />
            <FilterSelect
              label="출처"
              options={SOURCES}
              value={source}
              onChange={(value) => update('source', value, '')}
            />
            <FilterSelect
              label="지원 형태"
              options={BENEFITS}
              value={benefit}
              onChange={(value) => update('benefit', value, '')}
            />
            <button
              type="button"
              onClick={resetFilters}
              disabled={!filtered}
              className="h-11 justify-self-end rounded-xl px-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:pointer-events-none disabled:font-medium disabled:text-muted-foreground/60"
            >
              초기화
            </button>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-5xl gap-8 px-4 pt-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="grid content-start gap-4">
          <SegmentedTabs
            label="판정 결과"
            options={TABS.map((option) => ({ ...option, count: counts?.[option.value] }))}
            value={tab}
            onChange={(value) => update('tab', value, 'eligible')}
          />
          {list.isError && <ErrorBox message={list.error.message} onRetry={() => list.refetch()} />}
          {list.isPending && <ListSkeleton />}
          {tabItems && (
            <>
              {/* "이것만 확인하면 N개" 안내: 확인 필요 장학금이 있는 탭(확인 필요·전체)에서만 보입니다 */}
              {!keyword && <UnlockHint items={tabItems} />}
              <p aria-live="polite" className="text-sm text-muted-foreground">
                {keyword ? (
                  <>
                    ‘{text.trim()}’ 검색 결과 {items?.length ?? 0}건
                  </>
                ) : (
                  <>
                    <span className="font-semibold text-foreground">{items?.length ?? 0}개</span>의
                    장학금이 있어요
                  </>
                )}
              </p>
              <ScholarshipList
                items={items ?? []}
                empty={keyword ? '검색 결과가 없습니다. 다른 이름으로 찾아보세요.' : EMPTY[tab]}
                onBookmarkError={setBookmarkError}
              />
            </>
          )}
          <BookmarkError message={bookmarkError} onDismiss={() => setBookmarkError(null)} />
        </div>
        {/* 스크롤해도 따라오는 사이드바. 화면보다 길면 사이드바 안에서만 스크롤됩니다 (상단 바 64px + 여백) */}
        <aside
          aria-label="바로가기"
          className="hidden min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-4 [scrollbar-width:thin] lg:sticky lg:top-22 lg:grid lg:max-h-[calc(100svh-6.5rem)] lg:self-start lg:overflow-y-auto lg:pr-1 lg:pb-1"
        >
          <DeadlineSoon
            items={items}
            onShowAll={tab === 'all' ? undefined : () => update('tab', 'all', 'eligible')}
          />
          <ResultGuide />
          <SidePanel className="grid min-w-0 grid-cols-[minmax(0,1fr)] px-1 pt-2" />
        </aside>
      </div>
    </div>
  )
}

/**
 * 필터 드롭다운. 기본 모양을 끄고 오른쪽 화살표를 직접 그립니다(select-chevron).
 * Safari가 기본 모양 select의 여백을 무시해 글자가 겹치던 문제를 막습니다 (T67).
 */
function FilterSelect<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: readonly { readonly value: T; readonly label: string }[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className={`${FIELD} select-chevron cursor-pointer truncate pr-9 pl-3.5`}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}
