import { Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'

import { useScholarships, type ListParams } from '@/api/hooks/scholarships'
import { ErrorBox } from '@/components/layout/AppLayout'
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
// 탭·정렬·필터는 한 상자에 모으고, 필터는 제목이 보이는 칩으로 둡니다 (T39).
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
    <div className="grid gap-4">
      <h1 className="text-xl font-semibold text-brand-900">맞춤 장학금</h1>
      <section
        aria-label="목록 필터"
        className="grid gap-3 rounded-xl border border-brand-200 bg-background p-3 sm:p-4"
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
  )
}
