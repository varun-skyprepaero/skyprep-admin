import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
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
  getInvitePreview,
  registerFromInvite,
} from '@/features/auth/api/auth-api'
import { toAuthSession } from '@/features/auth/lib/to-auth-session'
import { ClassroomSignupRedirect } from '@/features/auth/components/classroom-signup-redirect'
import { isClassroomSignupInvite } from '@/features/auth/lib/is-classroom-signup-invite'
import { SUPER_ADMIN_ROLE_NAME } from '@/features/invitations/constants'
import { TimezoneField } from '@/features/auth/components/timezone-field'
import { env } from '@/config/env'
import { getBrowserTimezone, isValidIANATimezone, normalizeTimezone } from '@/lib/datetime/timezone-utils'
import { COUNTRY_CALLING_CODES } from '@/lib/phone/country-calling-codes'
import { handleApiError } from '@/lib/http/api-error'
import { notifySuccess } from '@/lib/notifications'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PASS_ERR = 'Password must be at least 8 characters'

const countryCallingCodeSelectClass = cn(
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm',
  'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  'disabled:cursor-not-allowed disabled:opacity-50',
)

function validateInviteForm(form) {
  const errors = {}
  if (!form.firstName.trim()) errors.firstName = 'First name is required'
  if (!form.email.trim()) errors.email = 'Email is required'
  else if (!EMAIL_RE.test(form.email.trim())) errors.email = 'Enter a valid email address'
  if (!form.password) errors.password = 'Password is required'
  else if (form.password.length < 8) errors.password = PASS_ERR
  const tz = normalizeTimezone(form.timezone)
  if (!tz) errors.timezone = 'Timezone is required'
  else if (!isValidIANATimezone(tz)) errors.timezone = 'Use a valid IANA timezone (e.g. Asia/Kolkata)'
  const phone = form.phoneNumber?.trim() ?? ''
  const countryIso = form.countryIso?.trim() ?? ''
  if (!countryIso) errors.countryCode = 'Country code is required'
  if (!phone) errors.phoneNumber = 'Phone number is required'
  else {
    const digits = phone.replace(/\D/g, '')
    if (digits.length < 6 || digits.length > 15) {
      errors.phoneNumber = 'Enter a valid phone number (6–15 digits)'
    }
  }
  return errors
}

