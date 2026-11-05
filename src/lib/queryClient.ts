import { QueryClient } from '@tanstack/react-query'

// 데이터가 1시간마다 바뀌므로 화면을 다시 열 때 다시 요청하지 않습니다(계획서 9.8).
export const STALE_TIME_MS = 5 * 60 * 1000

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: STALE_TIME_MS },
    },
  })
}
