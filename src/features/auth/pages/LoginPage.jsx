import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, Loader2, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getUserProfile, login, toAuthSession } from '@/features/auth/api/auth-api'
import { isStaffUser } from '@/features/auth/lib/is-staff-user'
import { validateLoginForm } from '@/features/auth/lib/validate-login-form'
import { env } from '@/config/env'
import { handleApiError } from '@/lib/http/api-error'
import { notifyError, notifySuccess } from '@/lib/notifications'
import { useAuthStore } from '@/stores/auth-store'

const STAFF_ACCESS_DENIED =
  'This portal is for admin staff only. Students and instructors must sign in through the Classroom app.'

export default function LoginPage() {
  const [searchParams] = useSearchParams()
  const emailFromQuery = searchParams.get('email')?.trim() || ''

  const [form, setForm] = useState(() => ({
    email: emailFromQuery,
    password: '',
  }))
  const [errors, setErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)

  const setSession = useAuthStore((s) => s.setSession)
  const logout = useAuthStore((s) => s.logout)
  const location = useLocation()
  const navigate = useNavigate()

  const mutation = useMutation({
    mutationFn: async () => {
      const response = await login({
        email: form.email.trim(),
        password: form.password,
      })

      const payload = response?.data
      if (!payload?.user?.uuid || !payload?.tokens?.accessToken) {
        throw new Error('Unexpected login response')
      }

      const profile = await getUserProfile(
        payload.user.uuid,
        payload.tokens.accessToken,
      )
      return { response, profile, session: toAuthSession({ user: profile, tokens: payload.tokens }) }
    },
    onSuccess: ({ response, profile, session }) => {
      setErrors({})

      if (!isStaffUser(profile)) {
        logout()
        notifyError(STAFF_ACCESS_DENIED)
        return
      }

      setSession(session)
      notifySuccess(response?.message || 'Signed in successfully')

      const from = location.state?.from?.pathname
      navigate(from || '/', { replace: true })
    },
    onError: (error) => {
      const { message, fieldErrors, errorCode } = handleApiError(error, 'Unable to sign in')
      const next = { ...fieldErrors }
      if (errorCode === 'ADMIN_PORTAL_ONLY' || errorCode === 'ADMIN_STAFF_ONLY') {
        next.root = STAFF_ACCESS_DENIED
      } else if (message) {
        next.root = message
      }
      setErrors(next)
    },
  })

  function handleSubmit(event) {
    event.preventDefault()
    const validation = validateLoginForm(form)
    if (Object.keys(validation).length > 0) {
      setErrors(validation)
      return
    }
    mutation.mutate()
  }

  return (
    <Card className="border-border/60 shadow-lg">
      <CardHeader className="space-y-1">
        <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Shield className="size-5" aria-hidden />
        </div>
        <CardTitle className="text-2xl">Admin sign in</CardTitle>
        <CardDescription>
          Sign in to {env.appName} with your administrator credentials.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {errors.root ? (
            <p
              className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              role="alert"
            >
              {errors.root}
            </p>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              aria-invalid={Boolean(errors.email)}
              disabled={mutation.isPending}
            />
            {errors.email ? (
              <p className="text-sm text-destructive">{errors.email}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={form.password}
                onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                className="pr-10"
                aria-invalid={Boolean(errors.password)}
                disabled={mutation.isPending}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-10 w-10 text-muted-foreground"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                disabled={mutation.isPending}
              >
                {showPassword ? (
                  <EyeOff className="size-4" aria-hidden />
                ) : (
                  <Eye className="size-4" aria-hidden />
                )}
              </Button>
            </div>
            <div className="flex justify-end">
              <Link
                to={
                  form.email.trim()
                    ? `/forgot-password?email=${encodeURIComponent(form.email.trim())}`
                    : '/forgot-password'
                }
                className="text-xs font-medium text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            {errors.password ? (
              <p className="text-sm text-destructive">{errors.password}</p>
            ) : null}
          </div>

          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : null}
            Sign in
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
