import { CircleUserRound } from 'lucide-react'
import { NavLink, Outlet } from 'react-router'

/**
 * 대시보드·상세·내 정보 화면의 공통 틀. 360px 폭에서도 좌우 여백 16px을 유지합니다.
 * 왼쪽 제목은 장학금 목록으로, 오른쪽 프로필 아이콘은 '내 정보'(프로필 요약 + 내 장학금)로 갑니다 (T52).
 */
export function AppLayout() {
  return (
    <div className="min-h-svh bg-brand-50">
      <header className="sticky top-0 z-10 bg-brand-800 text-white shadow-sm">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-2 px-4">
          <NavLink
            to="/dashboard"
            className="shrink-0 text-base font-bold tracking-tight text-white"
          >
            장학금 매칭
          </NavLink>
          <NavLink
            to="/my"
            aria-label="내 정보"
            title="내 정보"
            className={({ isActive }) =>
              `grid size-9 place-items-center rounded-full transition-colors hover:bg-white/15 focus-visible:ring-3 focus-visible:ring-white/50 focus-visible:outline-none ${isActive ? 'bg-white/15' : ''}`
            }
          >
            <CircleUserRound aria-hidden="true" className="size-6" />
          </NavLink>
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
