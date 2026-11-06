import { useSearchParams } from 'react-router'

import { useScholarships } from '@/api/hooks/scholarships'
import { ErrorBox } from '@/components/layout/AppLayout'
import { ListSkeleton, ScholarshipList } from '@/components/scholarship/ScholarshipCard'
import { SegmentedTabs } from '@/components/scholarship/SegmentedTabs'

const TABS = [
  { value: 'bookmarked', label: '관심' },
  { value: 'applied', label: '신청완료' },
] as const
type Tab = (typeof TABS)[number]['value']

const EMPTY: Record<Tab, string> = {
  bookmarked: '관심 장학금이 없습니다. 상세 화면에서 ‘관심’을 누르면 여기에 모입니다.',
  applied: '신청완료로 표시한 장학금이 없습니다.',
}

// 내 장학금 (7.1): 관심 / 신청완료 목록. 마감된 장학금도 포함합니다(backend가 state 조회 때 포함).
export default function MyListPage() {
  const [search, setSearch] = useSearchParams()
  const tab: Tab = search.get('tab') === 'applied' ? 'applied' : 'bookmarked'
  const list = useScholarships({ result: 'all', sort: 'deadline', state: tab })

  return (
    <div className="grid gap-4">
      <h1 className="text-xl font-semibold">내 장학금</h1>
      <SegmentedTabs
        label="내 장학금 구분"
        options={TABS}
        value={tab}
        onChange={(value) =>
          setSearch(value === 'bookmarked' ? {} : { tab: value }, { replace: true })
        }
      />
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
