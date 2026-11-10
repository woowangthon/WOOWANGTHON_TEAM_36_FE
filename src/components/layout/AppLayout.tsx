import { Bookmark, EllipsisVertical, GraduationCap, Settings, User } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet } from 'react-router'

import { useMe } from '@/api/hooks/auth'

const NAV = [
  { to: '/dashboard', label: '장학금', icon: GraduationCap },
  { to: '/my', label: '내 장학금', icon: Bookmark },
  { to: '/profile', label: '프로필', icon: User },
] as const
const ADMIN_NAV = { to: '/admin', label: '관리', icon: Settings } as const

/**
 * 대시보드·상세·내 장학금 화면의 공통 틀. 360px 폭에서도 좌우 여백 16px을 유지합니다.
 * 제목과 메뉴가 같은 줄에서 섞여 보이지 않도록 메뉴는 오른쪽 더보기(⋮) 버튼 안에 세로로 둡니다 (T50).
 */
export function AppLayout() {
  const isAdmin = useMe().data?.is_admin ?? false
  const nav = isAdmin ? [...NAV, ADMIN_NAV] : NAV
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // 메뉴가 열려 있을 때만 바깥 클릭·Esc로 닫습니다. Esc는 더보기 버튼으로 초점을 돌려줍니다.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      buttonRef.current?.focus()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

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
          <div ref={menuRef} className="relative">
            <button
              ref={buttonRef}
              type="button"
              aria-label="메뉴"
              aria-expanded={open}
              aria-controls="main-menu"
              onClick={() => setOpen((value) => !value)}
              className={`grid size-9 place-items-center rounded-md transition-colors hover:bg-white/15 focus-visible:ring-3 focus-visible:ring-white/50 focus-visible:outline-none ${open ? 'bg-white/15' : ''}`}
            >
              <EllipsisVertical aria-hidden="true" className="size-5" />
            </button>
            {open && (
              <nav
                id="main-menu"
                aria-label="주요 메뉴"
                className="absolute right-0 mt-2 w-44 overflow-hidden rounded-xl border border-brand-200 bg-background py-1 text-foreground shadow-lg"
              >
                {nav.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors focus-visible:bg-brand-50 focus-visible:outline-none ${isActive ? 'bg-brand-50 font-medium text-brand-800' : 'hover:bg-brand-50'}`
                    }
                  >
                    <Icon aria-hidden="true" className="size-4" />
                    {label}
                  </NavLink>
                ))}
              </nav>
            )}
          </div>
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
