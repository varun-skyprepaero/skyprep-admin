import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, KeyRound, Loader2, CheckCircle2 } from 'lucide-react'
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
import {
  requestPasswordReset,
  resetPasswordWithCode,
  verifyPasswordResetCode,
} from '@/features/auth/api/auth-api'
import { validateForgotPasswordStep } from '@/features/auth/lib/validate-forgot-password-form'
import { PasswordRequirements } from '@/features/auth/components/password-requirements'
import { handleApiError } from '@/lib/http/api-error'
import { notifySuccess } from '@/lib/notifications'

const CODE_LENGTH = 6

const STEP_DESCRIPTIONS = {
  1: 'Enter your email and we will send a 6-digit reset code.',
  2: 'Enter the code from your email to continue.',
  3: 'Choose a new password for your account.',
}

export default function ForgotPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const emailFromQuery = searchParams.get('email')?.trim() || ''

  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    email: emailFromQuery,
    code: '',
    password: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [completed, setCompleted] = useState(false)

  const requestMutation = useMutation({
    mutationFn: () => requestPasswordReset({ email: form.email }),
    onSuccess: (response) => {
      setErrors({})
      setForm((prev) => ({ ...prev, code: '', password: '', confirmPassword: '' }))
      setStep(2)
      notifySuccess(
        typeof response?.message === 'string'
          ? response.message
          : 'If an account exists for this email, a reset code has been sent.',
      )
    },
    onError: (error) => {
      const { message, fieldErrors } = handleApiError(error, 'Unable to send reset code')
      const next = { ...fieldErrors }
      if (message) next.root = message
      setErrors(next)
    },
  })

  const verifyMutation = useMutation({
    mutationFn: () =>
      verifyPasswordResetCode({
        email: form.email,
        code: form.code,
      }),
    onSuccess: (response) => {
      setErrors({})
      setStep(3)
      notifySuccess(
        typeof response?.message === 'string'
          ? response.message
          : 'Reset code verified. Choose a new password.',
      )
    },
    onError: (error) => {
      const { message, fieldErrors } = handleApiError(error, 'Unable to verify reset code')
      const next = { ...fieldErrors }
      if (message) next.root = message
      setErrors(next)
    },
  })

  const resetMutation = useMutation({
    mutationFn: () =>
      resetPasswordWithCode({
        email: form.email,
        code: form.code,
        password: form.password,
      }),
    onSuccess: (response) => {
      setErrors({})
      setCompleted(true)
      notifySuccess(
        typeof response?.message === 'string'
          ? response.message
          : 'Password updated successfully. You can sign in now.',
      )
    },
    onError: (error) => {
      const { message, fieldErrors } = handleApiError(error, 'Unable to reset password')
      const next = { ...fieldErrors }
      if (message) next.root = message
      setErrors(next)
    },
  })

  function clearErrors(...fields) {
    setErrors((prev) => {
      const next = { ...prev }
      for (const field of fields) delete next[field]
      return next
    })
  }

  function handleRequestCode(event) {
    event.preventDefault()
    const validation = validateForgotPasswordStep(1, form)
    if (Object.keys(validation).length > 0) {
      setErrors(validation)
      return
    }
    setErrors({})
    requestMutation.mutate()
  }

  function handleVerifyCode(event) {
    event.preventDefault()
    const validation = validateForgotPasswordStep(2, form)
    if (Object.keys(validation).length > 0) {
      setErrors(validation)
      return
    }
    setErrors({})
    verifyMutation.mutate()
  }

  function handleResetPassword(event) {
    event.preventDefault()
    const validation = validateForgotPasswordStep(3, form)
    if (Object.keys(validation).length > 0) {
      setErrors(validation)
      return
    }
    setErrors({})
    resetMutation.mutate()
  }

  if (completed) {
    return (
      <Card className="border-border/60 shadow-lg">
        <CardContent className="flex flex-col items-center py-10 text-center">
          <span className="mb-4 flex size-14 items-center justify-center rounded-full bg-emerald-500/10">
            <CheckCircle2 className="size-7 text-emerald-600" aria-hidden />
          </span>
          <h2 className="text-xl font-semibold tracking-tight">Password updated</h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Your password has been changed. Sign in with your new password.
          </p>
          <Button asChild className="mt-6 w-full max-w-xs">
            <Link to={`/login?email=${encodeURIComponent(form.email.trim())}`}>Sign in</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/60 shadow-lg">
      <CardHeader className="space-y-1">
        <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <KeyRound className="size-5" aria-hidden />
        </div>
        <CardTitle className="text-2xl">Reset your password</CardTitle>
        <CardDescription>{STEP_DESCRIPTIONS[step]}</CardDescription>
      </CardHeader>
      <CardContent>
        {step === 1 ? (
          <form onSubmit={handleRequestCode} className="space-y-4" noValidate>
            {errors.root ? (
              <p
                className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                role="alert"
              >
                {errors.root}
              </p>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="forgot-email">Email</Label>
              <Input
                id="forgot-email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, email: e.target.value }))
                  clearErrors('email')
                }}
                aria-invalid={Boolean(errors.email)}
                disabled={requestMutation.isPending}
              />
              {errors.email ? (
                <p className="text-sm text-destructive">{errors.email}</p>
              ) : null}
            </div>

            <Button type="submit" className="w-full" disabled={requestMutation.isPending}>
              {requestMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : null}
              Send reset code
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={() => navigate('/login')}
            >
              Back to sign in
            </Button>
          </form>
        ) : null}

        {step === 2 ? (
          <form onSubmit={handleVerifyCode} className="space-y-4" noValidate>
            {errors.root ? (
              <p
                className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                role="alert"
              >
                {errors.root}
              </p>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="reset-email">Email</Label>
              <Input
                id="reset-email"
                type="email"
                autoComplete="email"
                value={form.email}
                readOnly
                className="bg-muted/40"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reset-code">Reset code</Label>
              <Input
                id="reset-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={CODE_LENGTH}
                placeholder={'·'.repeat(CODE_LENGTH)}
                value={form.code}
                onChange={(e) => {
                  setForm((prev) => ({
                    ...prev,
                    code: e.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH),
                  }))
                  clearErrors('code')
                }}
                className="text-center text-lg tracking-[0.35em]"
                aria-invalid={Boolean(errors.code)}
                disabled={verifyMutation.isPending}
              />
              {errors.code ? (
                <p className="text-sm text-destructive">{errors.code}</p>
              ) : null}
            </div>

            <Button type="submit" className="w-full" disabled={verifyMutation.isPending}>
              {verifyMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : null}
              Verify code
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={requestMutation.isPending || !form.email.trim()}
              onClick={() => requestMutation.mutate()}
            >
              {requestMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : null}
              Resend reset code
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={() => setStep(1)}
            >
              Use a different email
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={() => navigate('/login')}
            >
              Back to sign in
            </Button>
          </form>
        ) : null}

        {step === 3 ? (
          <form onSubmit={handleResetPassword} className="space-y-4" noValidate>
            {errors.root ? (
              <p
                className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                role="alert"
              >
                {errors.root}
              </p>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="reset-email-readonly">Email</Label>
              <Input
                id="reset-email-readonly"
                type="email"
                autoComplete="email"
                value={form.email}
                readOnly
                className="bg-muted/40"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reset-password">New password</Label>
              <div className="relative">
                <Input
                  id="reset-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, password: e.target.value }))
                    clearErrors('password')
                  }}
                  className="pr-10"
                  aria-invalid={Boolean(errors.password)}
                  disabled={resetMutation.isPending}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-10 w-10 text-muted-foreground"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  disabled={resetMutation.isPending}
                >
                  {showPassword ? (
                    <EyeOff className="size-4" aria-hidden />
                  ) : (
                    <Eye className="size-4" aria-hidden />
                  )}
                </Button>
              </div>
              {errors.password ? (
                <p className="text-sm text-destructive">{errors.password}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reset-confirm-password">Confirm password</Label>
              <div className="relative">
                <Input
                  id="reset-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={form.confirmPassword}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
                    clearErrors('confirmPassword')
                  }}
                  className="pr-10"
                  aria-invalid={Boolean(errors.confirmPassword)}
                  disabled={resetMutation.isPending}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-10 w-10 text-muted-foreground"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  disabled={resetMutation.isPending}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="size-4" aria-hidden />
                  ) : (
                    <Eye className="size-4" aria-hidden />
                  )}
                </Button>
              </div>
              {errors.confirmPassword ? (
                <p className="text-sm text-destructive">{errors.confirmPassword}</p>
              ) : null}
            </div>

            <PasswordRequirements password={form.password} />

            <Button type="submit" className="w-full" disabled={resetMutation.isPending}>
              {resetMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : null}
              Update password
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={() => {
                setForm((prev) => ({ ...prev, password: '', confirmPassword: '' }))
                setStep(2)
              }}
            >
              Back to code entry
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={() => navigate('/login')}
            >
              Back to sign in
            </Button>
          </form>
        ) : null}
      </CardContent>
    </Card>
  )
}
