import { ArrowLeft, LogOut, Pencil, Settings } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { useLogout, useMe, type Me } from '@/api/hooks/auth'
import { useScholarships } from '@/api/hooks/scholarships'
import { FormError } from '@/components/form/Field'
import { ErrorBox } from '@/components/layout/AppLayout'
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
// 프로필 요약은 모든 화면이 이미 불러오는 /auth/me 값을 써서, 이 화면은 목록 API만 부릅니다(계획서 9.8, BE #44).
export default function MyListPage() {
  const [search, setSearch] = useSearchParams()
  const tab: Tab = search.get('tab') === 'applied' ? 'applied' : 'bookmarked'
  const list = useScholarships({ result: 'all', sort: 'deadline', state: tab })

  return (
    <div className="grid gap-4">
      <div className="grid gap-3">
        <Link
          to="/dashboard"
          className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-brand-800"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          장학금 목록으로
        </Link>
        <h1 className="text-xl font-semibold text-brand-900">내 정보</h1>
      </div>
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

/**
 * 프로필 주요 정보(닉네임·이메일·이수학기·직전학기 평점)를 읽기 전용으로 보여 주고,
 * 세부 입력은 '프로필 수정'에서만 합니다. 소득분위는 민감정보라 요약에 넣지 않습니다 (T53).
 */
function ProfileSummary() {
  const me = useMe().data
  const facts = me ? summaryFacts(me) : []

  return (
    <section
      aria-label="프로필 요약"
      className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-brand-200 bg-background p-3 sm:p-4"
    >
      <div className="grid min-w-0 gap-1">
        <p className="text-lg font-semibold text-brand-900">{me?.nickname ?? '닉네임 없음'}</p>
        <p className="truncate text-xs text-muted-foreground">{me?.email}</p>
        {facts.length > 0 && <p className="text-sm">{facts.join(' · ')}</p>}
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

function summaryFacts(me: Me): string[] {
  const facts: string[] = []
  if (me.completed_semesters != null) facts.push(`${me.completed_semesters}학기 이수`)
  if (me.gpa != null) facts.push(`직전학기 평점 ${me.gpa}`)
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
