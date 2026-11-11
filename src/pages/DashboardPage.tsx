import { ArrowUpDown, School, Search, Wallet, type LucideIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'

import { useScholarships, type ListParams } from '@/api/hooks/scholarships'
import { ErrorBox } from '@/components/layout/AppLayout'
import { SidePanel } from '@/components/layout/SidePanel'
import { ListSkeleton, ScholarshipList } from '@/components/scholarship/ScholarshipCard'
import { DeadlineSoon, ResultGuide } from '@/components/scholarship/SideExtras'
import { SegmentedTabs } from '@/components/scholarship/SegmentedTabs'

const TABS = [
  { value: 'eligible', label: '지원 가능' },
  { value: 'conditional', label: '확인 필요' },
  { value: 'all', label: '전체' },
] as const
type Tab = (typeof TABS)[number]['value']

const SORTS = [
  { value: 'deadline', label: '마감 임박순' },
  { value: 'latest', label: '최신순' },
] as const

const SOURCES = [
  { value: '', label: '전체 출처' },
  { value: 'internal', label: '교내' },
  { value: 'external', label: '교외' },
] as const

const BENEFITS = [
  { value: '', label: '전체 형태' },
  { value: '등록금성', label: '등록금성' },
  { value: '생활비성', label: '생활비성' },
] as const

const EMPTY: Record<Tab, string> = {
  eligible: '지금 지원 가능한 장학금이 없습니다. ‘확인 필요’ 탭도 살펴보세요.',
  conditional: '확인이 필요한 장학금이 없습니다.',
  all: '조건에 맞는 장학금이 없습니다.',
}

// 검색창·드롭다운 공통 모양 (흰 바탕, 큰 높이)
const FIELD =
  'h-11 w-full min-w-0 rounded-xl border border-brand-200 bg-white text-sm shadow-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

/** 띄어쓰기·대소문자와 상관없이 찾도록 맞춥니다 ("두산 연강" = "두산연강"). */
const normalize = (text: string) => text.toLowerCase().replace(/\s+/g, '')

function pick<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback
}

// 대시보드 (7.1): 탭 지원 가능/확인 필요/전체, 정렬 마감 임박순·최신순, 필터 교내/교외·등록금성/생활비성.
// 토스 채용 페이지처럼 위쪽 띠에 큰 문구와 '검색창 + 드롭다운 3개 + 초기화' 한 줄을 두고,
// 아래에 탭·목록(왼쪽)과 바로가기(오른쪽, 넓은 화면만)를 둡니다 (T40·T51).
// 탭·정렬·필터·검색어는 주소(?tab=...&q=...)에 두어 상세에서 뒤로 와도 그대로 남습니다.
// 검색은 이미 받은 목록에서 장학금명·출처로 거르며 API를 더 부르지 않습니다 (T44, 계획서 9.8).
export default function DashboardPage() {
  const [search, setSearch] = useSearchParams()
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

  const params: ListParams = {
    result: tab,
    sort,
    source: source || undefined,
    benefit_type: benefit || undefined,
  }
  const list = useScholarships(params)
  const items = list.data?.filter(
    (item) => !keyword || normalize(`${item.name} ${item.source_name}`).includes(keyword),
  )

  const filtered = sort !== 'deadline' || source !== '' || benefit !== ''
  const resetFilters = () =>
    setSearch(
      (prev) => {
        const next = new URLSearchParams(prev)
        for (const key of ['sort', 'source', 'benefit']) next.delete(key)
        return next
      },
      { replace: true },
    )

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
      <section
        aria-label="장학금 찾기"
        className="border-b border-brand-100 bg-gradient-to-br from-brand-100 via-brand-50 to-white"
      >
        <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
          <h1 className="text-sm font-semibold text-brand-700">맞춤 장학금</h1>
          <p className="mt-2 text-2xl leading-snug font-bold tracking-tight text-brand-900 break-keep sm:text-4xl sm:leading-tight">
            내 조건에 맞는 장학금,
            <br />
            놓치지 말고 한 번에 찾아보세요
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            소프트웨어학부 재학생 기준 · 학부·사업단·한국장학재단 공지를 모았어요
          </p>

          <div className="mt-6 grid grid-cols-3 gap-2 lg:grid-cols-[minmax(0,1fr)_repeat(3,10rem)_auto] lg:items-center">
            <div className="relative col-span-3 lg:col-span-1">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="search"
                aria-label="장학금 검색"
                placeholder="장학금 이름이나 출처로 검색해 보세요"
                value={text}
                onChange={(e) => setText(e.target.value)}
                className={`${FIELD} pr-3 pl-10 placeholder:text-muted-foreground`}
              />
            </div>
            <FilterSelect
              label="정렬"
              icon={ArrowUpDown}
              options={SORTS}
              value={sort}
              onChange={(value) => update('sort', value, 'deadline')}
            />
            <FilterSelect
              label="출처"
              icon={School}
              options={SOURCES}
              value={source}
              onChange={(value) => update('source', value, '')}
            />
            <FilterSelect
              label="지원 형태"
              icon={Wallet}
              options={BENEFITS}
              value={benefit}
              onChange={(value) => update('benefit', value, '')}
            />
            <button
              type="button"
              onClick={resetFilters}
              disabled={!filtered}
              className="col-span-3 justify-self-end px-1 text-sm text-brand-800 underline underline-offset-4 disabled:text-muted-foreground disabled:no-underline lg:col-span-1"
            >
              초기화
            </button>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-5xl gap-8 px-4 pt-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="grid content-start gap-4">
          <SegmentedTabs
            label="판정 결과"
            options={TABS}
            value={tab}
            onChange={(value) => update('tab', value, 'eligible')}
          />
          {list.isPending ? (
            <ListSkeleton />
          ) : list.isError ? (
            <ErrorBox message={list.error.message} onRetry={() => list.refetch()} />
          ) : (
            <>
              <p aria-live="polite" className="text-sm text-muted-foreground">
                {keyword ? (
                  <>
                    ‘{text.trim()}’ 검색 결과 {items?.length ?? 0}건
                  </>
                ) : (
                  <>
                    <span className="font-semibold text-brand-800">{items?.length ?? 0}개</span>의
                    장학금이 있어요
                  </>
                )}
              </p>
              <ScholarshipList
                items={items ?? []}
                empty={keyword ? '검색 결과가 없습니다. 다른 이름으로 찾아보세요.' : EMPTY[tab]}
              />
            </>
          )}
        </div>
        <aside aria-label="바로가기" className="hidden content-start gap-4 lg:grid">
          <SidePanel className="grid" />
          <DeadlineSoon items={items} />
          <ResultGuide />
        </aside>
      </div>
    </div>
  )
}

/** 토스형 드롭다운. 휴대폰 폭에서는 아이콘을 숨겨 글자 자리를 확보합니다 (T51). */
function FilterSelect<T extends string>({
  label,
  icon: Icon,
  options,
  value,
  onChange,
}: {
  label: string
  icon: LucideIcon
  options: readonly { readonly value: T; readonly label: string }[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div className="relative min-w-0">
      <Icon
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 hidden size-4 -translate-y-1/2 text-brand-700 sm:block"
      />
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className={`${FIELD} appearance-auto pr-1 pl-2 sm:pl-9`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}
