import { CircleUserRound } from 'lucide-react'
import { Link, NavLink, Outlet, useMatch } from 'react-router'

/**
 * 대시보드·상세·내 정보 화면의 공통 틀. 360px 폭에서도 좌우 여백 16px을 유지합니다.
 * 토스 채용 페이지처럼 흰 상단 바에 왼쪽 로고, 오른쪽 '내 정보' 버튼을 둡니다 (T52, T40).
 * 대시보드는 위쪽 띠를 화면 끝까지 쓰므로 폭·여백을 스스로 정하고, 나머지 화면은 가운데 폭을 씁니다.
 * 바탕은 따뜻한 회색(canvas), 내용은 흰 카드에 올립니다. 오렌지는 강조에만 씁니다.
 */
export function AppLayout() {
  const isDashboard = useMatch('/dashboard') !== null
  // 내 정보는 왼쪽 프로필 + 오른쪽 내 장학금 2단이라 더 넓게 씁니다 (T58)
  const isMyPage = useMatch('/my') !== null
  // 장학금 상세도 왼쪽 내용 + 오른쪽 요약 상자 2단이라 넓게 씁니다
  const isDetail = useMatch('/scholarships/:id') !== null
  return (
    <div className="min-h-svh bg-canvas">
      <header className="sticky top-0 z-20 border-b border-border bg-[#fffcf7]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4">
          <Link to="/dashboard" aria-label="장학금 목록 (홈)" className="flex min-w-0 items-center">
            <img
              src="/logo-woowangdon.png"
              alt="우왕돈이다"
              width={679}
              height={197}
              className="h-8 w-auto shrink-0 sm:h-9"
            />
          </Link>
          <NavLink
            to="/my"
            className={({ isActive }) =>
              `inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none ${isActive ? 'border-foreground bg-foreground text-white' : 'border-input bg-white text-foreground hover:bg-muted'}`
            }
          >
            <CircleUserRound aria-hidden="true" className="size-[1.125rem]" />내 정보
          </NavLink>
        </div>
      </header>
      <main
        className={
          isDashboard
            ? 'pb-16'
            : `mx-auto px-4 pt-6 pb-16 ${isMyPage || isDetail ? 'max-w-5xl' : 'max-w-3xl'}`
        }
      >
        <Outlet />
      </main>
    </div>
  )
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="surface p-8 text-center text-sm">
      <p className="text-muted-foreground">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 font-semibold text-brand-800 underline underline-offset-4"
        >
          다시 시도
        </button>
      )}
    </div>
  )
}
