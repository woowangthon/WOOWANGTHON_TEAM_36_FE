import { createQueryClient, STALE_TIME_MS } from '@/lib/queryClient'

it('기본 staleTime은 5분이다 (계획서 9.8)', () => {
  const client = createQueryClient()
  expect(STALE_TIME_MS).toBe(300_000)
  expect(client.getDefaultOptions().queries?.staleTime).toBe(STALE_TIME_MS)
})
