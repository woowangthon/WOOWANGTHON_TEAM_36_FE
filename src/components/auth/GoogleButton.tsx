import { googleLoginUrl } from '@/api/hooks/auth'
import { Button } from '@/components/ui/button'

/** Google 로그인은 fetch가 아니라 페이지 이동입니다(backend가 PKCE·state를 처리, 7.3). */
export function GoogleButton({ next }: { next: string | null }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className="w-full"
      onClick={() => window.location.assign(googleLoginUrl(next))}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
        <path
          fill="#4285F4"
          d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7Z"
        />
        <path
          fill="#34A853"
          d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z"
        />
        <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z" />
        <path
          fill="#EA4335"
          d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9Z"
        />
      </svg>
      Google로 계속하기
    </Button>
  )
}

export function OrDivider() {
  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <span className="h-px flex-1 bg-border" />
      또는
      <span className="h-px flex-1 bg-border" />
    </div>
  )
}
