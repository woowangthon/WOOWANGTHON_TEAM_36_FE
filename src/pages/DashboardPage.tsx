import { RotateCcw, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'

import { useScholarships, type ListParams } from '@/api/hooks/scholarships'
import { ErrorBox } from '@/components/layout/AppLayout'
import { SidePanel } from '@/components/layout/SidePanel'
import { ListSkeleton, ScholarshipList } from '@/components/scholarship/ScholarshipCard'
import { FilterChips } from '@/components/scholarship/FilterChips'
import { SegmentedTabs } from '@/components/scholarship/SegmentedTabs'
import { Input } from '@/components/ui/input'

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
  { value: '', label: '전체' },
  { value: 'internal', label: '교내' },
  { value: 'external', label: '교외' },
] as const

const BENEFITS = [
  { value: '', label: '전체' },
  { value: '등록금성', label: '등록금성' },
  { value: '생활비성', label: '생활비성' },
] as const

const EMPTY: Record<Tab, string> = {
  eligible: '지금 지원 가능한 장학금이 없습니다. ‘확인 필요’ 탭도 살펴보세요.',
  conditional: '확인이 필요한 장학금이 없습니다.',
  all: '조건에 맞는 장학금이 없습니다.',
}

/** 띄어쓰기·대소문자와 상관없이 찾도록 맞춥니다 ("두산 연강" = "두산연강"). */
const normalize = (text: string) => text.toLowerCase().replace(/\s+/g, '')

function pick<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback
}

// 대시보드 (7.1): 탭 지원 가능/확인 필요/전체, 정렬 마감 임박순·최신순, 필터 교내/교외·등록금성/생활비성.
// 필터는 제목이 보이는 칩으로 둡니다 (T39). 1024px 이상에서는 정렬·출처·지원 형태 칩과 바로가기를
// 왼쪽 사이드바에, 검색·탭·목록을 오른쪽에 둡니다 (T40). 휴대폰에서는 위에서 아래로 쌓입니다.
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
    <div className="grid gap-4 lg:grid-cols-[15rem_minmax(0,1fr)] lg:grid-rows-[auto_auto_1fr] lg:items-start">
      <div className="grid gap-1 lg:col-start-2 lg:row-start-1 lg:self-end">
        <h1 className="text-xl font-semibold text-brand-900">맞춤 장학금</h1>
        <p className="text-sm text-muted-foreground">
          소프트웨어학부 재학생 기준 · 학부·사업단·한국장학재단 공지를 모았어요
        </p>
      </div>
      <section
        aria-label="목록 검색"
        className="grid gap-3 rounded-xl border border-brand-200 bg-background p-3 sm:p-4 lg:col-start-2 lg:row-start-2"
      >
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            aria-label="장학금 검색"
            placeholder="장학금 이름이나 출처로 검색"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="pl-9"
          />
        </div>
        <SegmentedTabs
          label="판정 결과"
          options={TABS}
          value={tab}
          onChange={(value) => update('tab', value, 'eligible')}
        />
      </section>

      {/* 팀 로고: 넓은 화면에서 사이드바 위 빈 칸(제목 줄 옆)에 둡니다 */}
      <img
        src="/logo-woowangdon.png"
        alt="우왕돈이다"
        width={640}
        height={197}
        className="hidden h-auto w-full self-end lg:col-start-1 lg:row-start-1 lg:block"
      />
      <aside className="grid gap-4 lg:sticky lg:top-20 lg:col-start-1 lg:row-span-2 lg:row-start-2">
        <section
          aria-label="목록 필터"
          className="grid gap-3 rounded-xl border border-brand-200 bg-background p-3 sm:p-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-brand-900">필터</h2>
            <button
              type="button"
              onClick={resetFilters}
              disabled={!filtered}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-brand-800 disabled:pointer-events-none disabled:opacity-40"
            >
              <RotateCcw aria-hidden="true" className="size-3.5" />
              초기화
            </button>
          </div>
        <FilterChips
          label="정렬"
          options={SORTS}
          value={sort}
          onChange={(value) => update('sort', value, 'deadline')}
        />
        <FilterChips
          label="출처"
          options={SOURCES}
          value={source}
          onChange={(value) => update('source', value, '')}
        />
        <FilterChips
          label="지원 형태"
          options={BENEFITS}
          value={benefit}
          onChange={(value) => update('benefit', value, '')}
        />
        </section>
        <SidePanel className="hidden lg:grid" />
      </aside>

      <div className="grid gap-3 lg:col-start-2 lg:row-start-3">

      {list.isPending ? (
        <ListSkeleton />
      ) : list.isError ? (
        <ErrorBox message={list.error.message} onRetry={() => list.refetch()} />
      ) : (
        <>
          {keyword && (
            <p aria-live="polite" className="text-sm text-muted-foreground">
              ‘{text.trim()}’ 검색 결과 {items?.length ?? 0}건
            </p>
          )}
          <ScholarshipList
            items={items ?? []}
            empty={keyword ? '검색 결과가 없습니다. 다른 이름으로 찾아보세요.' : EMPTY[tab]}
          />
        </>
      )}
      </div>
    </div>
  )
}
