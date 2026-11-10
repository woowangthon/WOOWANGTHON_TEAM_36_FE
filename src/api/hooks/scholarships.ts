// 장학금 목록·상세·내 상태 훅 (계획서 7.1, 7.2, 9.8).
import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query'

import type { components, operations } from '@/api/schema.gen'

import { apiRequest } from './request'

type Schemas = components['schemas']
export type ScholarshipSummary = Schemas['ScholarshipSummary']
export type ScholarshipDetail = Schemas['ScholarshipDetail']
export type ConditionCheck = Schemas['ConditionCheck']
export type UnreadAttachment = Schemas['UnreadAttachment']
export type UserState = Schemas['StateRequest']['state']
export type ListParams = NonNullable<
  operations['list_scholarships_scholarships_get']['parameters']['query']
>

export const scholarshipsKey = ['scholarships'] as const
const listKey = (params: ListParams) => [...scholarshipsKey, 'list', params] as const
const detailKey = (id: number) => [...scholarshipsKey, 'detail', id] as const

function toQueryString(params: ListParams): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) search.set(key, String(value))
  }
  const text = search.toString()
  return text ? `?${text}` : ''
}

/** 대시보드·내 장학금 목록. 판정 결과와 내 상태가 함께 옵니다(화면 하나에 API 한 번, 9.8). */
export function useScholarships(params: ListParams) {
  return useQuery({
    queryKey: listKey(params),
    queryFn: () =>
      apiRequest<Schemas['ScholarshipListResponse']>(`/scholarships${toQueryString(params)}`),
    select: (data) => data.items,
  })
}

export function useScholarship(id: number) {
  return useQuery({
    queryKey: detailKey(id),
    queryFn: () => apiRequest<ScholarshipDetail>(`/scholarships/${id}`),
    enabled: Number.isInteger(id) && id > 0,
    retry: false,
  })
}

type ListData = Schemas['ScholarshipListResponse']
type Snapshot = [QueryKey, unknown][]

function isListKey(key: QueryKey): key is ReturnType<typeof listKey> {
  return key[1] === 'list'
}

/** 상태를 바꾼 뒤 이 목록에 그 장학금이 남아 있어야 하는지 (backend 목록 규칙과 같게, 7.2). */
function staysInList(params: ListParams, state: UserState | null): boolean {
  if (params.state) return state === params.state.toUpperCase()
  return true
}

/**
 * 관심·신청완료. state=null이면 지웁니다.
 * 서버 응답을 기다리지 않고 캐시를 먼저 바꾸고(optimistic update), 실패하면 되돌립니다(9.8).
 */
export function useSetScholarshipState() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, state }: { id: number; state: UserState | null }) => {
      if (state === null) await apiRequest<void>(`/scholarships/${id}/state`, 'DELETE')
      else await apiRequest<Schemas['StateResponse']>(`/scholarships/${id}/state`, 'PUT', { state })
    },
    onMutate: async ({ id, state }): Promise<{ snapshot: Snapshot }> => {
      await queryClient.cancelQueries({ queryKey: scholarshipsKey })
      const snapshot: Snapshot = queryClient.getQueriesData({ queryKey: scholarshipsKey })

      queryClient.setQueryData<ScholarshipDetail>(detailKey(id), (detail) =>
        detail ? { ...detail, my_state: state } : detail,
      )
      for (const [key, data] of snapshot) {
        if (!isListKey(key) || !data) continue
        const params = key[2]
        const items = (data as ListData).items
        if (!items.some((item) => item.id === id)) continue
        queryClient.setQueryData<ListData>(key, {
          items: staysInList(params, state)
            ? items.map((item) => (item.id === id ? { ...item, my_state: state } : item))
            : items.filter((item) => item.id !== id),
        })
      }
      return { snapshot }
    },
    onError: (_error, _variables, context) => {
      for (const [key, data] of context?.snapshot ?? []) queryClient.setQueryData(key, data)
    },
    // 다른 목록(예: 내 장학금에 새로 들어갈 항목)은 서버 기준으로 다시 맞춥니다. 관련 쿼리만 무효화합니다.
    // 다시 불러오기를 기다리지 않아야 실패 안내가 바로 보입니다.
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: scholarshipsKey })
    },
  })
}
