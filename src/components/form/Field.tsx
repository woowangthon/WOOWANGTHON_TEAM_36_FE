import { Label } from '@/components/ui/input'

type Props = {
  id: string
  label: string
  labelAction?: React.ReactNode
  error?: string
  hint?: string
  optional?: boolean
  children: React.ReactNode
}

/** 라벨 + 입력 + 안내/오류 문장. 오류는 aria-describedby로 입력과 연결합니다. */
export function Field({ id, label, labelAction, error, hint, optional, children }: Props) {
  const fieldLabel = (
    <Label htmlFor={id}>
      {label}
      {optional && <span className="ml-1 font-normal text-muted-foreground">(선택)</span>}
    </Label>
  )

  return (
    <div className="grid content-start gap-1.5">
      {/* 제목 줄 높이를 도움말 아이콘(24px) 높이로 고정해, 아이콘이 있는 칸과 없는 칸의 입력창 줄을 맞춥니다 (T68). */}
      <div className="flex min-h-6 items-center gap-1">
        {fieldLabel}
        {labelAction}
      </div>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  )
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null
  return (
    <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {message}
    </p>
  )
}
