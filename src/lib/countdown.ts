import { useEffect, useState } from 'react'

/** 1초마다 바뀌는 현재 시각 (남은 시간·다시 받기 표시용). sync()로 바로 맞춥니다. */
export function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [active])
  return [now, () => setNow(Date.now())] as const
}

export function formatSeconds(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}
