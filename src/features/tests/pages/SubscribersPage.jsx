import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { ActionConfirmDialog, ActionImpactList } from '@/components/ui/action-confirm-dialog'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { DataTablePagination } from '@/components/ui/data-table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  cancelTestSeriesSubscriber,
  fetchSubscriptionPlans,
  fetchTestSeriesSubscriberCancelPreview,
  fetchTestSeriesSubscribers,
  pauseTestSeriesSubscriber,
  resumeTestSeriesSubscriber,
  revokeTestSeriesGrant,
} from '@/features/tests/api/tests-api'
import { GrantAccessDialog } from '@/features/subscription/components/GrantAccessDialog'
import { handleApiError } from '@/lib/http/api-error'
import { notifyError, notifySuccess } from '@/lib/notifications'

const qk = ['tests', 'subscribers']

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PAST_DUE', label: 'Past due' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'PAUSED', label: 'Paused' },
  { value: 'COMPLETED', label: 'Completed' },
]

const GRANT_TYPE_OPTIONS = [
  { value: '', label: 'All access types' },
  { value: 'granted', label: 'Admin grants' },
  { value: 'paid', label: 'Paid (Razorpay)' },
]

function statusBadgeClass(status) {
  switch (status) {
    case 'ACTIVE':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
    case 'PAST_DUE':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
    case 'PENDING':
      return 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200'
    case 'CANCELLED':
      return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200'
    case 'PAUSED':
      return 'bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

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

const PLAN_END_REASON_LABELS = {
  plan_updated: 'Plan updated',
  pricing_change: 'Pricing change',
  plan_discontinued: 'Plan discontinued',
  service_change: 'Service change',
  admin_cancel: 'Scheduled to end',
  student_cancel: 'Student cancelled',
  membership_ended: 'Membership ended',
}

function formatPlanLabel(row) {
  if (row.plan?.label) return row.plan.label
  if (row.planSunsetPlanLabel) return row.planSunsetPlanLabel
  if (row.planKey) return row.planKey
  return '—'
}

function formatPlanMeta(row) {
  const parts = []
  if (row.plan?.market) parts.push(formatMarket(row.plan.market))
  if (row.plan?.interval) parts.push(formatInterval(row.plan.interval))
  if (row.plan?.priceAmount && row.plan?.currency) {
    parts.push(`${row.plan.priceAmount} ${row.plan.currency}`)
  }
  return parts.length > 0 ? parts.join(' · ') : null
}

/**
 * @param {{ grantedByAdmin?: boolean, paymentProvider?: string, externalSubscriptionId?: string | null }} row
 */
function isAdminGrant(row) {
  if (row.grantedByAdmin) return true
  if (row.paymentProvider === 'internal') return true
  const id = String(row.externalSubscriptionId || '')
  return id.startsWith('internal_')
}

/**
 * @param {{ grantedByAdmin?: boolean, paymentProvider?: string, externalSubscriptionId?: string | null }} row
 */
function formatProviderLabel(row) {
  if (isAdminGrant(row)) return 'Admin grant'
  if (row.paymentProvider === 'razorpay') return 'Razorpay'
  if (row.paymentProvider === 'internal_simulation') return 'Simulation'
  return row.paymentProvider || '—'
}

/**
 * @param {string | null | undefined} externalId
 * @param {{ grantedByAdmin?: boolean, paymentProvider?: string }} row
 */
function formatExternalSubscriptionRef(externalId, row) {
  const id = String(externalId || '').trim()
  if (!id) return null
  if (isAdminGrant(row)) return 'Complimentary access'
  if (id.startsWith('pending_')) return 'Pending checkout'
  if (id.startsWith('sim_')) return id
  if (id.startsWith('internal_')) return 'Complimentary access'
  return id
}

export default function SubscribersPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [grantType, setGrantType] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [grantOpen, setGrantOpen] = useState(false)
  const [pauseTarget, setPauseTarget] = useState(null)
  const [pauseReason, setPauseReason] = useState('')
  const [cancelTarget, setCancelTarget] = useState(null)
  const [cancelMode, setCancelMode] = useState('period_end')
  const [revokeTarget, setRevokeTarget] = useState(
    /** @type {null | { uuid: string, name: string, email?: string, planLabel?: string }} */ (null),
  )

  const { data, isLoading, isError, error } = useQuery({
    queryKey: [...qk, search, status, grantType, page, pageSize],
    queryFn: () =>
      fetchTestSeriesSubscribers({
        q: search || undefined,
        status: status || undefined,
        grantType: grantType || undefined,
        page,
        pageSize,
      }),
  })

  const { data: plansPayload } = useQuery({
    queryKey: ['tests', 'subscription-plans'],
    queryFn: fetchSubscriptionPlans,
  })
  const entitlementProducts = Array.isArray(plansPayload?.entitlementProducts)
    ? plansPayload.entitlementProducts
    : []

  const cancelMu = useMutation({
    mutationFn: ({ uuid, immediate, refundRemaining }) =>
      cancelTestSeriesSubscriber(uuid, { immediate, refundRemaining }),
    onSuccess: (result) => {
      if (result?.emailSent === false && result?.emailError) {
        notifyError(`Subscription updated, but email failed: ${result.emailError}`)
      } else if (result?.refund?.amount) {
        const ref = result.razorpayRefundId ? ` (Razorpay ${result.razorpayRefundId})` : ''
        notifySuccess(
          result?.emailSent
            ? `Subscription cancelled — ${result.refund.amount} ${result.refund.currency} refund initiated${ref} and student emailed`
            : `Subscription cancelled — ${result.refund.amount} ${result.refund.currency} refund initiated${ref}`,
        )
      } else {
        notifySuccess(
          result?.emailSent
            ? 'Subscription updated — student notified by email'
            : 'Subscription updated',
        )
      }
      setCancelTarget(null)
      setCancelMode('period_end')
      void queryClient.invalidateQueries({ queryKey: qk })
    },
    onError: (err) => notifyError(handleApiError(err).message),
  })

  const cancelPreviewQuery = useQuery({
    queryKey: ['tests', 'subscriber-cancel-preview', cancelTarget?.uuid],
    queryFn: () => fetchTestSeriesSubscriberCancelPreview(cancelTarget.uuid),
    enabled: Boolean(cancelTarget?.uuid) && cancelMode === 'immediate_with_refund',
    staleTime: 0,
    refetchOnMount: 'always',
  })
  const cancelPreview = cancelPreviewQuery.data

  const pauseMu = useMutation({
    mutationFn: ({ uuid, reason }) =>
      pauseTestSeriesSubscriber(uuid, { reason: reason || undefined }),
    onSuccess: (result) => {
      if (result?.emailSent === false && result?.emailError) {
        notifyError(`Subscription paused, but email failed: ${result.emailError}`)
      } else {
        notifySuccess(
          result?.emailSent
            ? 'Subscription paused — student notified by email'
            : 'Subscription paused — student access is suspended',
        )
      }
      setPauseTarget(null)
      setPauseReason('')
      void queryClient.invalidateQueries({ queryKey: qk })
    },
    onError: (err) => notifyError(handleApiError(err).message),
  })

  const resumeMu = useMutation({
    mutationFn: (uuid) => resumeTestSeriesSubscriber(uuid),
    onSuccess: () => {
      notifySuccess('Subscription resumed')
      void queryClient.invalidateQueries({ queryKey: qk })
    },
    onError: (err) => notifyError(handleApiError(err).message),
  })

  const revokeMu = useMutation({
    mutationFn: (uuid) => revokeTestSeriesGrant(uuid),
    onSuccess: (result) => {
      if (result?.emailSent === false && result?.emailError) {
        notifyError(`Access revoked, but email failed: ${result.emailError}`)
      } else {
        notifySuccess(
          result?.emailSent
            ? 'Granted access revoked — student notified by email'
            : 'Granted access revoked',
        )
      }
      setRevokeTarget(null)
      void queryClient.invalidateQueries({ queryKey: qk })
    },
    onError: (err) => notifyError(handleApiError(err).message),
  })

  const actionBusy = cancelMu.isPending || pauseMu.isPending || resumeMu.isPending || revokeMu.isPending

  const rows = useMemo(() => data?.subscribers ?? [], [data])
  const pagination = data?.pagination ?? { page: 1, pageSize: 10, total: 0 }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 pb-4">
          <div>
            <CardTitle>Subscribers</CardTitle>
            <CardDescription>
              Students with membership subscriptions. See which features each plan unlocks, grant
              complimentary access, pause, or cancel subscriptions. Ending actions notify students by
              email.
            </CardDescription>
          </div>
          <Button type="button" size="sm" onClick={() => setGrantOpen(true)}>
            Grant access
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="subscriber-search">Search student</Label>
              <Input
                id="subscriber-search"
                placeholder="Name or email…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subscriber-status">Status</Label>
              <select
                id="subscriber-status"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value)
                  setPage(1)
                }}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value || 'all'} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subscriber-grant-type">Access type</Label>
              <select
                id="subscriber-grant-type"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={grantType}
                onChange={(e) => {
                  setGrantType(e.target.value)
                  setPage(1)
                }}
              >
                {GRANT_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value || 'all-grants'} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
            </div>
          ) : isError ? (
            <p className="text-sm text-destructive">{error?.message ?? 'Unable to load'}</p>
          ) : (
            <>
              <div className="overflow-x-auto rounded-md border border-border/60">
                <table className="w-full min-w-[1024px] text-left text-sm">
                  <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Student</th>
                      <th className="px-4 py-3 font-medium">Plan</th>
                      <th className="px-4 py-3 font-medium">Includes</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Provider</th>
                      <th className="px-4 py-3 font-medium">Period</th>
                      <th className="px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                          No subscriptions found.
                        </td>
                      </tr>
                    ) : (
                      rows.map((row) => {
                        const planMeta = formatPlanMeta(row)
                        const includes = formatEntitlementLabels(
                          row.entitlements ?? row.plan?.entitlements,
                          entitlementProducts,
                        )
                        const periodEnd = row.currentPeriodEnd
                          ? new Date(row.currentPeriodEnd).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : null
                        const periodStart = row.currentPeriodStart
                          ? new Date(row.currentPeriodStart).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : null
                        const adminGrant = isAdminGrant(row)

                        return (
                        <tr key={row.uuid} className="border-b border-border/60 last:border-0">
                          <td className="px-4 py-3">
                            <div>{row.user?.name || '—'}</div>
                            <div className="text-xs text-muted-foreground">{row.user?.email}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium">{formatPlanLabel(row)}</div>
                            {row.planRemoved ? (
                              <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400">
                                Plan removed from catalog
                              </p>
                            ) : null}
                            {planMeta ? (
                              <div className="text-xs text-muted-foreground">{planMeta}</div>
                            ) : null}
                            {row.planKey ? (
                              <div className="mt-1 font-mono text-[11px] text-muted-foreground">
                                {row.planKey}
                              </div>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 text-xs">{includes}</td>
                          <td className="px-4 py-3">
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span
                                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(row.status)}`}
                                >
                                  {row.status.replace(/_/g, ' ')}
                                </span>
                                {adminGrant && row.status !== 'CANCELLED' && row.status !== 'COMPLETED' ? (
                                  <span className="inline-flex rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-800 dark:bg-violet-950 dark:text-violet-200">
                                    Granted
                                  </span>
                                ) : null}
                              </div>
                              {adminGrant && row.grantReason ? (
                                <p className="text-[11px] text-muted-foreground">
                                  Note: {row.grantReason}
                                </p>
                              ) : null}
                              {row.cancelAtPeriodEnd && row.status === 'ACTIVE' ? (
                                <p className="text-[11px] text-muted-foreground">
                                  Cancels at period end
                                  {row.planSunsetReason
                                    ? ` · ${PLAN_END_REASON_LABELS[row.planSunsetReason] ?? row.planSunsetReason}`
                                    : ''}
                                </p>
                              ) : null}
                              {row.cancelAtPeriodEnd && row.status === 'PAUSED' ? (
                                <p className="text-[11px] text-muted-foreground">
                                  Scheduled to end at period close
                                </p>
                              ) : null}
                              {row.cancelledAt ? (
                                <p className="text-[11px] text-muted-foreground">
                                  Cancelled{' '}
                                  {new Date(row.cancelledAt).toLocaleDateString(undefined, {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })}
                                </p>
                              ) : null}
                              {row.status === 'PAUSED' && row.pauseReason ? (
                                <p className="text-[11px] text-muted-foreground">
                                  Reason: {row.pauseReason}
                                </p>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs">
                            <div>{formatProviderLabel(row)}</div>
                            {formatExternalSubscriptionRef(row.externalSubscriptionId, row) ? (
                              <div
                                className="mt-1 max-w-[14rem] break-all font-mono text-[11px] text-muted-foreground"
                                title={row.externalSubscriptionId ?? undefined}
                              >
                                {formatExternalSubscriptionRef(row.externalSubscriptionId, row)}
                              </div>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            {periodStart || periodEnd ? (
                              <div className="space-y-0.5">
                                {periodStart ? <div>From {periodStart}</div> : null}
                                {periodEnd ? <div>Until {periodEnd}</div> : null}
                              </div>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {row.status === 'PAUSED' ? (
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={actionBusy}
                                  onClick={() => resumeMu.mutate(row.uuid)}
                                >
                                  Resume
                                </Button>
                                {adminGrant ? (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="destructive"
                                    disabled={actionBusy}
                                    onClick={() =>
                                      setRevokeTarget({
                                        uuid: row.uuid,
                                        name: row.user?.name || row.user?.email || 'Student',
                                        email: row.user?.email,
                                        planLabel: formatPlanLabel(row),
                                      })
                                    }
                                  >
                                    Revoke
                                  </Button>
                                ) : null}
                              </div>
                            ) : row.status === 'ACTIVE' || row.status === 'PAST_DUE' ? (
                              <div className="flex flex-wrap gap-2">
                                {adminGrant ? (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="destructive"
                                    disabled={actionBusy}
                                    onClick={() =>
                                      setRevokeTarget({
                                        uuid: row.uuid,
                                        name: row.user?.name || row.user?.email || 'Student',
                                        email: row.user?.email,
                                        planLabel: formatPlanLabel(row),
                                      })
                                    }
                                  >
                                    Revoke
                                  </Button>
                                ) : (
                                  <>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="secondary"
                                      disabled={actionBusy}
                                      onClick={() => {
                                        setPauseReason('')
                                        setPauseTarget({
                                          uuid: row.uuid,
                                          name: row.user?.name || row.user?.email || 'Student',
                                          email: row.user?.email,
                                        })
                                      }}
                                    >
                                      Pause
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      disabled={actionBusy}
                                      onClick={() => {
                                        setCancelMode('period_end')
                                        setCancelTarget({
                                          uuid: row.uuid,
                                          name: row.user?.name || row.user?.email || 'Student',
                                          email: row.user?.email,
                                          planLabel: formatPlanLabel(row),
                                          periodEnd,
                                        })
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                  </>
                                )}
                              </div>
                            ) : (
                              '—'
                            )}
                          </td>
                        </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <DataTablePagination
                page={pagination.page}
                pageSize={pagination.pageSize}
                total={pagination.total}
                onPageChange={setPage}
                onPageSizeChange={(size) => {
                  setPageSize(size)
                  setPage(1)
                }}
              />
            </>
          )}
        </CardContent>
      </Card>

      <ActionConfirmDialog
        open={Boolean(pauseTarget)}
        title="Pause this subscription?"
        description={
          pauseTarget ? (
            <>
              You are about to pause membership for <strong>{pauseTarget.name}</strong>
              {pauseTarget.email ? (
                <>
                  {' '}
                  (<span className="text-foreground">{pauseTarget.email}</span>)
                </>
              ) : null}
              .
            </>
          ) : null
        }
        confirmLabel="Continue"
        cancelLabel="Cancel"
        confirmVariant="secondary"
        loading={pauseMu.isPending}
        onClose={() => {
          if (pauseMu.isPending) return
          setPauseTarget(null)
          setPauseReason('')
        }}
        onConfirm={() =>
          pauseTarget &&
          pauseMu.mutate({ uuid: pauseTarget.uuid, reason: pauseReason.trim() })
        }
      >
        <ActionImpactList
          items={[
            'Test series and question bank access stop immediately.',
            'Billing is paused in Razorpay when applicable.',
            'The student receives an email (your reason below is included if provided).',
            'You can resume the subscription later from this page.',
          ]}
        />
        <div className="space-y-2">
          <Label htmlFor="pause-reason">Reason for student email (optional)</Label>
          <Input
            id="pause-reason"
            placeholder="e.g. Unusual activity flagged for review"
            value={pauseReason}
            onChange={(e) => setPauseReason(e.target.value)}
            disabled={pauseMu.isPending}
          />
        </div>
      </ActionConfirmDialog>

      <ActionConfirmDialog
        open={Boolean(cancelTarget)}
        title="Cancel subscription?"
        description={
          cancelTarget ? (
            <>
              Choose how to cancel membership for <strong>{cancelTarget.name}</strong>
              {cancelTarget.email ? (
                <>
                  {' '}
                  (<span className="text-foreground">{cancelTarget.email}</span>)
                </>
              ) : null}
              {cancelTarget.planLabel ? (
                <>
                  {' '}
                  on plan <strong>{cancelTarget.planLabel}</strong>
                </>
              ) : null}
              .
            </>
          ) : null
        }
        confirmLabel={
          cancelMode === 'immediate_with_refund'
            ? 'Continue — cancel and refund'
            : cancelMode === 'immediate'
              ? 'Continue — cancel now'
              : 'Continue — cancel at period end'
        }
        cancelLabel="Cancel"
        confirmVariant={
          cancelMode === 'period_end' ? 'secondary' : 'destructive'
        }
        loading={cancelMu.isPending}
        confirmDisabled={
          cancelMode === 'immediate_with_refund' &&
          (cancelPreviewQuery.isLoading ||
            cancelPreviewQuery.isError ||
            !cancelPreview?.refundAvailable)
        }
        onClose={() => {
          if (cancelMu.isPending) return
          setCancelTarget(null)
          setCancelMode('period_end')
        }}
        onConfirm={() => {
          if (!cancelTarget) return
          if (cancelMode === 'immediate_with_refund') {
            cancelMu.mutate({
              uuid: cancelTarget.uuid,
              immediate: true,
              refundRemaining: true,
            })
            return
          }
          cancelMu.mutate({
            uuid: cancelTarget.uuid,
            immediate: cancelMode === 'immediate',
          })
        }}
      >
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">How should this subscription end?</legend>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/60 p-3 has-[:checked]:border-primary has-[:checked]:bg-muted/30">
            <input
              type="radio"
              name="cancel-mode"
              className="mt-0.5"
              checked={cancelMode === 'period_end'}
              onChange={() => setCancelMode('period_end')}
              disabled={cancelMu.isPending}
            />
            <span className="text-sm">
              <span className="font-medium text-foreground">Cancel at period end</span>
              <span className="mt-0.5 block text-muted-foreground">
                Student keeps access until{' '}
                {cancelTarget?.periodEnd ?? 'the end of their billing period'}. Auto-renewal stops.
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/60 p-3 has-[:checked]:border-destructive has-[:checked]:bg-destructive/5">
            <input
              type="radio"
              name="cancel-mode"
              className="mt-0.5"
              checked={cancelMode === 'immediate'}
              onChange={() => setCancelMode('immediate')}
              disabled={cancelMu.isPending}
            />
            <span className="text-sm">
              <span className="font-medium text-foreground">Cancel now</span>
              <span className="mt-0.5 block text-muted-foreground">
                Access ends immediately. No refund is issued.
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/60 p-3 has-[:checked]:border-destructive has-[:checked]:bg-destructive/5">
            <input
              type="radio"
              name="cancel-mode"
              className="mt-0.5"
              checked={cancelMode === 'immediate_with_refund'}
              onChange={() => setCancelMode('immediate_with_refund')}
              disabled={cancelMu.isPending}
            />
            <span className="text-sm">
              <span className="font-medium text-foreground">
                Cancel now with refund for remaining period
              </span>
              <span className="mt-0.5 block text-muted-foreground">
                Access ends immediately. A prorated refund is issued for unused time in the
                current billing cycle (Razorpay only).
              </span>
              {cancelMode === 'immediate_with_refund' ? (
                <span className="mt-2 block text-muted-foreground">
                  {cancelPreviewQuery.isLoading ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Loader2 className="size-3.5 animate-spin" aria-hidden />
                      Calculating refund…
                    </span>
                  ) : cancelPreviewQuery.isError ? (
                    'Could not load refund estimate.'
                  ) : cancelPreview?.refundAvailable ? (
                    <>
                      Estimated refund:{' '}
                      <span className="font-medium text-foreground">
                        {cancelPreview.estimatedRefundAmount} {cancelPreview.currency}
                      </span>
                      {cancelPreview.daysRemaining > 0 && cancelPreview.daysInPeriod > 0 ? (
                        <>
                          {' '}
                          ({cancelPreview.daysRemaining} of {cancelPreview.daysInPeriod} days
                          remaining)
                        </>
                      ) : null}
                    </>
                  ) : (
                    cancelPreview?.refundUnavailableReason ??
                    'Refund is not available for this subscription.'
                  )}
                </span>
              ) : null}
            </span>
          </label>
        </fieldset>
        <ActionImpactList
          items={
            cancelMode === 'immediate_with_refund'
              ? [
                  cancelPreview?.refundAvailable
                    ? `A prorated refund of ${cancelPreview.estimatedRefundAmount} ${cancelPreview.currency} is initiated via Razorpay.`
                    : 'Refund could not be calculated — choose another option or try again.',
                  'Membership access ends immediately — test series and question bank are locked.',
                  'The subscription is cancelled in Razorpay.',
                  'The student receives an email that their membership has ended.',
                  'Refunds may take a few business days to appear on the student’s statement.',
                ]
              : cancelMode === 'immediate'
              ? [
                  'Membership access ends immediately — test series and question bank are locked.',
                  'The subscription is cancelled in Razorpay when applicable.',
                  'The student receives an email that their membership has ended.',
                  'This cannot be undone from the admin panel; grant access again if needed.',
                ]
              : [
                  cancelTarget?.periodEnd
                    ? `The student keeps access until ${cancelTarget.periodEnd}.`
                    : 'The student keeps access until the end of their current billing period.',
                  'Auto-renewal stops; the subscription ends after that date.',
                  'Razorpay is set to cancel at cycle end when applicable.',
                  'The student receives an email about the scheduled end.',
                ]
          }
        />
      </ActionConfirmDialog>

      <ActionConfirmDialog
        open={Boolean(revokeTarget)}
        title="Revoke granted access?"
        description={
          revokeTarget ? (
            <>
              Remove complimentary access for <strong>{revokeTarget.name}</strong>
              {revokeTarget.email ? (
                <>
                  {' '}
                  (<span className="text-foreground">{revokeTarget.email}</span>)
                </>
              ) : null}
              {revokeTarget.planLabel ? (
                <>
                  {' '}
                  on plan <strong>{revokeTarget.planLabel}</strong>
                </>
              ) : null}
              . Access ends immediately.
            </>
          ) : null
        }
        confirmLabel="Revoke access"
        cancelLabel="Keep access"
        confirmVariant="destructive"
        loading={revokeMu.isPending}
        onClose={() => {
          if (revokeMu.isPending) return
          setRevokeTarget(null)
        }}
        onConfirm={() => revokeTarget && revokeMu.mutate(revokeTarget.uuid)}
      >
        <ActionImpactList
          items={[
            'Test series and question bank access stop immediately.',
            'This only applies to admin-granted complimentary access.',
            'The student receives an email that their membership has ended.',
            'You can grant access again later from this page or the Users page.',
          ]}
        />
      </ActionConfirmDialog>

      <GrantAccessDialog
        open={grantOpen}
        onOpenChange={setGrantOpen}
        onSuccess={() => {
          void queryClient.invalidateQueries({ queryKey: qk })
        }}
      />
    </div>
  )
}
