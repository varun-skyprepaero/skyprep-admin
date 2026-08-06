import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CLASSROOM_APP_ROLE_NAMES } from '@/features/invitations/constants'
import { StudentSearchField, isKnownStudentEmail } from '@/features/subscription/components/StudentSearchField'
import { fetchUsers } from '@/features/users/api/users-api'
import {
  fetchGrantAccessPreview,
  fetchSubscriptionPlans,
  grantTestSeriesSubscription,
} from '@/features/tests/api/tests-api'
import { handleApiError } from '@/lib/http/api-error'
import { notifyError, notifySuccess } from '@/lib/notifications'

const plansQueryKey = ['tests', 'subscription-plans']
const subscribersQueryKey = ['tests', 'subscribers']
const grantUsersQueryKey = ['admin', 'users', 'grant-access']

const DURATION_PRESETS = [
  { value: 'plan_default', label: 'Use plan default (1 month or 1 year)' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: '365', label: '1 year' },
  { value: 'custom', label: 'Custom end date' },
]

function formatMarket(market) {
  return market === 'INTL' ? 'International' : 'India'
}

function formatInterval(interval) {
  return interval === 'year' ? 'Yearly' : 'Monthly'
}

function formatEntitlementLabels(entitlements, entitlementProducts) {
  const keys = Array.isArray(entitlements) ? entitlements : []
  if (keys.length === 0) return '—'
  return keys
    .map((key) => {
      const product = entitlementProducts.find((p) => p.productKey === key)
      return product?.shortTitle ?? key
    })
    .join(', ')
}

function periodEndFromPreset(preset, customPeriodEnd) {
  if (preset === 'plan_default') return undefined
  if (preset === 'custom') {
    const trimmed = customPeriodEnd.trim()
    return trimmed ? new Date(trimmed).toISOString() : undefined
  }
  const days = Number(preset)
  if (!Number.isFinite(days) || days <= 0) return undefined
  const end = new Date()
  end.setDate(end.getDate() + days)
  return end.toISOString()
}

/**
 * @param {{
 *   open: boolean
 *   onOpenChange: (open: boolean) => void
 *   initialEmail?: string
 *   lockEmail?: boolean
 *   onSuccess?: () => void
 * }} props
 */
