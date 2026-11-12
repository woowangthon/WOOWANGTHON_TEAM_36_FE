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

/**
 * 새로 생긴 응답 필드가 빠져 있어도 화면이 깨지지 않게 기본값을 채웁니다.
 * frontend(Vercel)가 backend(Cloud Run)보다 먼저 배포되면 잠시 예전 응답이 옵니다.
 * 2026-11-12에 open_conditions가 없는 응답 때문에 대시보드 전체가 깨졌습니다.
 * 기본값은 backend 스키마의 기본값과 같습니다. 새 필드를 화면에서 쓰기 시작하면 여기에도 추가합니다.
 */
function withSummaryDefaults<T extends ScholarshipSummary>(item: T): T {
  return {
    ...item,
    open_conditions: item.open_conditions ?? [],
    other_unknown: item.other_unknown ?? false,
  }
}

function withDetailDefaults(detail: ScholarshipDetail): ScholarshipDetail {
  return { ...withSummaryDefaults(detail), extra_checks: detail.extra_checks ?? [] }
}

/** 대시보드·내 장학금 목록. 판정 결과와 내 상태가 함께 옵니다(화면 하나에 API 한 번, 9.8). */
export function useScholarships(params: ListParams) {
  return useQuery({
    queryKey: listKey(params),
    queryFn: async () => {
      const data = await apiRequest<Schemas['ScholarshipListResponse']>(
        `/scholarships${toQueryString(params)}`,
      )
      return { ...data, items: (data.items ?? []).map(withSummaryDefaults) }
    },
    select: (data) => data.items,
  })
}

export function useScholarship(id: number) {
  return useQuery({
    queryKey: detailKey(id),
    queryFn: async () =>
      withDetailDefaults(await apiRequest<ScholarshipDetail>(`/scholarships/${id}`)),
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

export type ExtraCheck = Schemas['ExtraCheck']
export type OpenCondition = Schemas['OpenCondition']
export type ConditionAnswer = Schemas['ConditionAnswerRequest']['answer']
type AnswerResponse = Schemas['ConditionAnswerResponse']

/** 상태 아이콘을 누를 때마다 ? → ✓(YES) → ✗(NO) → ? 로 돌립니다 (계획서 5.3·7.1). */
export function nextAnswer(answer: ConditionAnswer | null | undefined): ConditionAnswer | null {
  if (answer === 'YES') return 'NO'
  if (answer === 'NO') return null
  return 'YES'
}

/**
 * 자격을 좁히는 조건(추가 조건) 1줄에 답합니다. answer=null이면 답을 지워 다시 '?'로 돌립니다.
 * 상세의 아이콘과 목록의 남은 조건을 먼저 바꾸고(optimistic update), 실패하면 되돌립니다(9.8).
 * 판정은 서버가 다시 계산하므로 응답의 result로 배지를 맞추고, 관련 쿼리를 무효화합니다.
 */
export function useSetConditionAnswer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      key,
      answer,
    }: {
      id: number
      key: string
      answer: ConditionAnswer | null
    }) =>
      answer === null
        ? apiRequest<AnswerResponse>(`/scholarships/${id}/conditions/${key}`, 'DELETE')
        : apiRequest<AnswerResponse>(`/scholarships/${id}/conditions/${key}`, 'PUT', { answer }),
    onMutate: async ({ id, key, answer }): Promise<{ snapshot: Snapshot }> => {
      await queryClient.cancelQueries({ queryKey: scholarshipsKey })
      const snapshot: Snapshot = queryClient.getQueriesData({ queryKey: scholarshipsKey })

      queryClient.setQueryData<ScholarshipDetail>(detailKey(id), (detail) =>
        detail
          ? {
              ...detail,
              extra_checks: detail.extra_checks.map((check) =>
                check.key === key ? { ...check, answer } : check,
              ),
            }
          : detail,
      )
      for (const [queryKey, data] of snapshot) {
        if (!isListKey(queryKey) || !data) continue
        const items = (data as ListData).items
        if (!items.some((item) => item.id === id)) continue
        queryClient.setQueryData<ListData>(queryKey, {
          items: items.map((item) =>
            item.id === id && answer !== null
              ? { ...item, open_conditions: item.open_conditions.filter((c) => c.key !== key) }
              : item,
          ),
        })
      }
      return { snapshot }
    },
    onSuccess: (response) => {
      queryClient.setQueryData<ScholarshipDetail>(detailKey(response.scholarship_id), (detail) =>
        detail ? { ...detail, result: response.result } : detail,
      )
    },
    onError: (_error, _variables, context) => {
      for (const [key, data] of context?.snapshot ?? []) queryClient.setQueryData(key, data)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: scholarshipsKey })
    },
  })
}
