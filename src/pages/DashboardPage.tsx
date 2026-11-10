import { useSearchParams } from 'react-router'

import { useScholarships, type ListParams } from '@/api/hooks/scholarships'
import { ErrorBox } from '@/components/layout/AppLayout'
import { ListSkeleton, ScholarshipList } from '@/components/scholarship/ScholarshipCard'
import { FilterChips } from '@/components/scholarship/FilterChips'
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

function pick<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback
}

// 대시보드 (7.1): 탭 지원 가능/확인 필요/전체, 정렬 마감 임박순·최신순, 필터 교내/교외·등록금성/생활비성.
// 탭·정렬·필터는 한 상자에 모으고, 필터는 제목이 보이는 칩으로 둡니다 (T39).
// 탭·정렬·필터는 주소(?tab=...)에 두어 상세에서 뒤로 와도 그대로 남습니다.
export default function DashboardPage() {
  const [search, setSearch] = useSearchParams()
  const tab = pick(search.get('tab'), ['eligible', 'conditional', 'all'], 'eligible')
  const sort = pick(search.get('sort'), ['deadline', 'latest'], 'deadline')
  const source = pick(search.get('source'), ['', 'internal', 'external'], '')
  const benefit = pick(search.get('benefit'), ['', '등록금성', '생활비성'], '')

  const params: ListParams = {
    result: tab,
    sort,
    source: source || undefined,
    benefit_type: benefit || undefined,
  }
  const list = useScholarships(params)

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
        className="grid gap-3 rounded-xl border border-brand-200 bg-background p-4"
      >
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
        <ScholarshipList items={list.data} empty={EMPTY[tab]} />
      )}
    </div>
  )
}
