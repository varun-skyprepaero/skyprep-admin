import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Plus, RefreshCw } from 'lucide-react'
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
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/ui/modal'
import { usePaginatedRows } from '@/hooks/use-paginated-rows'
import {
  createSubscriptionPlan,
  deleteSubscriptionPlan,
  fetchPlanSunsetPreview,
  fetchSubscriptionPlans,
  resyncSubscriptionPlan,
  sunsetSubscriptionPlan,
  updateSubscriptionPlan,
} from '@/features/tests/api/tests-api'
import { hasPermission } from '@/features/auth/lib/admin-section-access'
import { useAuthStore } from '@/stores/auth-store'
import { usePermissionsStore } from '@/stores/permissions-store'
import { CURRENCY_OPTIONS } from '@/features/tests/constants'
import { handleApiError } from '@/lib/http/api-error'
import { notifyError, notifySuccess } from '@/lib/notifications'

const qk = ['tests', 'subscription-plans']

const DEFAULT_ENTITLEMENTS = ['test_series', 'question_bank']

const selectClass =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'

const MARKET_OPTIONS = [
  { value: 'IN', label: 'India' },
  { value: 'INTL', label: 'International (rest of world)' },
]

const MARKET_FILTER_OPTIONS = [{ value: '', label: 'All markets' }, ...MARKET_OPTIONS]

const INTERVAL_FILTER_OPTIONS = [
  { value: '', label: 'All intervals' },
  { value: 'month', label: 'Monthly' },
  { value: 'year', label: 'Yearly' },
]

const ACTIVE_FILTER_OPTIONS = [
  { value: '', label: 'All plans' },
  { value: 'active', label: 'Active only' },
  { value: 'inactive', label: 'Inactive only' },
]

/** Always refetch — global staleTime is 60s and subscriber counts change often. */
const subscriberPreviewQueryOptions = {
  staleTime: 0,
  gcTime: 0,
  refetchOnMount: 'always',
}

function readSubscriberPreviewCounts(data) {
  const eligible = data?.eligibleSubscriberCount ?? 0
  const alreadyScheduled = data?.alreadyScheduledCount ?? 0
  const totalAffected = data?.totalAffectedCount ?? eligible + alreadyScheduled
  return { eligible, alreadyScheduled, totalAffected }
}

function isSubscriberPreviewLoading(query) {
  return query.isLoading || query.isFetching
}

