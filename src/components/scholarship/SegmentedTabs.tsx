type Option<T extends string> = { readonly value: T; readonly label: string }

/** 탭 버튼 묶음. 목록 아래 내용은 탭마다 다시 불러오므로 tabpanel 대신 aria-selected만 씁니다. */
export function SegmentedTabs<T extends string>({
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
    <div
      role="tablist"
      aria-label={label}
      className="grid auto-cols-fr grid-flow-col rounded-lg bg-muted p-1"
    >
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(option.value)}
            className={`rounded-md px-2 py-1.5 text-sm transition-colors ${selected ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
