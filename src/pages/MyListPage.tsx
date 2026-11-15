import { ArrowLeft, LogOut, Pencil, Settings } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { useLogout, useMe, type Me } from '@/api/hooks/auth'
import { useScholarships } from '@/api/hooks/scholarships'
import { FormError } from '@/components/form/Field'
import { ErrorBox } from '@/components/layout/AppLayout'
import { Avatar } from '@/components/profile/Avatar'
import { gradeLabel } from '@/components/profile/profileForm'
import {
  BookmarkError,
  ListSkeleton,
  ScholarshipList,
} from '@/components/scholarship/ScholarshipCard'
import { SegmentedTabs } from '@/components/scholarship/SegmentedTabs'
import { Button } from '@/components/ui/button'

const TABS = [
  { value: 'bookmarked', label: '관심' },
  { value: 'applied', label: '신청완료' },
] as const
type Tab = (typeof TABS)[number]['value']

const EMPTY: Record<Tab, string> = {
  bookmarked: '관심 장학금이 없습니다. 장학금 카드의 하트를 누르면 여기에 모입니다.',
  applied: '신청완료로 표시한 장학금이 없습니다.',
}

// 내 정보 (T52): 프로필 요약 + 내 장학금(관심 / 신청완료) + 로그아웃.
// 마감된 장학금도 포함합니다(backend가 state 조회 때 포함).
// 관심과 신청완료는 따로 켜고 끄며, 둘 다 켠 장학금은 두 탭에 모두 나옵니다 (T71).
// 넓은 화면에서는 왼쪽에 프로필 상자, 오른쪽 큰 상자에 내 장학금(바 형태)을 둡니다 (T58).
// 프로필 요약은 모든 화면이 이미 불러오는 /auth/me 값을 써서, 이 화면은 목록 API만 부릅니다(계획서 9.8, BE #44).
export default function MyListPage() {
  const [search, setSearch] = useSearchParams()
  const [bookmarkError, setBookmarkError] = useState<string | null>(null)
  const tab: Tab = search.get('tab') === 'applied' ? 'applied' : 'bookmarked'
  const list = useScholarships({ result: 'all', sort: 'deadline', state: tab })

  return (
    <div className="grid gap-5">
      <div className="grid gap-3">
        <Link
          to="/dashboard"
          className="inline-flex w-fit items-center gap-1 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          장학금 목록으로
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">내 정보</h1>
      </div>
      <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start lg:gap-6">
        <aside className="grid gap-5 surface p-5 lg:sticky lg:top-22">
          <ProfileSummary />
          <AccountFooter />
        </aside>
        <section aria-labelledby="my-scholarships" className="grid gap-3 surface p-4 sm:p-6">
          <h2 id="my-scholarships" className="text-lg font-bold">
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
          {list.isError && <ErrorBox message={list.error.message} onRetry={() => list.refetch()} />}
          {list.isPending && <ListSkeleton variant="row" />}
          {list.data && (
            <ScholarshipList
              items={list.data}
              empty={EMPTY[tab]}
              onBookmarkError={setBookmarkError}
              variant="row"
            />
          )}
          <BookmarkError message={bookmarkError} onDismiss={() => setBookmarkError(null)} />
        </section>
      </div>
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
    <section aria-label="프로필 요약" className="grid justify-items-center gap-4 text-center">
      {/* 캐릭터는 연한 바탕 위에 세워 둡니다 (그림이 바닥 맞춤이라 아래 여백 없이) */}
      <div className="grid w-full place-items-end justify-center rounded-xl bg-canvas px-4 pt-2">
        {me && <Avatar userId={me.id} className="size-36" />}
      </div>
      <div className="grid w-full min-w-0 gap-0.5">
        <p className="text-lg font-bold">{me?.nickname ?? '닉네임 없음'}</p>
        <p className="truncate text-[13px] text-muted-foreground">{me?.email}</p>
      </div>
      {facts.length > 0 && (
        // 학년·평점을 한 줄씩 (좁은 상자에서 글자 중간에 줄이 바뀌지 않게)
        <ul className="grid w-full gap-1 border-y border-border py-3 text-sm break-keep">
          {facts.map((fact) => (
            <li key={fact}>{fact}</li>
          ))}
        </ul>
      )}
      <Button asChild variant="outline" className="w-full">
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
  if (me.completed_semesters != null)
    facts.push(gradeLabel(me.completed_semesters, me.is_transfer ?? false))
  if (me.gpa != null) facts.push(`직전학기 평점 ${me.gpa}`)
  return facts
}

function AccountFooter() {
  const navigate = useNavigate()
  const isAdmin = useMe().data?.is_admin ?? false
  const logout = useLogout()

  return (
    <section aria-label="계정" className="grid gap-2">
      <div className="flex flex-wrap items-center justify-center gap-1">
        <Button
          variant="ghost"
          className="text-muted-foreground"
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