export default function SubscriptionPlansPage() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const matrix = usePermissionsStore((s) => s.matrix)
  const canDelete = hasPermission(matrix, 'tests.subscription_plans', 'delete', user)
  const canEdit = hasPermission(matrix, 'tests.subscription_plans', 'edit', user)
  const [search, setSearch] = useState('')
  const [marketFilter, setMarketFilter] = useState('')
  const [intervalFilter, setIntervalFilter] = useState('')
  const [activeFilter, setActiveFilter] = useState('')
  const [dialog, setDialog] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteForm, setDeleteForm] = useState({
    reason: 'plan_discontinued',
    resendEmails: false,
  })
  const [sunsetTarget, setSunsetTarget] = useState(null)
  const [editSunsetConfirmOpen, setEditSunsetConfirmOpen] = useState(false)
  const [sunsetForm, setSunsetForm] = useState({
    reason: 'plan_updated',
    deactivatePlan: true,
    resendEmails: false,
  })
  const [form, setForm] = useState({
    label: '',
    description: '',
    interval: 'month',
    market: 'IN',
    priceAmount: '',
    currency: 'INR',
    isActive: true,
    entitlements: [...DEFAULT_ENTITLEMENTS],
    sunsetSubscribers: true,
    sunsetReason: 'plan_updated',
    sunsetResendEmails: false,
  })

  const { data: plansPayload, isLoading, isError, error } = useQuery({
    queryKey: qk,
    queryFn: fetchSubscriptionPlans,
  })

  const entitlementProducts = useMemo(
    () => (Array.isArray(plansPayload?.entitlementProducts) ? plansPayload.entitlementProducts : []),
    [plansPayload],
  )

  const createMu = useMutation({
    mutationFn: () =>
      createSubscriptionPlan({
        label: form.label.trim(),
        description: form.description.trim() || undefined,
        market: form.market,
        currency: form.currency,
        isActive: form.isActive,
        entitlements: form.entitlements,
        interval: form.interval,
        priceAmount: form.priceAmount,
      }),
    onSuccess: () => {
      notifySuccess('Subscription plan created')
      void queryClient.invalidateQueries({ queryKey: qk })
      setDialog(null)
    },
    onError: (err) => notifyError(handleApiError(err).message),
  })

  const updateMu = useMutation({
    mutationFn: async () => {
      const plan = await updateSubscriptionPlan(dialog.uuid, {
        label: form.label.trim(),
        description: form.description.trim(),
        interval: form.interval,
        priceAmount: form.priceAmount,
        currency: form.currency,
        isActive: form.isActive,
        entitlements: form.entitlements,
      })
      const shouldSunset =
        dialog?.mode === 'edit' &&
        dialog.initialIsActive &&
        !form.isActive &&
        form.sunsetSubscribers
      if (!shouldSunset) return { plan, sunset: null }
      const sunset = await sunsetSubscriptionPlan(dialog.uuid, {
        reason: form.sunsetReason,
        deactivatePlan: false,
        resendEmails: form.sunsetResendEmails,
      })
      return { plan, sunset }
    },
    onSuccess: (result) => {
      if (result?.sunset) {
        const failures = Array.isArray(result.sunset.failures) ? result.sunset.failures.length : 0
        notifySuccess(
          failures > 0
            ? `Plan updated. Scheduled ${result.sunset.scheduled} subscriber(s) and sent ${result.sunset.emailsSent} email(s). ${failures} issue(s) — check logs.`
            : `Plan updated. Scheduled ${result.sunset.scheduled} subscriber(s) to end at period close and sent ${result.sunset.emailsSent} email(s).`,
        )
        void queryClient.invalidateQueries({ queryKey: ['tests', 'subscribers'] })
      } else {
        notifySuccess('Subscription plan updated')
      }
      void queryClient.invalidateQueries({ queryKey: qk })
      setDialog(null)
      setEditSunsetConfirmOpen(false)
    },
    onError: (err) => notifyError(handleApiError(err).message),
  })

  const resyncMu = useMutation({
    mutationFn: (uuid) => resyncSubscriptionPlan(uuid),
    onSuccess: () => {
      notifySuccess('Razorpay sync completed')
      void queryClient.invalidateQueries({ queryKey: qk })
    },
    onError: (err) => notifyError(handleApiError(err).message),
  })

  const deleteMu = useMutation({
    mutationFn: () =>
      deleteSubscriptionPlan(deleteTarget.uuid, {
        reason: deleteForm.reason,
        resendEmails: deleteForm.resendEmails,
      }),
    onSuccess: (result) => {
      const failures = Array.isArray(result?.failures) ? result.failures.length : 0
      const scheduled = result?.scheduled ?? 0
      const emailsSent = result?.emailsSent ?? 0
      notifySuccess(
        failures > 0
          ? `Plan deleted. Scheduled ${scheduled} subscriber(s) and sent ${emailsSent} email(s). ${failures} issue(s) — check logs.`
          : scheduled > 0
            ? `Plan deleted. ${scheduled} subscriber(s) scheduled to end at period close and ${emailsSent} email(s) sent.`
            : 'Subscription plan deleted',
      )
      void queryClient.invalidateQueries({ queryKey: qk })
      void queryClient.invalidateQueries({ queryKey: ['tests', 'subscribers'] })
      setDeleteTarget(null)
    },
    onError: (err) => notifyError(handleApiError(err).message),
  })

  const deletePreviewQuery = useQuery({
    queryKey: ['tests', 'subscription-plan-sunset-preview', deleteTarget?.uuid, 'delete'],
    queryFn: () => fetchPlanSunsetPreview(deleteTarget.uuid),
    enabled: Boolean(deleteTarget?.uuid),
    ...subscriberPreviewQueryOptions,
  })

  const sunsetPreviewQuery = useQuery({
    queryKey: ['tests', 'subscription-plan-sunset-preview', sunsetTarget?.uuid],
    queryFn: () => fetchPlanSunsetPreview(sunsetTarget.uuid),
    enabled: Boolean(sunsetTarget?.uuid),
    ...subscriberPreviewQueryOptions,
  })

  const editSunsetPreviewQuery = useQuery({
    queryKey: ['tests', 'subscription-plan-sunset-preview', dialog?.uuid, 'edit'],
    queryFn: () => fetchPlanSunsetPreview(dialog.uuid),
    enabled:
      dialog?.mode === 'edit' &&
      Boolean(dialog?.uuid) &&
      dialog.initialIsActive &&
      !form.isActive,
    ...subscriberPreviewQueryOptions,
  })

  const sunsetMu = useMutation({
    mutationFn: () =>
      sunsetSubscriptionPlan(sunsetTarget.uuid, {
        reason: sunsetForm.reason,
        deactivatePlan: sunsetForm.deactivatePlan,
        resendEmails: sunsetForm.resendEmails,
      }),
    onSuccess: (result) => {
      const failures = Array.isArray(result?.failures) ? result.failures.length : 0
      notifySuccess(
        failures > 0
          ? `Scheduled ${result.scheduled} subscriber(s) and sent ${result.emailsSent} email(s). ${failures} issue(s) — check logs.`
          : `Scheduled ${result.scheduled} subscriber(s) to end at period close and sent ${result.emailsSent} email(s).`,
      )
      setSunsetTarget(null)
      void queryClient.invalidateQueries({ queryKey: qk })
      void queryClient.invalidateQueries({ queryKey: ['tests', 'subscribers'] })
    },
    onError: (err) => notifyError(handleApiError(err).message),
  })

  const rows = useMemo(
    () => (Array.isArray(plansPayload?.plans) ? plansPayload.plans : []),
    [plansPayload],
  )

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((row) => {
      if (marketFilter && row.market !== marketFilter) return false
      if (intervalFilter && row.interval !== intervalFilter) return false
      if (activeFilter === 'active' && row.isActive === false) return false
      if (activeFilter === 'inactive' && row.isActive !== false) return false
      if (!q) return true
      const label = String(row.label ?? '').toLowerCase()
      const planKey = String(row.planKey ?? '').toLowerCase()
      return label.includes(q) || planKey.includes(q)
    })
  }, [rows, search, marketFilter, intervalFilter, activeFilter])

  const { paginatedRows, paginationProps, resetPage } = usePaginatedRows(filteredRows)

  const busy = createMu.isPending || updateMu.isPending

  function openCreate(interval) {
    setForm({
      label: '',
      description: '',
      interval: interval === 'year' ? 'year' : 'month',
      market: 'IN',
      priceAmount: '',
      currency: 'INR',
      isActive: true,
      entitlements: [...DEFAULT_ENTITLEMENTS],
      sunsetSubscribers: true,
      sunsetReason: 'plan_updated',
      sunsetResendEmails: false,
    })
    setDialog({ mode: 'create' })
  }

  function openEdit(row) {
    const configured = Array.isArray(row.configuredEntitlements) ? row.configuredEntitlements : []
    setForm({
      label: row.label,
      description: typeof row.description === 'string' ? row.description : '',
      interval: row.interval === 'year' ? 'year' : 'month',
      market: row.market === 'INTL' ? 'INTL' : 'IN',
      priceAmount: row.priceAmount ?? '',
      currency: row.currency === 'USD' ? 'USD' : 'INR',
      isActive: row.isActive !== false,
      entitlements:
        configured.length > 0
          ? configured
          : Array.isArray(row.entitlements)
            ? row.entitlements
            : [...DEFAULT_ENTITLEMENTS],
      sunsetSubscribers: true,
      sunsetReason: 'plan_updated',
      sunsetResendEmails: false,
    })
    setDialog({ mode: 'edit', uuid: row.uuid, initialIsActive: row.isActive !== false })
  }

  function toggleEntitlement(productKey) {
    setForm((s) => {
      const set = new Set(s.entitlements)
      if (set.has(productKey)) set.delete(productKey)
      else set.add(productKey)
      return { ...s, entitlements: [...set] }
    })
  }

  function formatEntitlements(row) {
    const keys = Array.isArray(row.entitlements) ? row.entitlements : []
    if (keys.length === 0) return '—'
    const labels = keys.map((key) => {
      const product = entitlementProducts.find((p) => p.productKey === key)
      return product?.shortTitle ?? key
    })
    return labels.join(', ')
  }

  function submit(e) {
    e.preventDefault()
    if (dialog?.mode === 'create') {
      createMu.mutate()
      return
    }
    if (
      dialog?.mode === 'edit' &&
      dialog.initialIsActive &&
      !form.isActive &&
      form.sunsetSubscribers
    ) {
      setEditSunsetConfirmOpen(true)
      return
    }
    if (dialog?.mode === 'edit') updateMu.mutate()
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 pb-4">
          <div>
            <CardTitle>Subscription plans</CardTitle>
            <CardDescription>
              Create monthly and yearly plans separately for each market. Choose which features each
              plan unlocks when creating or editing a plan.
            </CardDescription>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => openCreate('month')}>
              <Plus className="size-4" aria-hidden />
              Add monthly plan
            </Button>
            <Button type="button" size="sm" onClick={() => openCreate('year')}>
              <Plus className="size-4" aria-hidden />
              Add yearly plan
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2 sm:col-span-2 lg:col-span-1">
              <Label htmlFor="plan-search">Search</Label>
              <Input
                id="plan-search"
                placeholder="Label or plan key…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  resetPage()
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-market">Market</Label>
              <select
                id="plan-market"
                className={selectClass}
                value={marketFilter}
                onChange={(e) => {
                  setMarketFilter(e.target.value)
                  resetPage()
                }}
              >
                {MARKET_FILTER_OPTIONS.map((opt) => (
                  <option key={opt.value || 'all'} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-interval">Interval</Label>
              <select
                id="plan-interval"
                className={selectClass}
                value={intervalFilter}
                onChange={(e) => {
                  setIntervalFilter(e.target.value)
                  resetPage()
                }}
              >
                {INTERVAL_FILTER_OPTIONS.map((opt) => (
                  <option key={opt.value || 'all'} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-active">Status</Label>
              <select
                id="plan-active"
                className={selectClass}
                value={activeFilter}
                onChange={(e) => {
                  setActiveFilter(e.target.value)
                  resetPage()
                }}
              >
                {ACTIVE_FILTER_OPTIONS.map((opt) => (
                  <option key={opt.value || 'all'} value={opt.value}>
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
                <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Label</th>
                    <th className="px-4 py-3 font-medium">Market</th>
                    <th className="px-4 py-3 font-medium">Interval</th>
                    <th className="px-4 py-3 font-medium">Price</th>
                    <th className="px-4 py-3 font-medium">Includes</th>
                    <th className="px-4 py-3 font-medium">Active</th>
                    <th className="px-4 py-3 font-medium">Razorpay</th>
                    <th className="px-4 py-3 font-medium">Sync</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                        {rows.length === 0
                          ? 'No subscription plans yet. Create your first plan to get started.'
                          : 'No subscription plans match your filters.'}
                      </td>
                    </tr>
                  ) : (
                    paginatedRows.map((row) => (
                      <tr key={row.uuid} className="border-b border-border/60 last:border-0">
                        <td className="px-4 py-3">
                          <div className="font-medium">{row.label}</div>
                          {row.description ? (
                            <p className="mt-1 max-w-xs text-xs text-muted-foreground line-clamp-2">
                              {row.description}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          {row.market === 'INTL' ? 'International' : 'India'}
                        </td>
                        <td className="px-4 py-3 capitalize">{row.interval}</td>
                        <td className="px-4 py-3">
                          {row.priceAmount} {row.currency}
                        </td>
                        <td className="px-4 py-3 text-xs">{formatEntitlements(row)}</td>
                        <td className="px-4 py-3">{row.isActive ? 'Yes' : 'No'}</td>
                        <td className="px-4 py-3 font-mono text-xs">{row.razorpayPlanId ?? '—'}</td>
                        <td className="px-4 py-3 text-xs">
                          {row.razorpaySyncStatus ?? '—'}
                          {row.razorpaySyncError ? (
                            <p className="mt-1 text-destructive">{row.razorpaySyncError}</p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => openEdit(row)}
                            >
                              Edit
                            </Button>
                            {row.razorpaySyncStatus === 'error' ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={resyncMu.isPending}
                                onClick={() => resyncMu.mutate(row.uuid)}
                              >
                                <RefreshCw className="size-4" aria-hidden />
                                Resync
                              </Button>
                            ) : null}
                            {canEdit ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  setSunsetForm({
                                    reason: 'plan_updated',
                                    deactivatePlan: true,
                                    resendEmails: false,
                                  })
                                  setSunsetTarget({
                                    uuid: row.uuid,
                                    label: row.label,
                                    market: row.market === 'INTL' ? 'International' : 'India',
                                    interval: row.interval,
                                  })
                                }}
                              >
                                End plan
                              </Button>
                            ) : null}
                            {canDelete ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                disabled={deleteMu.isPending}
                                onClick={() => {
                                  setDeleteForm({ reason: 'plan_discontinued', resendEmails: false })
                                  setDeleteTarget({
                                    uuid: row.uuid,
                                    label: row.label,
                                    market: row.market === 'INTL' ? 'International' : 'India',
                                    interval: row.interval,
                                  })
                                }}
                              >
                                Delete
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              </div>
              <DataTablePagination {...paginationProps} />
            </>
          )}
        </CardContent>
      </Card>

      {dialog ? (
      <Modal
        open
        onClose={() => !busy && setDialog(null)}
        size="sm"
        closeDisabled={busy}
      >
        <ModalHeader
          title={
            dialog.mode === 'create'
              ? `New ${form.interval === 'year' ? 'yearly' : 'monthly'} plan`
              : 'Edit subscription plan'
          }
          onClose={() => setDialog(null)}
          closeDisabled={busy}
        />
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <ModalBody className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="plan-label">Label</Label>
                  <Input
                    id="plan-label"
                    value={form.label}
                    onChange={(e) => setForm((s) => ({ ...s, label: e.target.value }))}
                    placeholder="e.g. Test series membership"
                    required
                    disabled={busy}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plan-description">Description</Label>
                  <textarea
                    id="plan-description"
                    className={`${selectClass} min-h-[88px] resize-y py-2`}
                    value={form.description}
                    onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
                    placeholder="Short copy shown on the classroom pricing page under this plan"
                    maxLength={2000}
                    disabled={busy}
                  />
                  <p className="text-xs text-muted-foreground">
                    Optional. Students see this under the plan price when browsing subscriptions.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="plan-market">Market</Label>
                    <select
                      id="plan-market"
                      className={selectClass}
                      value={form.market}
                      onChange={(e) => {
                        const market = e.target.value
                        setForm((s) => ({
                          ...s,
                          market,
                          currency: market === 'INTL' ? 'USD' : 'INR',
                        }))
                      }}
                      disabled={busy || dialog.mode === 'edit'}
                    >
                      {MARKET_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="plan-interval">Interval</Label>
                    <select
                      id="plan-interval"
                      className={selectClass}
                      value={form.interval}
                      onChange={(e) => setForm((s) => ({ ...s, interval: e.target.value }))}
                      disabled={busy || dialog.mode === 'edit' || dialog.mode === 'create'}
                    >
                      <option value="month">Monthly</option>
                      <option value="year">Yearly</option>
                    </select>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="plan-price">Price</Label>
                    <Input
                      id="plan-price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.priceAmount}
                      onChange={(e) => setForm((s) => ({ ...s, priceAmount: e.target.value }))}
                      required
                      disabled={busy}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="plan-currency">Currency</Label>
                    <select
                      id="plan-currency"
                      className={selectClass}
                      value={form.currency}
                      onChange={(e) => setForm((s) => ({ ...s, currency: e.target.value }))}
                      disabled={busy}
                    >
                      {CURRENCY_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <fieldset className="space-y-3 rounded-md border border-border/60 p-3">
                  <legend className="px-1 text-sm font-medium">Visibility</legend>
                  <label className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={form.isActive}
                      onChange={(e) => setForm((s) => ({ ...s, isActive: e.target.checked }))}
                      disabled={busy}
                    />
                    <span>
                      Active (visible to students for new signups)
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        Inactive plans are hidden from the pricing page. Existing subscribers keep
                        access until their billing period ends.
                      </span>
                    </span>
                  </label>

                  {dialog.mode === 'edit' && dialog.initialIsActive && !form.isActive ? (
                    <div className="space-y-3 border-t border-border/60 pt-3">
                      <label className="flex items-start gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          checked={form.sunsetSubscribers}
                          onChange={(e) =>
                            setForm((s) => ({ ...s, sunsetSubscribers: e.target.checked }))
                          }
                          disabled={busy}
                        />
                        <span>
                          End all current subscriptions at period close and email subscribers
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            Each subscriber is notified immediately with the reason you choose below.
                          </span>
                        </span>
                      </label>

                      {form.sunsetSubscribers ? (
                        <>
                          {editSunsetPreviewQuery.isLoading || editSunsetPreviewQuery.isFetching ? (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Loader2 className="size-3.5 animate-spin" aria-hidden />
                              Loading subscriber counts…
                            </div>
                          ) : editSunsetPreviewQuery.isError ? (
                            <p className="text-xs text-destructive">
                              {
                                handleApiError(
                                  editSunsetPreviewQuery.error,
                                  'Unable to load preview',
                                ).message
                              }
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              {(() => {
                                const { eligible, alreadyScheduled, totalAffected } =
                                  readSubscriberPreviewCounts(editSunsetPreviewQuery.data)
                                if (totalAffected === 0) {
                                  return 'No active subscribers on this plan.'
                                }
                                return `${totalAffected} on this plan (${eligible} newly scheduled${alreadyScheduled > 0 ? `, ${alreadyScheduled} already scheduled` : ''}).`
                              })()}
                            </p>
                          )}

                          {(editSunsetPreviewQuery.data?.alreadyScheduledCount ?? 0) > 0 ? (
                            <label className="flex items-start gap-2 text-sm">
                              <input
                                type="checkbox"
                                className="mt-0.5"
                                checked={form.sunsetResendEmails}
                                onChange={(e) =>
                                  setForm((s) => ({ ...s, sunsetResendEmails: e.target.checked }))
                                }
                                disabled={busy}
                              />
                              <span>
                                Resend email to already-scheduled subscribers
                              </span>
                            </label>
                          ) : null}

                          <div className="space-y-2">
                            <Label htmlFor="edit-sunset-reason">Reason (included in email)</Label>
                            <select
                              id="edit-sunset-reason"
                              className={selectClass}
                              value={form.sunsetReason}
                              onChange={(e) =>
                                setForm((s) => ({ ...s, sunsetReason: e.target.value }))
                              }
                              disabled={busy}
                              required
                            >
                              {(editSunsetPreviewQuery.data?.reasons ?? []).map((opt) => (
                                <option key={opt.key} value={opt.key}>
                                  {opt.label}
                                </option>
                              ))}
                              {!editSunsetPreviewQuery.data?.reasons?.length ? (
                                <>
                                  <option value="plan_updated">
                                    Plan updated — resubscribe to new plans
                                  </option>
                                  <option value="pricing_change">
                                    Pricing change — resubscribe at new rates
                                  </option>
                                  <option value="plan_discontinued">Plan discontinued</option>
                                  <option value="service_change">Service change</option>
                                </>
                              ) : null}
                            </select>
                          </div>
                        </>
                      ) : null}
                    </div>
                  ) : null}
                </fieldset>
                {entitlementProducts.length > 0 ? (
                  <fieldset className="space-y-2">
                    <legend className="text-sm font-medium">Plan includes</legend>
                    <p className="text-xs text-muted-foreground">
                      Students with this plan can access the selected features.
                    </p>
                    <div className="space-y-2 rounded-md border border-border/60 p-3">
                      {entitlementProducts.map((product) => (
                        <label key={product.productKey} className="flex items-start gap-2 text-sm">
                          <input
                            type="checkbox"
                            className="mt-0.5"
                            checked={form.entitlements.includes(product.productKey)}
                            onChange={() => toggleEntitlement(product.productKey)}
                            disabled={busy}
                          />
                          <span>
                            <span className="font-medium">{product.shortTitle}</span>
                            {product.description ? (
                              <span className="mt-0.5 block text-xs text-muted-foreground">
                                {product.description}
                              </span>
                            ) : null}
                          </span>
                        </label>
                      ))}
                    </div>
                    {form.entitlements.length === 0 ? (
                      <p className="text-xs text-destructive">Select at least one feature.</p>
                    ) : null}
                  </fieldset>
                ) : null}
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="outline" onClick={() => setDialog(null)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || form.entitlements.length === 0}>
              {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              Save
            </Button>
          </ModalFooter>
        </form>
      </Modal>
      ) : null}

      <ActionConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this subscription plan?"
        description={
          deleteTarget ? (
            <>
              You are about to permanently delete <strong>{deleteTarget.label}</strong> (
              {deleteTarget.market}, {deleteTarget.interval}).
            </>
          ) : null
        }
        confirmLabel="Continue"
        cancelLabel="Cancel"
        confirmVariant="destructive"
        loading={deleteMu.isPending}
        confirmDisabled={isSubscriberPreviewLoading(deletePreviewQuery)}
        onClose={() => !deleteMu.isPending && setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMu.mutate()}
      >
        {isSubscriberPreviewLoading(deletePreviewQuery) ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Loading subscriber counts…
          </div>
        ) : (
          <div className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3 text-sm space-y-1">
            {(() => {
              const { eligible, alreadyScheduled, totalAffected } = readSubscriberPreviewCounts(
                deletePreviewQuery.data,
              )
              return (
                <>
                  <p>
                    <strong>{totalAffected}</strong> subscriber(s) on this plan will be affected.
                  </p>
                  {eligible > 0 ? (
                    <p className="text-muted-foreground">
                      {eligible} will be newly scheduled to end at period close and emailed.
                    </p>
                  ) : null}
                  {alreadyScheduled > 0 ? (
                    <p className="text-muted-foreground">
                      {alreadyScheduled} already scheduled to end — plan metadata will be updated
                      {deleteForm.resendEmails ? ' and email resent if enabled below' : ''}.
                    </p>
                  ) : null}
                  {totalAffected === 0 ? (
                    <p className="text-muted-foreground">
                      No active, past due, or paused subscribers are on this plan right now.
                    </p>
                  ) : null}
                </>
              )
            })()}
          </div>
        )}
        <ActionImpactList
          items={[
            'The plan is removed from admin and hidden from new student signups.',
            'Subscriber records stay visible on the Subscribers page until their period ends.',
            'Each eligible student keeps access until their billing period ends, then membership ends.',
            'Razorpay subscriptions are set to cancel at cycle end when applicable.',
            'Students receive an email with the reason you choose below.',
          ]}
        />
        <div className="space-y-2">
          <Label htmlFor="delete-reason">Reason (included in email)</Label>
          <select
            id="delete-reason"
            className={selectClass}
            value={deleteForm.reason}
            onChange={(e) => setDeleteForm((s) => ({ ...s, reason: e.target.value }))}
            disabled={deleteMu.isPending}
          >
            {(deletePreviewQuery.data?.reasons ?? []).map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
            {!deletePreviewQuery.data?.reasons?.length ? (
              <option value="plan_discontinued">Plan discontinued</option>
            ) : null}
          </select>
        </div>
        {(deletePreviewQuery.data?.alreadyScheduledCount ?? 0) > 0 ? (
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={deleteForm.resendEmails}
              onChange={(e) => setDeleteForm((s) => ({ ...s, resendEmails: e.target.checked }))}
              disabled={deleteMu.isPending}
            />
            <span>Resend email to already-scheduled subscribers</span>
          </label>
        ) : null}
      </ActionConfirmDialog>

      <ActionConfirmDialog
        open={editSunsetConfirmOpen}
        title="Save and end subscriptions for this plan?"
        description={
          dialog?.mode === 'edit' ? (
            <>
              Saving will deactivate <strong>{form.label.trim() || 'this plan'}</strong> and schedule
              all subscribers on this plan to end at their billing period close.
            </>
          ) : null
        }
        confirmLabel="Continue"
        cancelLabel="Cancel"
        confirmVariant="secondary"
        loading={updateMu.isPending}
        confirmDisabled={isSubscriberPreviewLoading(editSunsetPreviewQuery)}
        onClose={() => !updateMu.isPending && setEditSunsetConfirmOpen(false)}
        onConfirm={() => updateMu.mutate()}
      >
        {editSunsetPreviewQuery.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Loading subscriber counts…
          </div>
        ) : (
          <ActionImpactList
            items={[
              `${editSunsetPreviewQuery.data?.eligibleSubscriberCount ?? 0} subscriber(s) will be scheduled to end at period close.`,
              (editSunsetPreviewQuery.data?.alreadyScheduledCount ?? 0) > 0
                ? `${editSunsetPreviewQuery.data.alreadyScheduledCount} already scheduled — only new schedules receive email unless resend is checked in the form.`
                : 'Each affected student receives an email immediately with the reason you selected.',
              'The plan is hidden from new signups after save.',
              'Existing subscribers keep access until their billing period ends.',
            ].filter(Boolean)}
          />
        )}
      </ActionConfirmDialog>

      <ActionConfirmDialog
        open={Boolean(sunsetTarget)}
        title="End plan for all subscribers?"
        description={
          sunsetTarget ? (
            <>
              This schedules every subscriber on <strong>{sunsetTarget.label}</strong> (
              {sunsetTarget.market}, {sunsetTarget.interval}) to stop at their own billing period
              end.
            </>
          ) : null
        }
        confirmLabel="Continue"
        cancelLabel="Cancel"
        confirmVariant="secondary"
        loading={sunsetMu.isPending}
        confirmDisabled={
          isSubscriberPreviewLoading(sunsetPreviewQuery) ||
          (() => {
            const { eligible, alreadyScheduled } = readSubscriberPreviewCounts(sunsetPreviewQuery.data)
            return (
              eligible === 0 &&
              !(sunsetForm.resendEmails && alreadyScheduled > 0)
            )
          })()
        }
        onClose={() => !sunsetMu.isPending && setSunsetTarget(null)}
        onConfirm={() => sunsetMu.mutate()}
      >
        {isSubscriberPreviewLoading(sunsetPreviewQuery) ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Loading subscriber counts…
          </div>
        ) : sunsetPreviewQuery.isError ? (
          <p className="text-sm text-destructive">
            {handleApiError(sunsetPreviewQuery.error, 'Unable to load preview').message}
          </p>
        ) : (
          <>
            <div className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3 text-sm space-y-1">
              {(() => {
                const { eligible, alreadyScheduled, totalAffected } = readSubscriberPreviewCounts(
                  sunsetPreviewQuery.data,
                )
                return (
                  <>
                    <p>
                      <strong>{totalAffected}</strong> subscriber(s) on this plan will be affected.
                    </p>
                    {eligible > 0 ? (
                      <p className="text-muted-foreground">
                        {eligible} will be newly scheduled to end at period close.
                      </p>
                    ) : null}
                    {alreadyScheduled > 0 ? (
                      <p className="text-muted-foreground">
                        {alreadyScheduled} already scheduled to end.
                      </p>
                    ) : null}
                  </>
                )
              })()}
            </div>
            <ActionImpactList
              items={[
                'Each eligible student keeps access until their current billing period ends.',
                'Razorpay subscriptions are set to cancel at cycle end when applicable.',
                'An email is sent immediately with the reason you choose below.',
                sunsetForm.deactivatePlan
                  ? 'This plan will be hidden from the student pricing page for new signups.'
                  : 'The plan stays visible for new signups unless you check deactivate below.',
              ]}
            />
          </>
        )}

        <div className="space-y-2">
          <Label htmlFor="sunset-reason">Reason (included in email)</Label>
          <select
            id="sunset-reason"
            className={selectClass}
            value={sunsetForm.reason}
            onChange={(e) => setSunsetForm((s) => ({ ...s, reason: e.target.value }))}
            disabled={sunsetMu.isPending}
          >
            {(sunsetPreviewQuery.data?.reasons ?? []).map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
            {!sunsetPreviewQuery.data?.reasons?.length ? (
              <>
                <option value="plan_updated">Plan updated — resubscribe to new plans</option>
                <option value="pricing_change">Pricing change — resubscribe at new rates</option>
                <option value="plan_discontinued">Plan discontinued</option>
                <option value="service_change">Service change</option>
              </>
            ) : null}
          </select>
        </div>

        {(sunsetPreviewQuery.data?.alreadyScheduledCount ?? 0) > 0 ? (
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={sunsetForm.resendEmails}
              onChange={(e) => setSunsetForm((s) => ({ ...s, resendEmails: e.target.checked }))}
              disabled={sunsetMu.isPending}
            />
            <span>
              Resend email to already-scheduled subscribers
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Use if a previous attempt logged but did not deliver email.
              </span>
            </span>
          </label>
        ) : null}

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={sunsetForm.deactivatePlan}
            onChange={(e) => setSunsetForm((s) => ({ ...s, deactivatePlan: e.target.checked }))}
            disabled={sunsetMu.isPending}
          />
          <span>
            Deactivate this plan for new signups
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Hides the plan from the student pricing page after this action.
            </span>
          </span>
        </label>
      </ActionConfirmDialog>
    </div>
  )
}
