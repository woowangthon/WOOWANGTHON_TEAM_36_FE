type Option<T extends string> = { readonly value: T; readonly label: string }

/**
 * 제목이 보이는 버튼형 필터 한 줄 (T39). 드롭다운과 달리 고를 수 있는 값이 한눈에 보입니다.
 * 하나만 고를 수 있고, 고른 칩은 aria-pressed로 알립니다.
 */
export function FilterChips<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: readonly Option<T>[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span aria-hidden="true" className="w-16 shrink-0 text-sm font-medium text-brand-900">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const selected = option.value === value
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              className={`rounded-full border px-3 py-1 text-sm transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none ${selected ? 'border-brand-400 bg-brand-100 font-medium text-brand-900' : 'border-brand-200 bg-background text-muted-foreground hover:border-brand-400 hover:text-foreground'}`}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
