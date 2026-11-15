import { Dialog } from 'radix-ui'
import { useState } from 'react'

import { useConsent } from '@/api/hooks/auth'
import { SensitiveConsentDetail } from '@/components/auth/SensitiveConsentDetail'
import { FormError } from '@/components/form/Field'
import { Button } from '@/components/ui/button'

/**
 * 프로필 화면 안에서 민감정보 동의를 받는 창 (4.2).
 * 동의 화면으로 이동하면 입력하던 프로필 폼이 사라지므로, 화면을 떠나지 않고 이 창에서 동의합니다.
 * 프로필 화면에 들어왔다면 개인정보(필수)는 이미 동의한 상태라 privacy는 true로 보냅니다.
 */
export function SensitiveConsentDialog({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const consent = useConsent()

  const changeOpen = (next: boolean) => {
    if (!next) consent.reset()
    setOpen(next)
  }

  return (
    <Dialog.Root open={open} onOpenChange={changeOpen}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 grid w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 gap-2 rounded-2xl border border-border bg-white p-6 shadow-lift">
          <Dialog.Title className="text-lg font-bold tracking-tight">
            민감정보 수집·이용 동의 (선택)
          </Dialog.Title>
          <Dialog.Description className="text-sm text-muted-foreground">
            동의하면 특수자격을 입력할 수 있습니다. 입력하던 내용은 그대로 남습니다.
          </Dialog.Description>
          <SensitiveConsentDetail className="mt-1 grid gap-1.5 rounded-xl bg-muted/50 p-4 text-[13px] leading-relaxed break-keep text-muted-foreground" />
          <FormError message={consent.error?.message} />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Dialog.Close asChild>
              <Button variant="outline">취소</Button>
            </Dialog.Close>
            <Button
              disabled={consent.isPending}
              onClick={() =>
                consent.mutate(
                  { privacy: true, sensitive: true },
                  { onSuccess: () => setOpen(false) },
                )
              }
            >
              {consent.isPending ? '저장 중…' : '동의'}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
