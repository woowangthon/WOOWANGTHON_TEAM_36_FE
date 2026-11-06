// 라우팅 가드 (frontend CLAUDE.md): /auth/me 결과로 비로그인 → /login, 동의 전 → /consent,
// 프로필 미입력 → /profile로 보냅니다. /privacy는 가드 밖에 둡니다.
import { Navigate, Outlet, useLocation } from 'react-router'

import { nextPathFor, useMe, type Me } from '@/api/hooks/auth'

import { PageSkeleton } from './AuthLayout'

type Requirement = 'login' | 'consent' | 'profile'

function missingStep(me: Me | null, requirement: Requirement): string | null {
  if (!me) return '/login'
  if (requirement === 'login') return null
  if (!me.privacy_agreed) return '/consent'
  if (requirement === 'consent') return null
  return me.profile_completed ? null : '/profile'
}

/** 조건을 채우지 못했으면 그 단계 화면으로 보냅니다. 로그인으로 보낼 때는 돌아올 주소를 붙입니다. */
export function RequireAuth({ requirement }: { requirement: Requirement }) {
  const me = useMe()
  const location = useLocation()
  if (me.isPending) return <PageSkeleton />
  if (me.isError) return <GuardError />

  const target = missingStep(me.data, requirement)
  if (target === '/login') {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?next=${next}`} replace />
  }
  if (target) return <Navigate to={target} replace />
  return <Outlet />
}

/** 로그인·가입 화면: 이미 로그인했으면 다음 단계로 보냅니다. */
export function GuestOnly() {
  const me = useMe()
  if (me.isPending) return <PageSkeleton />
  if (me.data) return <Navigate to={nextPathFor(me.data)} replace />
  return <Outlet />
}

/** `/`: 상태에 맞는 첫 화면으로 보냅니다. */
export function RootRedirect() {
  const me = useMe()
  if (me.isPending) return <PageSkeleton />
  if (me.isError) return <GuardError />
  return <Navigate to={nextPathFor(me.data)} replace />
}

function GuardError() {
  return (
    <main className="mx-auto max-w-sm px-4 pt-16 text-center">
      <p className="text-sm text-muted-foreground">
        서버에 연결하지 못했습니다. 잠시 후 새로고침하세요.
      </p>
    </main>
  )
}
