// 새 비밀번호 칸 아래 형식 안내 (T38). 입력하는 동안 충족한 항목에 ✓를 붙입니다.
import { Check } from 'lucide-react'

import { PASSWORD_RULES } from '@/lib/password'

export function PasswordRules({ value }: { value: string }) {
  return (
    <ul aria-label="비밀번호 규칙" className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(value)
        return (
          <li
            key={rule.key}
            data-met={met}
            className={`flex items-center gap-1 ${met ? 'text-brand-700' : 'text-muted-foreground'}`}
          >
            <Check aria-hidden="true" className={`size-3.5 ${met ? '' : 'opacity-30'}`} />
            {rule.label}
          </li>
        )
      })}
    </ul>
  )
}
