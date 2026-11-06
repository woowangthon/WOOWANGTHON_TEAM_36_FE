import { useSearchParams } from 'react-router'

import { useScholarships, type ListParams } from '@/api/hooks/scholarships'
import { ErrorBox } from '@/components/layout/AppLayout'
import { ListSkeleton, ScholarshipList } from '@/components/scholarship/ScholarshipCard'
import { SegmentedTabs } from '@/components/scholarship/SegmentedTabs'
import { Label, NativeSelect } from '@/components/ui/input'

const TABS = [
  { value: 'eligible', label: '지원 가능' },
  { value: 'conditional', label: '확인 필요' },
  { value: 'all', label: '전체' },
] as const
type Tab = (typeof TABS)[number]['value']

const EMPTY: Record<Tab, string> = {
  eligible: '지금 지원 가능한 장학금이 없습니다. ‘확인 필요’ 탭도 살펴보세요.',
  conditional: '확인이 필요한 장학금이 없습니다.',
  all: '조건에 맞는 장학금이 없습니다.',
}

function pick<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback
}

// 대시보드 (7.1): 탭 지원 가능/확인 필요/전체, 정렬 마감 임박순·최신순, 필터 교내/교외·등록금성/생활비성.
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
      <h1 className="text-xl font-semibold">맞춤 장학금</h1>
      <SegmentedTabs
        label="판정 결과"
        options={TABS}
        value={tab}
        onChange={(value) => update('tab', value, 'eligible')}
      />
      <div className="grid grid-cols-3 gap-2">
        <div>
          <Label htmlFor="sort" className="sr-only">
            정렬
          </Label>
          <NativeSelect
            id="sort"
            value={sort}
            onChange={(e) => update('sort', e.target.value, 'deadline')}
          >
            <option value="deadline">마감 임박순</option>
            <option value="latest">최신순</option>
          </NativeSelect>
        </div>
        <div>
          <Label htmlFor="source" className="sr-only">
            교내/교외
          </Label>
          <NativeSelect
            id="source"
            value={source}
            onChange={(e) => update('source', e.target.value, '')}
          >
            <option value="">교내·교외</option>
            <option value="internal">교내</option>
            <option value="external">교외</option>
          </NativeSelect>
        </div>
        <div>
          <Label htmlFor="benefit" className="sr-only">
            지원 형태
          </Label>
          <NativeSelect
            id="benefit"
            value={benefit}
            onChange={(e) => update('benefit', e.target.value, '')}
          >
            <option value="">모든 형태</option>
            <option value="등록금성">등록금성</option>
            <option value="생활비성">생활비성</option>
          </NativeSelect>
        </div>
      </div>

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
