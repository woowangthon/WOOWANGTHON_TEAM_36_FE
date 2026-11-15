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
    <div className="min-h-svh bg-canvas">
      {/* 로그인 뒤 화면(AppLayout)과 같은 흰 상단 바 */}
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center px-4">
          <Link to="/" aria-label="장학금 매칭 (홈)" className="flex items-center">
            <img
              src="/logo-woowangdon.png"
              alt="우왕돈이다"
              width={679}
              height={197}
              className="h-8 w-auto sm:h-9"
            />
          </Link>
        </div>
      </header>
      <main className={`mx-auto px-4 pt-6 pb-16 sm:pt-10 ${wide ? 'max-w-2xl' : 'max-w-[26rem]'}`}>
        {back && <div className="mb-4">{back}</div>}
        <div className="surface p-5 sm:p-8">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="mt-1.5 text-sm break-keep text-muted-foreground">{description}</p>
          )}
          <div className="mt-6">{children}</div>
        </div>
      </main>
    </div>
  )
}

/** /auth/me를 기다리는 동안 보이는 자리표시자. */
export function PageSkeleton() {
  return (
    <div className="min-h-svh bg-canvas" aria-busy="true" aria-label="불러오는 중">
      <div className="mx-auto max-w-[26rem] px-4 pt-24">
        <div className="h-7 w-32 animate-pulse rounded-lg bg-foreground/[0.06]" />
        <div className="mt-6 h-56 animate-pulse rounded-2xl bg-foreground/[0.06]" />
      </div>
    </div>
  )
}
