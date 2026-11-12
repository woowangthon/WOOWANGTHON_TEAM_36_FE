// 인증·동의·탈퇴 훅 (계획서 7.2, 7.3, 4.2). 라우팅 가드는 useMe 결과로 이동할 화면을 정합니다.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { components } from '@/api/schema.gen'

import { ApiError, apiRequest } from './request'

type Schemas = components['schemas']
export type Me = Schemas['MeResponse']

export const meKey = ['me'] as const

/** 로그인 사용자. 로그인하지 않았으면 null. */
export function useMe() {
  return useQuery({
    queryKey: meKey,
    queryFn: async (): Promise<Me | null> => {
      try {
        return await apiRequest<Me>('/auth/me')
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null
        throw error
      }
    },
    retry: false,
  })
}

/** 로그인 상태에 따라 가야 할 화면 (frontend CLAUDE.md 라우팅 가드). */
export function nextPathFor(me: Me | null | undefined): string {
  if (!me) return '/login'
  if (!me.privacy_agreed) return '/consent'
  if (!me.profile_completed) return '/profile'
  return '/dashboard'
}

/** 로그인 후 돌아갈 주소는 내부 경로만 허용합니다(오픈 리다이렉트 방지, 7.3). */
export function safeNext(next: string | null): string | null {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return null
  return next
}

export function googleLoginUrl(next: string | null): string {
  const target = safeNext(next)
  return target
    ? `/api/auth/google/login?next=${encodeURIComponent(target)}`
    : '/api/auth/google/login'
}

function useSetMe() {
  const queryClient = useQueryClient()
  return (me: Me) => queryClient.setQueryData(meKey, me)
}

/** 가입 1단계: 인증번호 메일 받기 (7.3). 이미 가입된 이메일은 409. */
export function useSignupCode() {
  return useMutation({
    mutationFn: (body: Schemas['SignupCodeRequest']) =>
      apiRequest<Schemas['SignupCodeResponse']>('/auth/signup/code', 'POST', body),
  })
}

/** 가입 2단계: 메일로 받은 6자리 번호 확인 → signup_token. */
export function useSignupVerify() {
  return useMutation({
    mutationFn: (body: Schemas['SignupVerifyRequest']) =>
      apiRequest<Schemas['SignupVerifyResponse']>('/auth/signup/verify', 'POST', body),
  })
}

/** 가입 3단계: 인증된 이메일(signup_token)과 비밀번호로 계정 만들기. */
export function useSignup() {
  const setMe = useSetMe()
  return useMutation({
    mutationFn: (body: Schemas['SignupRequest']) => apiRequest<Me>('/auth/signup', 'POST', body),
    onSuccess: setMe,
  })
}

export function useLogin() {
  const setMe = useSetMe()
  return useMutation({
    mutationFn: (body: Schemas['LoginRequest']) => apiRequest<Me>('/auth/login', 'POST', body),
    onSuccess: setMe,
  })
}

export function useConsent() {
  const setMe = useSetMe()
  return useMutation({
    mutationFn: (body: Schemas['ConsentRequest']) => apiRequest<Me>('/auth/consent', 'POST', body),
    onSuccess: setMe,
  })
}

/** 민감정보 동의 철회: backend가 특수자격 값을 즉시 지웁니다(4.2). */
export function useWithdrawSensitive() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => apiRequest<void>('/auth/consent/sensitive', 'DELETE'),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: meKey }),
        queryClient.invalidateQueries({ queryKey: ['profile'] }),
      ]),
  })
}

/**
 * 알림 메일 수신 켜기·끄기 (7.4). 화면에 먼저 반영하고(optimistic), 실패하면 되돌립니다(9.8).
 */
export function useSetNotifications() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: Schemas['NotificationSettingRequest']) =>
      apiRequest<Me>('/auth/me/notifications', 'PUT', body),
    onMutate: async (body) => {
      await queryClient.cancelQueries({ queryKey: meKey })
      const previous = queryClient.getQueryData<Me | null>(meKey)
      if (previous) queryClient.setQueryData(meKey, { ...previous, ...body })
      return { previous }
    },
    onError: (_error, _body, context) => {
      if (context?.previous) queryClient.setQueryData(meKey, context.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: meKey }),
  })
}

/** 메일의 수신 거부 링크 (7.4). 로그인 없이 서명된 토큰으로 끕니다. */
export function useUnsubscribe() {
  return useMutation({
    mutationFn: (body: Schemas['UnsubscribeRequest']) =>
      apiRequest<void>('/notifications/unsubscribe', 'POST', body),
  })
}

/** 로그아웃·탈퇴 뒤에는 이전 사용자의 캐시를 모두 지웁니다. */
function useClearSession() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.clear()
    queryClient.setQueryData(meKey, null)
  }
}

export function useLogout() {
  const clear = useClearSession()
  return useMutation({
    mutationFn: () => apiRequest<void>('/auth/logout', 'POST'),
    onSuccess: clear,
  })
}

export function useDeleteAccount() {
  const clear = useClearSession()
  return useMutation({
    mutationFn: () => apiRequest<void>('/auth/me', 'DELETE'),
    onSuccess: clear,
  })
}

/** 비밀번호 변경 (7.3, T38). backend가 이 기기에 새 쿠키를 주므로 로그인은 그대로입니다. */
export function useChangePassword() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: Schemas['PasswordChangeRequest']) =>
      apiRequest<void>('/auth/me/password', 'PUT', body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: meKey }),
  })
}
