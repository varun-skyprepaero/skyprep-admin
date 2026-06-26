import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AdminShellLayout } from '@/components/layout/admin-shell-layout'
import { AuthLayout } from '@/components/layout/auth-layout'
import { GuestRoute } from '@/routes/guest-route'
import { ProtectedRoute } from '@/routes/protected-route'
import { lazyWithRetry } from '@/lib/lazy-with-retry'
import { RouteErrorFallback } from '@/routes/route-error-fallback'
import { SuspensePage } from '@/routes/lazy-boundary'

const DashboardPage = lazyWithRetry(() => import('@/features/dashboard/DashboardPage'))
const LoginPage = lazyWithRetry(() => import('@/features/auth/pages/LoginPage'))
const RegisterPage = lazyWithRetry(() => import('@/features/auth/pages/RegisterPage'))
const UsersPage = lazyWithRetry(() => import('@/features/users/pages/UsersPage'))
const TestsLayout = lazyWithRetry(() => import('@/features/tests/TestsLayout'))
const TestsSubjectsPage = lazyWithRetry(() => import('@/features/tests/pages/SubjectsPage'))
const TestsBooksPage = lazyWithRetry(() => import('@/features/tests/pages/BooksPage'))
const TestsQuestionsPage = lazyWithRetry(() => import('@/features/tests/pages/QuestionsPage'))
const TestsSuitesPage = lazyWithRetry(() => import('@/features/tests/pages/SuitesPage'))
const TestsPackagesPage = lazyWithRetry(() => import('@/features/tests/pages/PackagesPage'))

export const router = createBrowserRouter([
  {
    element: <GuestRoute />,
    errorElement: <RouteErrorFallback />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          {
            path: '/login',
            element: (
              <SuspensePage>
                <LoginPage />
              </SuspensePage>
            ),
          },
          {
            path: '/register',
            element: (
              <SuspensePage>
                <RegisterPage />
              </SuspensePage>
            ),
          },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute />,
    errorElement: <RouteErrorFallback />,
    children: [
      {
        element: <AdminShellLayout />,
        children: [
          {
            path: '/',
            element: (
              <SuspensePage>
                <DashboardPage />
              </SuspensePage>
            ),
          },
          {
            path: '/invitations',
            element: <Navigate to="/users" replace />,
          },
          {
            path: '/users',
            element: (
              <SuspensePage>
                <UsersPage />
              </SuspensePage>
            ),
          },
          {
            path: '/tests',
            element: (
              <SuspensePage>
                <TestsLayout />
              </SuspensePage>
            ),
            children: [
              { index: true, element: <Navigate to="subjects" replace /> },
              {
                path: 'subjects',
                element: (
                  <SuspensePage>
                    <TestsSubjectsPage />
                  </SuspensePage>
                ),
              },
              {
                path: 'books',
                element: (
                  <SuspensePage>
                    <TestsBooksPage />
                  </SuspensePage>
                ),
              },
              {
                path: 'questions',
                element: (
                  <SuspensePage>
                    <TestsQuestionsPage />
                  </SuspensePage>
                ),
              },
              {
                path: 'suites',
                element: (
                  <SuspensePage>
                    <TestsSuitesPage />
                  </SuspensePage>
                ),
              },
              {
                path: 'packages',
                element: (
                  <SuspensePage>
                    <TestsPackagesPage />
                  </SuspensePage>
                ),
              },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
