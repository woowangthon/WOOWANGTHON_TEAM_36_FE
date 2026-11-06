import { NavLink, Outlet } from 'react-router'

import { useMe } from '@/api/hooks/auth'

const NAV = [
  { to: '/dashboard', label: '장학금' },
  { to: '/my', label: '내 장학금' },
  { to: '/profile', label: '프로필' },
] as const

/** 대시보드·상세·내 장학금 화면의 공통 틀. 360px 폭에서도 좌우 여백 16px을 유지합니다. */
export function AppLayout() {
  const isAdmin = useMe().data?.is_admin ?? false
  const nav = isAdmin ? [...NAV, { to: '/admin', label: '관리' } as const] : NAV
  return (
    <div className="min-h-svh bg-muted/40">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-12 max-w-3xl items-center justify-between gap-2 px-4">
          <NavLink to="/dashboard" className="shrink-0 text-sm font-semibold">
            장학금 매칭
          </NavLink>
          <nav aria-label="주요 메뉴" className="flex gap-1">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-md px-2 py-1 text-sm ${isActive ? 'bg-muted font-medium' : 'text-muted-foreground hover:text-foreground'}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 pt-5 pb-12">
        <Outlet />
      </main>
    </div>
  )
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-xl border bg-background p-6 text-center text-sm">
      <p className="text-muted-foreground">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-3 underline underline-offset-4">
          다시 시도
        </button>
      )}
    </div>
  )
}
