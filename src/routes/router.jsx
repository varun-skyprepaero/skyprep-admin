import { lazy } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AdminShellLayout } from '@/components/layout/admin-shell-layout'
import { AuthLayout } from '@/components/layout/auth-layout'
import { GuestRoute } from '@/routes/guest-route'
import { ProtectedRoute } from '@/routes/protected-route'
import { SuspensePage } from '@/routes/lazy-boundary'

const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'))
const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'))
const RegisterPage = lazy(() => import('@/features/auth/pages/RegisterPage'))
const UsersPage = lazy(() => import('@/features/users/pages/UsersPage'))
const TestsLayout = lazy(() => import('@/features/tests/TestsLayout'))
const TestsSubjectsPage = lazy(() => import('@/features/tests/pages/SubjectsPage'))
const TestsBooksPage = lazy(() => import('@/features/tests/pages/BooksPage'))
const TestsQuestionsPage = lazy(() => import('@/features/tests/pages/QuestionsPage'))
const TestsSuitesPage = lazy(() => import('@/features/tests/pages/SuitesPage'))
const TestsPackagesPage = lazy(() => import('@/features/tests/pages/PackagesPage'))

export const router = createBrowserRouter([
  {
    element: <GuestRoute />,
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
