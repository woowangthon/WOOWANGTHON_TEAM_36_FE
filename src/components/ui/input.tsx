import * as React from 'react'
import { cn } from 'cn'

// shadcn/ui Input과 같은 모양. 브라우저 기본 select·checkbox도 같은 테두리를 씁니다.
const fieldClass =
  'h-9 w-full min-w-0 rounded-lg border border-input bg-transparent px-3 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30'

function Input({ className, ...props }: React.ComponentProps<'input'>) {
  return <input data-slot="input" className={cn(fieldClass, className)} {...props} />
}

function NativeSelect({ className, ...props }: React.ComponentProps<'select'>) {
  return (
    <select
      data-slot="native-select"
      className={cn(fieldClass, 'appearance-auto pr-2', className)}
      {...props}
    />
  )
}

function Checkbox({ className, ...props }: Omit<React.ComponentProps<'input'>, 'type'>) {
  return (
    <input
      type="checkbox"
      data-slot="checkbox"
      className={cn('size-4 shrink-0 accent-primary disabled:opacity-50', className)}
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
