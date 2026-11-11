import { Link } from 'react-router'

type Props = {
  title: string
  description?: string
  children: React.ReactNode
  wide?: boolean
  /** 카드 위 왼쪽에 놓을 이전 버튼 (프로필 수정 화면, T49) */
  back?: React.ReactNode
}

/** 로그인·가입·동의·프로필 화면의 공통 틀. 360px 폭에서도 좌우 여백 16px을 유지합니다. */
export function AuthLayout({ title, description, children, wide, back }: Props) {
  return (
    <div className="min-h-svh bg-brand-50">
      <header className="mx-auto flex max-w-3xl items-center px-4 py-4">
        <Link to="/" className="flex items-center gap-2 text-sm font-semibold">
          장학금 매칭
          {/* 충북대 소프트웨어학부 재학생 대상 표식 (T42) */}
          <span className="rounded bg-brand-100 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-brand-800">
            CBNU SW
          </span>
        </Link>
      </header>
      <main className={`mx-auto px-4 pb-12 ${wide ? 'max-w-2xl' : 'max-w-sm'}`}>
        {back && <div className="mb-3">{back}</div>}
        <div className="rounded-xl border bg-background p-5 shadow-sm sm:p-6">
          <h1 className="text-xl font-semibold">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
          <div className="mt-5">{children}</div>
        </div>
      </main>
    </div>
  )
}

/** /auth/me를 기다리는 동안 보이는 자리표시자. */
export function PageSkeleton() {
  return (
    <div className="mx-auto max-w-sm px-4 pt-16" aria-busy="true" aria-label="불러오는 중">
      <div className="h-6 w-32 animate-pulse rounded bg-muted" />
      <div className="mt-6 h-40 animate-pulse rounded-xl bg-muted" />
    </div>
  )
}
