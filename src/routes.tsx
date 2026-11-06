import type { RouteObject } from 'react-router'

import { GuestOnly, RequireAuth, RootRedirect } from '@/components/auth/RouteGuard'
import { AppLayout } from '@/components/layout/AppLayout'
import AdminPage from '@/pages/AdminPage'
import ConsentPage from '@/pages/ConsentPage'
import DashboardPage from '@/pages/DashboardPage'
import DetailPage from '@/pages/DetailPage'
import LoginPage from '@/pages/LoginPage'
import MyListPage from '@/pages/MyListPage'
import NotFoundPage from '@/pages/NotFoundPage'
import PrivacyPage from '@/pages/PrivacyPage'
import ProfilePage from '@/pages/ProfilePage'
import SignupPage from '@/pages/SignupPage'

// 라우팅 가드(frontend CLAUDE.md): 비로그인 → /login, 동의 전 → /consent, 프로필 미입력 → /profile.
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
    children: [
      { path: '/consent', element: <ConsentPage /> },
      // 관리자 화면은 로그인만 확인하고, 관리자가 아니면 페이지 안에서 대시보드로 보냅니다(7.3).
      { element: <AppLayout />, children: [{ path: '/admin', element: <AdminPage /> }] },
    ],
  },
  {
    element: <RequireAuth requirement="consent" />,
    children: [{ path: '/profile', element: <ProfilePage /> }],
  },
  {
    element: <RequireAuth requirement="profile" />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/scholarships/:id', element: <DetailPage /> },
          { path: '/my', element: <MyListPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]
