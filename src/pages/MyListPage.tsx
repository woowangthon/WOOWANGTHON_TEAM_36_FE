import { LogOut, Pencil, Settings } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { useLogout, useMe } from '@/api/hooks/auth'
import { useProfile, type Profile } from '@/api/hooks/profile'
import { useScholarships } from '@/api/hooks/scholarships'
import { FormError } from '@/components/form/Field'
import { ErrorBox } from '@/components/layout/AppLayout'
import { INCOME_OPTIONS } from '@/components/profile/profileForm'
import { ListSkeleton, ScholarshipList } from '@/components/scholarship/ScholarshipCard'
import { SegmentedTabs } from '@/components/scholarship/SegmentedTabs'
import { Button } from '@/components/ui/button'

const TABS = [
  { value: 'bookmarked', label: '관심' },
  { value: 'applied', label: '신청완료' },
] as const
type Tab = (typeof TABS)[number]['value']

const EMPTY: Record<Tab, string> = {
  bookmarked: '관심 장학금이 없습니다. 상세 화면에서 ‘관심’을 누르면 여기에 모입니다.',
  applied: '신청완료로 표시한 장학금이 없습니다.',
}

// 내 정보 (T52): 프로필 요약 + 내 장학금(관심 / 신청완료) + 로그아웃.
// 마감된 장학금도 포함합니다(backend가 state 조회 때 포함).
// 프로필 요약 때문에 이 화면은 프로필·목록 API를 함께 부릅니다(계획서 9.8 예외, 11/11 회의에서 결정).
export default function MyListPage() {
  const [search, setSearch] = useSearchParams()
  const tab: Tab = search.get('tab') === 'applied' ? 'applied' : 'bookmarked'
  const list = useScholarships({ result: 'all', sort: 'deadline', state: tab })

  return (
    <div className="grid gap-6">
      <h1 className="text-xl font-semibold text-brand-900">내 정보</h1>
      <ProfileSummary />
      <section aria-labelledby="my-scholarships" className="grid gap-4">
        <h2 id="my-scholarships" className="text-lg font-semibold">
          내 장학금
        </h2>
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
      </section>
      <AccountFooter />
    </div>
  )
}

/** 프로필 주요 정보를 읽기 전용으로 보여 주고, 세부 입력은 '프로필 수정'에서만 합니다. */
function ProfileSummary() {
  const me = useMe().data
  const profile = useProfile()

  if (profile.isPending) {
    return <div className="h-28 animate-pulse rounded-xl bg-muted" aria-label="불러오는 중" />
  }
  const data = profile.data
  const facts = data ? summaryFacts(data) : []

  return (
    <section
      aria-label="프로필 요약"
      className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-brand-200 bg-background p-4"
    >
      <div className="grid min-w-0 gap-1">
        <p className="text-lg font-semibold text-brand-900">{data?.name ?? '닉네임 없음'}</p>
        <p className="truncate text-xs text-muted-foreground">{me?.email}</p>
        {facts.length > 0 && <p className="text-sm">{facts.join(' · ')}</p>}
        {profile.isError && (
          <p className="text-sm text-muted-foreground">프로필을 불러오지 못했습니다.</p>
        )}
      </div>
      <Button asChild variant="outline">
        <Link to="/profile">
          <Pencil aria-hidden="true" />
          프로필 수정
        </Link>
      </Button>
    </section>
  )
}

function summaryFacts(profile: Profile): string[] {
  const facts = [`${profile.completed_semesters}학기 이수`]
  if (profile.gpa != null) facts.push(`직전학기 평점 ${profile.gpa}`)
  if (profile.income_bracket != null) {
    const option = INCOME_OPTIONS.find((item) => item.value === String(profile.income_bracket))
    if (option) facts.push(profile.income_bracket >= 1 ? `소득 ${option.label}` : option.label)
  }
  return facts
}

function AccountFooter() {
  const navigate = useNavigate()
  const isAdmin = useMe().data?.is_admin ?? false
  const logout = useLogout()

  return (
    <section aria-label="계정" className="grid gap-2 border-t border-brand-200 pt-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          disabled={logout.isPending}
          onClick={() =>
            logout.mutate(undefined, { onSuccess: () => navigate('/login', { replace: true }) })
          }
        >
          <LogOut aria-hidden="true" />
          로그아웃
        </Button>
        {isAdmin && (
          <Button asChild variant="ghost">
            <Link to="/admin">
              <Settings aria-hidden="true" />
              관리자 화면
            </Link>
          </Button>
        )}
      </div>
      <FormError message={logout.error?.message} />
    </section>
  )
}
