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
const ForgotPasswordPage = lazyWithRetry(() => import('@/features/auth/pages/ForgotPasswordPage'))
const RegisterPage = lazyWithRetry(() => import('@/features/auth/pages/RegisterPage'))
const UsersPage = lazyWithRetry(() => import('@/features/users/pages/UsersPage'))
const UserDetailRoute = lazyWithRetry(() => import('@/features/users/pages/UserDetailRoute'))
const UserInviteDetailRoute = lazyWithRetry(() => import('@/features/users/pages/UserInviteDetailRoute'))
const TestsLayout = lazyWithRetry(() => import('@/features/tests/TestsLayout'))
const ExamsLayout = lazyWithRetry(() => import('@/features/tests/ExamsLayout'))
const TestsBoardsPage = lazyWithRetry(() => import('@/features/tests/pages/BoardsPage'))
const ExamsPage = lazyWithRetry(() => import('@/features/tests/pages/ExamsPage'))
const TestsSubjectsPage = lazyWithRetry(() => import('@/features/tests/pages/SubjectsPage'))
const TestsBooksPage = lazyWithRetry(() => import('@/features/tests/pages/BooksPage'))
const TestsLessonsPage = lazyWithRetry(() => import('@/features/tests/pages/LessonsPage'))
const TestsQuestionsPage = lazyWithRetry(() => import('@/features/tests/pages/QuestionsPage'))
const TestsSuitesPage = lazyWithRetry(() => import('@/features/tests/pages/SuitesPage'))
const TestsPackagesPage = lazyWithRetry(() => import('@/features/tests/pages/PackagesPage'))
const QuizzesPage = lazyWithRetry(() => import('@/features/tests/pages/QuizzesPage'))
const SubscriptionLayout = lazyWithRetry(() =>
  import('@/features/subscription/SubscriptionLayout'),
)
const SubscriptionPlansPage = lazyWithRetry(() =>
  import('@/features/tests/pages/SubscriptionPlansPage'),
)
const SubscribersPage = lazyWithRetry(() => import('@/features/tests/pages/SubscribersPage'))
const PurchasesPage = lazyWithRetry(() => import('@/features/tests/pages/PurchasesPage'))
const SubscriptionIndexRedirect = lazyWithRetry(() =>
  import('@/features/subscription/SubscriptionIndexRedirect'),
)
const RolesPermissionsPage = lazyWithRetry(() =>
  import('@/features/roles-permissions/pages/RolesPermissionsPage'),
)
const TrainingProgramsLayout = lazyWithRetry(() =>
  import('@/features/training/TrainingProgramsLayout'),
)
const ProgramsCatalogPage = lazyWithRetry(() =>
  import('@/features/training/pages/ProgramsCatalogPage'),
)
const ProgramTypeEnrollmentsPage = lazyWithRetry(() =>
  import('@/features/training/pages/ProgramTypeEnrollmentsPage'),
)
const TrainingProgramsIndexRedirect = lazyWithRetry(() =>
  import('@/features/training/TrainingProgramsIndexRedirect'),
)
const StaffLoginPage = lazyWithRetry(() => import('@/features/auth/pages/StaffLoginPage'))
const ReviewQueuePage = lazyWithRetry(() => import('@/features/review/pages/ReviewQueuePage'))

export const router = createBrowserRouter([
  {
    path: '/staff-login',
    element: (
      <SuspensePage>
        <StaffLoginPage />
      </SuspensePage>
    ),
  },
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
            path: '/forgot-password',
            element: (
              <SuspensePage>
                <ForgotPasswordPage />
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
            path: '/users/invites/:inviteUuid',
            element: (
              <SuspensePage>
                <UserInviteDetailRoute />
              </SuspensePage>
            ),
          },
          {
            path: '/users/:uuid',
            element: (
              <SuspensePage>
                <UserDetailRoute />
              </SuspensePage>
            ),
          },
          {
            path: '/roles-permissions',
            element: (
              <SuspensePage>
                <RolesPermissionsPage />
              </SuspensePage>
            ),
          },
          {
            path: '/review',
            element: (
              <SuspensePage>
                <ReviewQueuePage />
              </SuspensePage>
            ),
          },
          {
            path: '/quizzes',
            element: (
              <SuspensePage>
                <QuizzesPage />
              </SuspensePage>
            ),
          },
          {
            path: '/tests/exams',
            element: <Navigate to="/exams" replace />,
          },
          {
            path: '/tests',
            element: (
              <SuspensePage>
                <TestsLayout />
              </SuspensePage>
            ),
            children: [
              { index: true, element: <Navigate to="boards" replace /> },
              {
                path: 'boards',
                element: (
                  <SuspensePage>
                    <TestsBoardsPage />
                  </SuspensePage>
                ),
              },
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
                path: 'lessons',
                element: (
                  <SuspensePage>
                    <TestsLessonsPage />
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
          {
            path: '/exams',
            element: (
              <SuspensePage>
                <ExamsLayout />
              </SuspensePage>
            ),
            children: [
              {
                index: true,
                element: (
                  <SuspensePage>
                    <ExamsPage />
                  </SuspensePage>
                ),
              },
            ],
          },
          {
            path: '/subscription',
            element: (
              <SuspensePage>
                <SubscriptionLayout />
              </SuspensePage>
            ),
            children: [
              { index: true, element: <SubscriptionIndexRedirect /> },
              { path: 'products', element: <Navigate to="/subscription/plans" replace /> },
              { path: 'one-time', element: <Navigate to="/subscription/plans" replace /> },
              {
                path: 'plans',
                element: (
                  <SuspensePage>
                    <SubscriptionPlansPage />
                  </SuspensePage>
                ),
              },
              {
                path: 'subscribers',
                element: (
                  <SuspensePage>
                    <SubscribersPage />
                  </SuspensePage>
                ),
              },
              {
                path: 'purchases',
                element: (
                  <SuspensePage>
                    <PurchasesPage />
                  </SuspensePage>
                ),
              },
            ],
          },
          {
            path: '/programs',
            element: (
              <SuspensePage>
                <TrainingProgramsLayout />
              </SuspensePage>
            ),
            children: [
              { index: true, element: <TrainingProgramsIndexRedirect /> },
              {
                path: 'catalog',
                element: (
                  <SuspensePage>
                    <ProgramsCatalogPage />
                  </SuspensePage>
                ),
              },
              {
                path: ':programTypeSlug',
                element: (
                  <SuspensePage>
                    <ProgramTypeEnrollmentsPage />
                  </SuspensePage>
                ),
              },
            ],
          },
          {
            path: '/focus-one',
            element: <Navigate to="/programs/focus-one" replace />,
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