export function GrantAccessDialog({
  open,
  onOpenChange,
  initialEmail = '',
  lockEmail = false,
  onSuccess,
}) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    email: '',
    planKey: '',
    durationPreset: '90',
    customPeriodEnd: '',
    reason: '',
  })

  const { data: plansPayload, isLoading: plansLoading } = useQuery({
    queryKey: plansQueryKey,
    queryFn: fetchSubscriptionPlans,
    enabled: open,
  })
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: grantUsersQueryKey,
    queryFn: fetchUsers,
    enabled: open,
  })

  const studentOptions = useMemo(() => {
    return users
      .filter(
        (user) =>
          user.isActive &&
          user.email &&
          CLASSROOM_APP_ROLE_NAMES.includes(user.role?.name ?? ''),
      )
      .map((user) => ({
        email: user.email,
        name: [user.firstName, user.lastName].filter(Boolean).join(' '),
      }))
      .sort((a, b) => {
        const nameA = (a.name || a.email).toLowerCase()
        const nameB = (b.name || b.email).toLowerCase()
        return nameA.localeCompare(nameB)
      })
  }, [users])
  const plans = Array.isArray(plansPayload?.plans) ? plansPayload.plans : []
  const entitlementProducts = Array.isArray(plansPayload?.entitlementProducts)
    ? plansPayload.entitlementProducts
    : []

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.planKey === form.planKey) ?? null,
    [plans, form.planKey],
  )

  const studentEmailValid = lockEmail || isKnownStudentEmail(form.email, studentOptions)
  const trimmedEmail = form.email.trim()

  const { data: grantPreview, isLoading: grantPreviewLoading } = useQuery({
    queryKey: ['tests', 'grant-preview', trimmedEmail],
    queryFn: () => fetchGrantAccessPreview(trimmedEmail),
    enabled: open && studentEmailValid && Boolean(trimmedEmail),
  })

  const grantablePlanKeys = useMemo(
    () => new Set(grantPreview?.grantablePlanKeys ?? []),
    [grantPreview?.grantablePlanKeys],
  )

  const grantablePlans = useMemo(() => {
    if (!studentEmailValid || !trimmedEmail) return plans
    if (!grantPreview) return []
    return plans.filter((plan) => grantablePlanKeys.has(plan.planKey))
  }, [plans, grantPreview, grantablePlanKeys, studentEmailValid, trimmedEmail])

  const planSelectionValid = Boolean(form.planKey) && grantablePlanKeys.has(form.planKey)

  useEffect(() => {
    if (!grantPreview || !form.planKey) return
    if (!grantablePlanKeys.has(form.planKey)) {
      setForm((state) => ({ ...state, planKey: '' }))
    }
  }, [grantPreview, form.planKey, grantablePlanKeys])

  useEffect(() => {
    if (!open) return
    setForm({
      email: initialEmail,
      planKey: '',
      durationPreset: '90',
      customPeriodEnd: '',
      reason: '',
    })
  }, [open, initialEmail])

  const grantMu = useMutation({
    mutationFn: () =>
      grantTestSeriesSubscription({
        email: form.email.trim(),
        planKey: form.planKey,
        periodEnd: periodEndFromPreset(form.durationPreset, form.customPeriodEnd),
        reason: form.reason.trim() || undefined,
      }),
    onSuccess: () => {
      notifySuccess('Access granted — student can use included features immediately')
      onOpenChange(false)
      void queryClient.invalidateQueries({ queryKey: subscribersQueryKey })
      onSuccess?.()
    },
    onError: (err) => notifyError(handleApiError(err).message),
  })

  function close() {
    onOpenChange(false)
  }

  return (
    <Modal
      open={open}
      onClose={close}
      size="md"
      closeDisabled={grantMu.isPending}
      aria-labelledby="grant-access-title"
    >
      <ModalHeader
        title="Grant complimentary access"
        description="Give a signed-up student access to test series, question bank, or both without payment. Useful for influencers, partners, or trials. The student must already have a Classroom account."
        titleId="grant-access-title"
        onClose={close}
        closeDisabled={grantMu.isPending}
      />
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!studentEmailValid) {
            notifyError('Select a student from the list')
            return
          }
          grantMu.mutate()
        }}
        className="flex min-h-0 flex-1 flex-col"
      >
        <ModalBody className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="grant-email">Student</Label>
            <StudentSearchField
              id="grant-email"
              value={form.email}
              onChange={(email) => setForm((s) => ({ ...s, email, planKey: '' }))}
              users={studentOptions}
              disabled={grantMu.isPending || usersLoading}
              readOnly={lockEmail}
            />
            <p className="text-xs text-muted-foreground">
              {usersLoading
                ? 'Loading students…'
                : 'Search by name or email. User not listed? They need to sign up in Classroom first, or use Invite user on the Users page.'}
            </p>
            {studentEmailValid && trimmedEmail && grantPreviewLoading ? (
              <p className="text-xs text-muted-foreground">Checking current access…</p>
            ) : null}
            {grantPreview?.activeSubscription?.plan ? (
              <p className="text-xs text-muted-foreground">
                Current plan:{' '}
                <span className="font-medium text-foreground">
                  {grantPreview.activeSubscription.plan.label}
                </span>
                {grantPreview.entitlements?.length ? (
                  <>
                    {' '}
                    · Includes{' '}
                    {formatEntitlementLabels(grantPreview.entitlements, entitlementProducts)}
                  </>
                ) : null}
              </p>
            ) : grantPreview && studentEmailValid ? (
              <p className="text-xs text-muted-foreground">No active membership yet.</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="grant-plan">Access plan</Label>
            <select
              id="grant-plan"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.planKey}
              onChange={(e) => setForm((s) => ({ ...s, planKey: e.target.value }))}
              required
              disabled={
                grantMu.isPending ||
                plansLoading ||
                grantPreviewLoading ||
                !studentEmailValid ||
                grantablePlans.length === 0
              }
            >
              <option value="">
                {!studentEmailValid
                  ? 'Select a student first…'
                  : plansLoading
                    ? 'Loading plans…'
                    : plans.length === 0
                      ? 'No subscription plans configured'
                      : grantPreviewLoading
                        ? 'Checking access…'
                        : grantablePlans.length === 0
                          ? 'No plans available for this student'
                          : 'Select plan…'}
              </option>
              {grantablePlans.map((plan) => (
                <option key={plan.uuid} value={plan.planKey}>
                  {plan.label} · {formatMarket(plan.market)} · {formatInterval(plan.interval)}
                  {Array.isArray(plan.entitlements) && plan.entitlements.length > 0
                    ? ` · ${formatEntitlementLabels(plan.entitlements, entitlementProducts)}`
                    : ''}
                </option>
              ))}
            </select>
            {studentEmailValid &&
            grantPreview &&
            !grantPreviewLoading &&
            plans.length > 0 &&
            grantablePlans.length === 0 ? (
              <p className="text-xs text-amber-700 dark:text-amber-400">
                This student already has access from their current plan. Choose a different student
                or change their subscription on the Subscribers page first.
              </p>
            ) : !plansLoading && plans.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No subscription plans exist yet. Create one under Subscription → Plans before
                granting access.
              </p>
            ) : selectedPlan ? (
              <p className="text-xs text-muted-foreground">
                Unlocks:{' '}
                <span className="font-medium text-foreground">
                  {formatEntitlementLabels(selectedPlan.entitlements, entitlementProducts)}
                </span>
                . Create complimentary plans under Subscription → Plans if needed.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Pick a plan that includes test series, question bank, or both. Create internal
                complimentary plans in Subscription → Plans for campaigns.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="grant-duration">Access duration</Label>
            <select
              id="grant-duration"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.durationPreset}
              onChange={(e) => setForm((s) => ({ ...s, durationPreset: e.target.value }))}
              disabled={grantMu.isPending}
            >
              {DURATION_PRESETS.map((preset) => (
                <option key={preset.value} value={preset.value}>
                  {preset.label}
                </option>
              ))}
            </select>
          </div>

          {form.durationPreset === 'custom' ? (
            <div className="space-y-2">
              <Label htmlFor="grant-end">Custom period end</Label>
              <Input
                id="grant-end"
                type="datetime-local"
                value={form.customPeriodEnd}
                onChange={(e) => setForm((s) => ({ ...s, customPeriodEnd: e.target.value }))}
                required
                disabled={grantMu.isPending}
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="grant-reason">Campaign note (optional)</Label>
            <Input
              id="grant-reason"
              value={form.reason}
              onChange={(e) => setForm((s) => ({ ...s, reason: e.target.value }))}
              placeholder="e.g. Influencer campaign – March 2026"
              disabled={grantMu.isPending}
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            type="button"
            variant="outline"
            onClick={close}
            disabled={grantMu.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={
              grantMu.isPending ||
              plansLoading ||
              grantPreviewLoading ||
              !studentEmailValid ||
              !planSelectionValid
            }
          >
            {grantMu.isPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            Grant access
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  )
}
