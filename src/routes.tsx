import type { RouteObject } from 'react-router'

import { GuestOnly, RequireAuth, RootRedirect } from '@/components/auth/RouteGuard'
import ConsentPage from '@/pages/ConsentPage'
import HomePage from '@/pages/HomePage'
import LoginPage from '@/pages/LoginPage'
import NotFoundPage from '@/pages/NotFoundPage'
import PrivacyPage from '@/pages/PrivacyPage'
import ProfilePage from '@/pages/ProfilePage'
import SignupPage from '@/pages/SignupPage'

// 라우팅 가드(frontend CLAUDE.md): 비로그인 → /login, 동의 전 → /consent, 프로필 미입력 → /profile.
// 대시보드·상세·내 장학금 화면은 T25에서 /dashboard 자리에 넣습니다.
export const routes: RouteObject[] = [
  { path: '/', element: <RootRedirect /> },
  { path: '/privacy', element: <PrivacyPage /> },
  {
    element: <GuestOnly />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/signup', element: <SignupPage /> },
    ],
  },
  {
    element: <RequireAuth requirement="login" />,
    children: [{ path: '/consent', element: <ConsentPage /> }],
  },
  {
    element: <RequireAuth requirement="consent" />,
    children: [{ path: '/profile', element: <ProfilePage /> }],
  },
  {
    element: <RequireAuth requirement="profile" />,
    children: [{ path: '/dashboard', element: <HomePage /> }],
  },
  { path: '*', element: <NotFoundPage /> },
]
