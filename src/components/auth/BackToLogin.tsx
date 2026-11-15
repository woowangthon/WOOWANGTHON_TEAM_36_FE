import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router'

import { useLogout } from '@/api/hooks/auth'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

const className =
  'inline-flex w-fit items-center gap-1 rounded-md text-sm text-muted-foreground hover:text-brand-800 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-50'

/**
 * 가입 도중(동의 전·프로필 첫 입력) 화면의 이전 버튼. 이 단계에서는 가드가 같은 화면으로 다시 보내므로
 * 로그아웃하고 로그인 화면으로 갑니다. `dirty`면 입력한 값이 사라진다고 먼저 묻습니다.
 */
export function BackToLogin({ dirty = false }: { dirty?: boolean }) {
  const navigate = useNavigate()
  const logout = useLogout()
  const leave = () =>
    logout.mutate(undefined, { onSuccess: () => navigate('/login', { replace: true }) })
  const trigger = (
    <button
      type="button"
      className={className}
      disabled={logout.isPending}
      onClick={dirty ? undefined : leave}
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      로그인 화면으로
    </button>
  )
  if (!dirty) return trigger
  return (
    <ConfirmDialog
      trigger={trigger}
      title="저장하지 않고 나갈까요?"
      description="입력한 내용은 저장되지 않습니다. 다시 로그인하면 이어서 입력할 수 있어요."
      confirmLabel="나가기"
      pending={logout.isPending}
      onConfirm={leave}
    />
  )
}
