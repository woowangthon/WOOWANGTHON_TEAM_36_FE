const SOURCES = ['소프트웨어학부', 'AI부트캠프사업단', '한국장학재단'] as const

/**
 * 서비스 대상(충북대 소프트웨어학부 재학생)과 공지를 모으는 출처 3곳 (T42).
 * 안내만 하고 가입 제한은 두지 않습니다(계획서 1장).
 */
export function TargetNotice() {
  return (
    <div className="grid gap-2 rounded-xl bg-canvas px-4 py-3.5 text-sm">
      <p className="font-semibold break-keep">충북대 소프트웨어학부 재학생을 위한 장학금 매칭</p>
      <p className="text-[13px] break-keep text-muted-foreground">
        아래 세 곳의 장학 공지를 모아 내 조건과 비교해 드려요.
      </p>
      <ul className="mt-0.5 flex flex-wrap gap-1.5" aria-label="공지 수집 출처">
        {SOURCES.map((source) => (
          <li
            key={source}
            className="rounded-full border border-border bg-white px-2.5 py-0.5 text-xs font-medium"
          >
            {source}
          </li>
        ))}
      </ul>
    </div>
  )
}
