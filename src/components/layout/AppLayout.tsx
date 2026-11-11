import { CircleUserRound } from 'lucide-react'
import { Link, NavLink, Outlet, useMatch } from 'react-router'

/**
 * 대시보드·상세·내 정보 화면의 공통 틀. 360px 폭에서도 좌우 여백 16px을 유지합니다.
 * 토스 채용 페이지처럼 흰 상단 바에 왼쪽 로고, 오른쪽 '내 정보' 버튼을 둡니다 (T52, T40).
 * 대시보드는 위쪽 띠를 화면 끝까지 쓰므로 폭·여백을 스스로 정하고, 나머지 화면은 가운데 폭을 씁니다.
 */
export function AppLayout() {
  const isDashboard = useMatch('/dashboard') !== null
  return (
    <div className={`min-h-svh ${isDashboard ? 'bg-white' : 'bg-brand-50'}`}>
      <header className="sticky top-0 z-10 border-b border-brand-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4">
          <Link to="/dashboard" aria-label="장학금 목록 (홈)" className="flex min-w-0 items-center">
            <img
              src="/logo-woowangdon.png"
              alt="우왕돈이다"
              width={640}
              height={197}
              className="h-8 w-auto shrink-0 sm:h-9"
            />
          </Link>
          <NavLink
            to="/my"
            className={({ isActive }) =>
              `inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-white transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none ${isActive ? 'bg-brand-900' : 'bg-brand-800 hover:bg-brand-700'}`
            }
          >
            <CircleUserRound aria-hidden="true" className="size-4" />내 정보
          </NavLink>
        </div>
      </header>
      <main className={isDashboard ? 'pb-12' : 'mx-auto max-w-3xl px-4 pt-5 pb-12'}>
        <Outlet />
      </main>
    </div>
  )
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-brand-200 bg-background p-6 text-center text-sm"
    >
      <p className="text-muted-foreground">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-3 underline underline-offset-4">
          다시 시도
        </button>
      )}
    </div>
  )
}
