import * as React from 'react'
import { cn } from 'cn'

// shadcn/ui Input을 바탕으로 높이를 키운 모양(손가락으로 누르기 쉬운 44px). select·checkbox도 같은 테두리를 씁니다.
// 휴대폰에서는 16px 글씨를 써서, iOS가 입력 칸을 누를 때 화면을 확대하지 않게 합니다.
const fieldClass =
  'h-11 w-full min-w-0 rounded-xl border border-input bg-background px-3.5 text-base transition-colors outline-none sm:text-sm placeholder:text-muted-foreground/70 hover:border-foreground/25 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30'

function Input({ className, ...props }: React.ComponentProps<'input'>) {
  return <input data-slot="input" className={cn(fieldClass, className)} {...props} />
}

function NativeSelect({ className, ...props }: React.ComponentProps<'select'>) {
  return (
    <select
      data-slot="native-select"
      className={cn(fieldClass, 'select-chevron cursor-pointer truncate pr-9', className)}
      {...props}
    />
  )
}

function Checkbox({ className, ...props }: Omit<React.ComponentProps<'input'>, 'type'>) {
  return (
    <input
      type="checkbox"
      data-slot="checkbox"
      className={cn(
        'size-[1.125rem] shrink-0 cursor-pointer rounded accent-primary disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

function Label({ className, ...props }: React.ComponentProps<'label'>) {
  return (
    <label
      data-slot="label"
      className={cn('text-sm leading-none font-medium select-none', className)}
      {...props}
    />
  )
}

export { Checkbox, Input, Label, NativeSelect }
