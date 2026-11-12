// 메일의 수신 거부 링크 화면 (계획서 7.4, T36). 로그인 없이 열립니다.
// 메일 보안 검사기가 링크를 미리 열 수 있으므로, 화면을 여는 것만으로는 끄지 않고 버튼을 눌러야 끕니다.
import { useSearchParams } from 'react-router'

import { useUnsubscribe } from '@/api/hooks/auth'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { FormError } from '@/components/form/Field'
import { Button } from '@/components/ui/button'

export default function UnsubscribePage() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const unsubscribe = useUnsubscribe()

  return (
    <AuthLayout title="알림 메일 수신 거부">
      {!token ? (
        <p role="alert" className="text-sm">
          링크가 올바르지 않아요. 메일의 링크를 다시 눌러 주세요
        </p>
      ) : unsubscribe.isSuccess ? (
        <div role="status" className="grid gap-1.5 text-sm">
          <p className="font-medium">알림 메일을 껐어요</p>
          <p className="text-muted-foreground">다시 받으려면 로그인 후 내 정보에서 켤 수 있어요</p>
        </div>
      ) : (
        <div className="grid gap-4">
          <p className="text-sm text-muted-foreground">
            버튼을 누르면 장학금 알림 메일을 더 이상 보내지 않아요.
          </p>
          <FormError message={unsubscribe.error?.message} />
          <Button
            size="lg"
            disabled={unsubscribe.isPending}
            onClick={() => unsubscribe.mutate({ token })}
          >
            {unsubscribe.isPending ? '끄는 중…' : '알림 메일 끄기'}
          </Button>
        </div>
      )}
    </AuthLayout>
  )
}
