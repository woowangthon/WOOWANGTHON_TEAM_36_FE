// 관리자 화면 훅 (계획서 7.1 관리자, 7.2 /admin/*, 9.3).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { components } from '@/api/schema.gen'

import { apiRequest } from './request'

type Schemas = components['schemas']
export type AdminOverview = Schemas['CrawlRunsResponse']
export type CrawlRun = Schemas['CrawlRunOut']
export type AdminNotice = Schemas['AdminNotice']

export const adminKey = ['admin'] as const

/** 수집 기록과 재추출 대상 공지를 한 번에 불러옵니다(화면 하나에 API 한 번, 9.8). */
export function useAdminOverview() {
  return useQuery({
    queryKey: adminKey,
    queryFn: () => apiRequest<AdminOverview>('/admin/crawl-runs'),
    retry: false,
  })
}

/**
 * 재추출 요청. 서버는 추출하지 않고 PENDING으로만 바꾸므로(9.3), 응답이 오면 그 공지만
 * "재추출 대기"로 바꿉니다. 실제 추출은 다음 정기 수집 때 일어납니다.
 */
export function useReextract() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (noticeId: number) =>
      apiRequest<Schemas['ReextractResponse']>(`/admin/notices/${noticeId}/reextract`, 'POST'),
    onSuccess: ({ notice_id, extract_status }) => {
      queryClient.setQueryData<AdminOverview>(adminKey, (data) =>
        data
          ? {
              ...data,
              notices: data.notices.map((notice) =>
                notice.id === notice_id ? { ...notice, extract_status } : notice,
              ),
            }
          : data,
      )
    },
  })
}
