/** count를 주면 이름 옆에 개수를 붙입니다 (대시보드 판정 탭). */
type Option<T extends string> = {
  readonly value: T
  readonly label: string
  readonly count?: number
}

/**
 * 밑줄 탭 묶음. 고른 탭은 굵은 글씨와 밑줄로, 개수는 작은 알약 모양으로 보여 줍니다.
 * 탭마다 아래 목록이 바뀌므로 tabpanel 대신 aria-selected만 씁니다.
 */
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
    <div role="tablist" aria-label={label} className="flex gap-5 border-b border-border sm:gap-7">
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(option.value)}
            className={`-mb-px inline-flex items-center gap-1.5 rounded-t-md border-b-2 px-0.5 pt-1 pb-3 text-[15px] whitespace-nowrap transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none sm:text-base ${selected ? 'border-foreground font-bold text-foreground' : 'border-transparent font-medium text-muted-foreground hover:text-foreground'}`}
          >
            {option.label}
            {option.count !== undefined && (
              <>
                {' '}
                <span
                  className={`inline-grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-xs font-semibold tabular-nums ${selected ? 'bg-brand-800 text-white' : 'bg-foreground/[0.07] text-muted-foreground'}`}
                >
                  {option.count}
                </span>
              </>
            )}
          </button>
        )
      })}
    </div>
  )
}
