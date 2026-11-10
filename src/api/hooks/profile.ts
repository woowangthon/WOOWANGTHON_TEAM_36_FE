// 프로필 조회·저장 훅 (계획서 4.1, 7.2).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { components } from '@/api/schema.gen'

import { meKey, type Me } from './auth'
import { ApiError, apiRequest } from './request'

export type Profile = components['schemas']['Profile']
export type ProfileUpdate = components['schemas']['ProfileUpdate']

export const profileKey = ['profile'] as const

/** 본인 프로필. 아직 입력하지 않았으면 null. */
export function useProfile() {
  return useQuery({
    queryKey: profileKey,
    queryFn: async (): Promise<Profile | null> => {
      try {
        return await apiRequest<Profile>('/profile')
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null
        throw error
      }
    },
    retry: false,
  })
}

export function useSaveProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: ProfileUpdate) => apiRequest<Profile>('/profile', 'PUT', body),
    onSuccess: (saved) => {
      queryClient.setQueryData(profileKey, saved)
      queryClient.setQueryData<Me | null>(meKey, (me) =>
        me ? { ...me, profile_completed: true } : me,
      )
      // 프로필이 바뀌면 판정 결과가 달라집니다(5.3).
      return queryClient.invalidateQueries({ queryKey: ['scholarships'] })
    },
  })
}