export default function RegisterPage() {
  const [searchParams] = useSearchParams()
  const inviteToken = searchParams.get('invite')?.trim() || ''

  const [form, setForm] = useState(() => ({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    timezone: getBrowserTimezone(),
    countryIso: '',
    phoneNumber: '',
  }))
  const [errors, setErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()
  const setSession = useAuthStore((s) => s.setSession)

  const invitePreviewQuery = useQuery({
    queryKey: ['invite-preview', inviteToken],
    queryFn: async () => {
      const res = await getInvitePreview(inviteToken)
      return res?.data ?? res
    },
    enabled: Boolean(inviteToken),
    retry: false,
  })

  const inviteMeta = inviteToken ? invitePreviewQuery.data : undefined
  const inviteEmail = inviteMeta?.email ?? ''

  const mutation = useMutation({
    mutationFn: registerFromInvite,
    onSuccess: (response) => {
      setErrors({})
      const payload = response?.data
      if (!payload?.tokens?.accessToken || !payload?.user) {
        setErrors({ root: 'Unexpected response from server.' })
        return
      }
      setSession(
        toAuthSession({
          user: payload.user,
          tokens: payload.tokens,
        }),
      )
      notifySuccess(response.message || 'Welcome! Your account is ready.')
      navigate('/', { replace: true })
    },
    onError: (error) => {
      const { message, fieldErrors } = handleApiError(error, 'Unable to complete signup')
      setErrors({ ...fieldErrors, ...(message ? { root: message } : {}) })
    },
  })

  function handleSubmit(event) {
    event.preventDefault()
    if (isClassroomSignupInvite(inviteMeta)) {
      return
    }
    const validation = validateInviteForm({
      ...form,
      email: inviteEmail,
      timezone: form.timezone,
    })
    if (Object.keys(validation).length > 0) {
      setErrors(validation)
      return
    }
    setErrors({})
    const dialCode = form.countryIso.trim()
      ? COUNTRY_CALLING_CODES.find((c) => c.iso2 === form.countryIso.trim())?.dialCode
      : undefined
    mutation.mutate({
      inviteToken,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim() || undefined,
      password: form.password,
      timezone: normalizeTimezone(form.timezone) ?? '',
      countryCode: dialCode?.trim() || undefined,
      phoneNumber: form.phoneNumber.trim(),
    })
  }

  if (!inviteToken) {
    return (
      <Card className="border-border/60 shadow-lg">
        <CardHeader>
          <CardTitle>Invitation required</CardTitle>
          <CardDescription>
            Open the link from your invitation email to create your admin account. Already have
            access?{' '}
            <Link to="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
            .
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (invitePreviewQuery.isPending) {
    return (
      <Card className="border-border/60 shadow-lg">
        <CardContent className="flex min-h-[200px] items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
        </CardContent>
      </Card>
    )
  }

  if (invitePreviewQuery.isError) {
    return (
      <Card className="border-border/60 shadow-lg">
        <CardHeader>
          <CardTitle>Invitation unavailable</CardTitle>
          <CardDescription>
            This link may be expired or invalid. Ask your administrator for a new invite.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const meta = invitePreviewQuery.data
  if (meta?.roleName === SUPER_ADMIN_ROLE_NAME) {
    return (
      <Card className="border-border/60 shadow-lg">
        <CardHeader>
          <CardTitle>Invalid invitation</CardTitle>
          <CardDescription>Super Admin accounts cannot be created via invitation.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (isClassroomSignupInvite(meta)) {
    return (
      <ClassroomSignupRedirect
        classroomAppUrl={env.classroomAppUrl}
        inviteToken={inviteToken}
        roleName={meta?.roleName}
      />
    )
  }

  return (
    <Card className="border-border/60 shadow-lg">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Complete your invitation</CardTitle>
        <CardDescription>
          You&apos;ve been invited as <strong>{meta?.roleName}</strong>. Enter your details below.
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                autoComplete="given-name"
                value={form.firstName}
                onChange={(e) => setForm((prev) => ({ ...prev, firstName: e.target.value }))}
                aria-invalid={Boolean(errors.firstName)}
                disabled={mutation.isPending}
              />
              {errors.firstName ? (
                <p className="text-sm text-destructive">{errors.firstName}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                autoComplete="family-name"
                value={form.lastName}
                onChange={(e) => setForm((prev) => ({ ...prev, lastName: e.target.value }))}
                disabled={mutation.isPending}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={inviteEmail}
              readOnly
              className="bg-muted"
              disabled={mutation.isPending}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="countryCode">Country code</Label>
              <select
                id="countryCode"
                className={countryCallingCodeSelectClass}
                autoComplete="tel-country-code"
                value={form.countryIso}
                onChange={(e) => setForm((prev) => ({ ...prev, countryIso: e.target.value }))}
                disabled={mutation.isPending}
                aria-invalid={Boolean(errors.countryCode)}
                aria-required
              >
                <option value="">Select country code</option>
                {COUNTRY_CALLING_CODES.map((c) => (
                  <option key={`${c.iso2}-${c.dialCode}`} value={c.iso2}>
                    {c.country} ({c.dialCode})
                  </option>
                ))}
              </select>
              {errors.countryCode ? (
                <p className="text-sm text-destructive">{errors.countryCode}</p>
              ) : (
                <p className="text-xs text-muted-foreground">Required with your phone number.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone number</Label>
              <Input
                id="phoneNumber"
                type="tel"
                autoComplete="tel-national"
                value={form.phoneNumber}
                onChange={(e) => setForm((prev) => ({ ...prev, phoneNumber: e.target.value }))}
                disabled={mutation.isPending}
                aria-invalid={Boolean(errors.phoneNumber)}
                aria-required
              />
              {errors.phoneNumber ? (
                <p className="text-sm text-destructive">{errors.phoneNumber}</p>
              ) : (
                <p className="text-xs text-muted-foreground">National number only; pick country code on the left.</p>
              )}
            </div>
          </div>

          <TimezoneField
            value={form.timezone}
            onChange={(timezone) => setForm((prev) => ({ ...prev, timezone }))}
            error={errors.timezone}
            hint="Pre-filled from your device. You can change this after signup in account settings when available."
            disabled={mutation.isPending}
          />

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
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
            {errors.password ? (
              <p className="text-sm text-destructive">{errors.password}</p>
            ) : null}
          </div>

          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : null}
            Complete setup
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
