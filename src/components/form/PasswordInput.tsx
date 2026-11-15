// 비밀번호 입력 칸 + 보기/숨기기 버튼 (T38). 로그인·가입·비밀번호 변경의 모든 비밀번호 칸에 씁니다.
import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'

import { Input } from '@/components/ui/input'

export function PasswordInput(props: Omit<React.ComponentProps<'input'>, 'type'>) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <Input {...props} type={visible ? 'text' : 'password'} className="pr-11" />
      <button
        type="button"
        aria-label={visible ? '비밀번호 숨기기' : '비밀번호 보기'}
        aria-pressed={visible}
        disabled={props.disabled}
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-50"
      >
        {visible ? (
          <EyeOff aria-hidden="true" className="size-4" />
        ) : (
          <Eye aria-hidden="true" className="size-4" />
        )}
      </button>
    </div>
  )
}
