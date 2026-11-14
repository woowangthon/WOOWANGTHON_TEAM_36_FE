// 장학금 목록·상세·내 상태 훅 (계획서 7.1, 7.2, 9.8).
import {
  useIsMutating,
  useMutation,
  useMutationState,
  useQuery,
  useQueryClient,
  type QueryKey,
} from '@tanstack/react-query'

import type { components, operations } from '@/api/schema.gen'

import { meKey, type Me } from './auth'
import { apiRequest } from './request'

type Schemas = components['schemas']
export type ScholarshipSummary = Schemas['ScholarshipSummary']
export type ScholarshipDetail = Schemas['ScholarshipDetail']
export type ConditionCheck = Schemas['ConditionCheck']
export type UnreadAttachment = Schemas['UnreadAttachment']
/** 관심·신청완료 중 바꿀 값. 보낸 칸만 바뀌고 나머지는 그대로입니다 (7.2). */
export type StateChange = Schemas['StateRequest']
export type ListParams = NonNullable<
  operations['list_scholarships_scholarships_get']['parameters']['query']
>

type ListData = Schemas['ScholarshipListResponse']
type ListResponse = Omit<ListData, 'items'> & {
  items: (Omit<ScholarshipSummary, 'open_conditions'> & {
    open_conditions?: ScholarshipSummary['open_conditions'] | null
  })[]
}

export const scholarshipsKey = ['scholarships'] as const
const listKey = (params: ListParams) => [...scholarshipsKey, 'list', params] as const
const detailKey = (id: number) => [...scholarshipsKey, 'detail', id] as const
const stateWriteKey = ['scholarship-state'] as const
const stateWriteKeyFor = (id: number) => [...stateWriteKey, id] as const
type StateWrite = { id: number } & StateChange
type StateFlags = Pick<ScholarshipSummary, 'bookmarked' | 'applied'>

/** 보낸 칸만 덮어씁니다. 관심과 신청완료는 서로 영향을 주지 않습니다. */
function withChange<T extends StateFlags>(item: T, { bookmarked, applied }: StateChange): T {
  return {
    ...item,
    bookmarked: bookmarked ?? item.bookmarked,
    applied: applied ?? item.applied,
  }
}

function usePendingStates() {
  return useMutationState({
    filters: { mutationKey: stateWriteKey, status: 'pending' },
    select: (mutation) => mutation.state.variables as StateWrite,
  })
}

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
  const pending = usePendingStates()
  const query = useQuery({
    queryKey: listKey(params),
    queryFn: async (): Promise<ListData> => {
      const response = await apiRequest<ListResponse>(`/scholarships${toQueryString(params)}`)
      return {
        ...response,
        items: response.items.map((item) => ({
          ...item,
          open_conditions: item.open_conditions ?? [],
        })),
      }
    },
    select: (data) => data.items,
  })
  const data = pending.reduce(
    (items, write) => (items ? applyStateToList(items, params, write) : items),
    query.data,
  )
  return { ...query, data }
}

export function useScholarship(id: number) {
  const pending = usePendingStates().filter((write) => write.id === id)
  const query = useQuery({
    queryKey: detailKey(id),
    queryFn: () => apiRequest<ScholarshipDetail>(`/scholarships/${id}`),
    enabled: Number.isInteger(id) && id > 0,
    retry: false,
  })
  return {
    ...query,
    data:
      query.data &&
      pending.reduce<ScholarshipDetail>((detail, write) => withChange(detail, write), query.data),
  }
}

type Snapshot = [QueryKey, unknown][]

function isListKey(key: QueryKey): key is ReturnType<typeof listKey> {
  return key[1] === 'list'
}

/**
 * 목록에 변경을 반영합니다. 내 장학금 목록(state)은 그 표시가 꺼진 장학금만 뺍니다
 * (backend 목록 규칙과 같게, 7.2). 예: 신청완료 목록에서 관심을 꺼도 그 줄은 남습니다.
 */
function applyStateToList(items: ScholarshipSummary[], params: ListParams, write: StateWrite) {
  const shown = params.state
  return items
    .map((item) => (item.id === write.id ? withChange(item, write) : item))
    .filter((item) => item.id !== write.id || !shown || item[shown])
}

/**
 * 관심·신청완료를 따로 켜고 끕니다. 예: `{ id, bookmarked: true }`, `{ id, applied: false }`.
 * 진행 중인 변경은 화면에 바로 반영하고, 서버가 확인한 상태만 캐시에 기록합니다(9.8).
 */
export function useSetScholarshipState(id: number) {
  const queryClient = useQueryClient()
  const mutationKey = stateWriteKeyFor(id)
  const isPending = useIsMutating({ mutationKey, exact: true }) > 0
  const mutation = useMutation({
    mutationKey,
    mutationFn: async ({ id, ...change }: StateWrite): Promise<StateFlags> => {
      const { bookmarked, applied } = await apiRequest<Schemas['StateResponse']>(
        `/scholarships/${id}/state`,
        'PUT',
        change satisfies StateChange,
      )
      return { bookmarked, applied }
    },
    onMutate: () => queryClient.getQueryData<Me | null>(meKey)?.id,
    onSuccess: async (saved, { id }, userId) => {
      if (userId !== queryClient.getQueryData<Me | null>(meKey)?.id) return
      // 진행 중인 조회가 저장 전의 값으로 캐시를 덮지 않게 합니다.
      await queryClient.cancelQueries({ queryKey: scholarshipsKey })
      if (userId !== queryClient.getQueryData<Me | null>(meKey)?.id) return
      queryClient.setQueryData<ScholarshipDetail>(detailKey(id), (detail) =>
        detail ? withChange(detail, saved) : detail,
      )
      for (const [key, data] of queryClient.getQueriesData<ListData>({
        queryKey: scholarshipsKey,
      })) {
        if (!isListKey(key) || !data) continue
        if (!data.items.some((item) => item.id === id)) continue
        queryClient.setQueryData<ListData>(key, {
          ...data,
          items: applyStateToList(data.items, key[2], { id, ...saved }),
        })
      }
    },
    onSettled: (_data, _error, _variables, userId) => {
      if (userId !== queryClient.getQueryData<Me | null>(meKey)?.id) return
      // 재조회 중에도 다른 저장의 진행 상태는 각 항목에 그대로 표시됩니다.
      void queryClient.invalidateQueries({ queryKey: scholarshipsKey })
    },
  })
  return { ...mutation, isPending }
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
