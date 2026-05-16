import {
  BookOpen,
  FileText,
  HelpCircle,
  LayoutDashboard,
  ShieldCheck,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { env } from '@/config/env'
import { useAuthStore } from '@/stores/auth-store'

const comingSoon = [
  { title: 'Subjects', description: 'Manage test series subjects', icon: BookOpen },
  { title: 'Chapters', description: 'Organize chapters per subject', icon: FileText },
  { title: 'Questions', description: 'Build and review question banks', icon: HelpCircle },
]

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)

  const displayName = user?.firstName
    ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ''}`
    : user?.email ?? 'Admin'

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Welcome back</p>
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{displayName}</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          You are signed in to {env.appName}. Use the sidebar to navigate admin tools as they are
          migrated from the legacy panel.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Session</CardTitle>
            <LayoutDashboard className="size-4 text-primary" aria-hidden />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">Active</p>
            <p className="text-xs text-muted-foreground">Signed in via classroom API</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Role</CardTitle>
            <ShieldCheck className="size-4 text-primary" aria-hidden />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{user?.role?.name ?? '—'}</p>
            <p className="text-xs text-muted-foreground">From profile after login</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">API</CardTitle>
            <CardDescription className="text-xs">Classroom backend</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="truncate font-mono text-sm">
              {env.apiBaseUrl || 'Set VITE_API_BASE_URL'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h3 className="mb-4 text-lg font-semibold">Coming soon</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {comingSoon.map((item) => {
            const Icon = item.icon
            return (
              <Card key={item.title} className="border-dashed">
                <CardHeader>
                  <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-muted">
                    <Icon className="size-4 text-muted-foreground" aria-hidden />
                  </div>
                  <CardTitle className="text-base">{item.title}</CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
