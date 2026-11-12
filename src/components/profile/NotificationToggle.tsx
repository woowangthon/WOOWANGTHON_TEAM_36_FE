// 알림 메일 수신 토글 (계획서 7.4, T36). 내 정보(프로필 수정) 화면 계정 영역에 둡니다.
import { useSetNotifications, type Me } from '@/api/hooks/auth'
import { FormError } from '@/components/form/Field'

export function NotificationToggle({ me }: { me: Me }) {
  const setNotifications = useSetNotifications()
  const on = me.email_notifications ?? true
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <span id="notification-label" className="text-sm font-medium">
          장학금 알림 메일 받기
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-labelledby="notification-label"
          aria-describedby="notification-help"
          onClick={() => setNotifications.mutate({ email_notifications: !on })}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none ${on ? 'bg-primary' : 'bg-input'}`}
        >
          <span
            aria-hidden="true"
            className={`inline-block size-5 rounded-full bg-background shadow transition-transform ${on ? 'translate-x-5' : 'translate-x-0.5'}`}
          />
        </button>
      </div>
      <p id="notification-help" className="text-xs text-muted-foreground">
        새 맞춤 장학금과 관심 장학금 마감 3일·1일 전에 하루 한 번 메일로 알려 드려요
      </p>
      <FormError message={setNotifications.error?.message} />
    </div>
  )
}
