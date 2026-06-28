import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Plus, RefreshCw } from 'lucide-react'
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog'
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
  createSubscriptionPlan,
  createSubscriptionPlanPair,
  deleteSubscriptionPlan,
  fetchSubscriptionPlans,
  resyncSubscriptionPlan,
  updateSubscriptionPlan,
} from '@/features/tests/api/tests-api'
import { hasPermission } from '@/features/auth/lib/admin-section-access'
import { useAuthStore } from '@/stores/auth-store'
import { usePermissionsStore } from '@/stores/permissions-store'
import { CURRENCY_OPTIONS } from '@/features/tests/constants'
import { handleApiError } from '@/lib/http/api-error'
import { notifyError, notifySuccess } from '@/lib/notifications'

const qk = ['tests', 'subscription-plans']

const selectClass =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'

const MARKET_OPTIONS = [
  { value: 'IN', label: 'India' },
  { value: 'INTL', label: 'International (rest of world)' },
]

export default function SubscriptionPlansPage() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const matrix = usePermissionsStore((s) => s.matrix)
  const canDelete = hasPermission(matrix, 'tests.subscription_plans', 'delete', user)
  const [dialog, setDialog] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [form, setForm] = useState({
    createMode: 'pair',
    label: '',
    interval: 'month',
    market: 'IN',
    priceAmount: '',
    monthlyPriceAmount: '',
    yearlyPriceAmount: '',
    currency: 'INR',
    isActive: true,
  })

  const { data = [], isLoading, isError, error } = useQuery({
    queryKey: qk,
    queryFn: fetchSubscriptionPlans,
  })

  const createMu = useMutation({
    mutationFn: () => {
      const shared = {
        label: form.label.trim(),
        market: form.market,
        currency: form.currency,
        isActive: form.isActive,
      }
      if (form.createMode === 'pair') {
        return createSubscriptionPlanPair({
          ...shared,
          monthlyPriceAmount: form.monthlyPriceAmount,
          yearlyPriceAmount: form.yearlyPriceAmount,
        })
      }
      return createSubscriptionPlan({
        ...shared,
        interval: form.interval,
        priceAmount: form.priceAmount,
      })
    },
    onSuccess: (result) => {
      notifySuccess(
        Array.isArray(result)
          ? 'Monthly and yearly plans created'
          : 'Subscription plan created',
      )
      void queryClient.invalidateQueries({ queryKey: qk })
      setDialog(null)
    },
    onError: (err) => notifyError(handleApiError(err).message),
  })

  const updateMu = useMutation({
    mutationFn: () =>
      updateSubscriptionPlan(dialog.uuid, {
        label: form.label.trim(),
        interval: form.interval,
        priceAmount: form.priceAmount,
        currency: form.currency,
        isActive: form.isActive,
      }),
    onSuccess: () => {
      notifySuccess('Subscription plan updated')
      void queryClient.invalidateQueries({ queryKey: qk })
      setDialog(null)
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
    mutationFn: (uuid) => deleteSubscriptionPlan(uuid),
    onSuccess: () => {
      notifySuccess('Subscription plan deleted')
      void queryClient.invalidateQueries({ queryKey: qk })
      setDeleteTarget(null)
    },
    onError: (err) => notifyError(handleApiError(err).message),
  })

  const rows = useMemo(() => (Array.isArray(data) ? data : []), [data])
  const busy = createMu.isPending || updateMu.isPending

  function openCreate() {
    setForm({
      createMode: 'pair',
      label: '',
      interval: 'month',
      market: 'IN',
      priceAmount: '',
      monthlyPriceAmount: '',
      yearlyPriceAmount: '',
      currency: 'INR',
      isActive: true,
    })
    setDialog({ mode: 'create' })
  }

  function openEdit(row) {
    setForm({
      createMode: 'single',
      label: row.label,
      interval: row.interval === 'year' ? 'year' : 'month',
      market: row.market === 'INTL' ? 'INTL' : 'IN',
      priceAmount: row.priceAmount ?? '',
      currency: row.currency === 'USD' ? 'USD' : 'INR',
      isActive: row.isActive !== false,
    })
    setDialog({ mode: 'edit', uuid: row.uuid })
  }

  function submit(e) {
    e.preventDefault()
    if (dialog?.mode === 'create') createMu.mutate()
    else if (dialog?.mode === 'edit') updateMu.mutate()
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 pb-4">
          <div>
            <CardTitle>Subscription plans</CardTitle>
            <CardDescription>
              Monthly and yearly plans for test series access. Create both intervals together or one
              at a time.
            </CardDescription>
          </div>
          <Button type="button" size="sm" onClick={openCreate}>
            <Plus className="size-4" aria-hidden />
            Add plan
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
            </div>
          ) : isError ? (
            <p className="text-sm text-destructive">{error?.message ?? 'Unable to load'}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Label</th>
                    <th className="px-4 py-3 font-medium">Market</th>
                    <th className="px-4 py-3 font-medium">Interval</th>
                    <th className="px-4 py-3 font-medium">Price</th>
                    <th className="px-4 py-3 font-medium">Active</th>
                    <th className="px-4 py-3 font-medium">Razorpay</th>
                    <th className="px-4 py-3 font-medium">Sync</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                        No subscription plans yet.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => (
                      <tr key={row.uuid} className="border-b border-border/60 last:border-0">
                        <td className="px-4 py-3">{row.label}</td>
                        <td className="px-4 py-3">
                          {row.market === 'INTL' ? 'International' : 'India'}
                        </td>
                        <td className="px-4 py-3 capitalize">{row.interval}</td>
                        <td className="px-4 py-3">
                          {row.priceAmount} {row.currency}
                        </td>
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
                            {canDelete ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                disabled={deleteMu.isPending}
                                onClick={() =>
                                  setDeleteTarget({
                                    uuid: row.uuid,
                                    label: row.label,
                                    market: row.market === 'INTL' ? 'International' : 'India',
                                    interval: row.interval,
                                  })
                                }
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
          )}
        </CardContent>
      </Card>

      {dialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>
                {dialog.mode === 'create' ? 'New subscription plans' : 'Edit subscription plan'}
              </CardTitle>
            </CardHeader>
            <form onSubmit={submit}>
              <CardContent className="space-y-4">
                {dialog.mode === 'create' ? (
                  <div className="space-y-2">
                    <Label htmlFor="plan-create-mode">Create</Label>
                    <select
                      id="plan-create-mode"
                      className={selectClass}
                      value={form.createMode}
                      onChange={(e) => setForm((s) => ({ ...s, createMode: e.target.value }))}
                      disabled={busy}
                    >
                      <option value="pair">Monthly + yearly together</option>
                      <option value="single">Single plan only</option>
                    </select>
                    <p className="text-xs text-muted-foreground">
                      {form.createMode === 'pair'
                        ? 'Creates both intervals for the selected market in one step.'
                        : 'Add only the monthly or yearly slot that is still missing.'}
                    </p>
                  </div>
                ) : null}
                <div className="space-y-2">
                  <Label htmlFor="plan-label">
                    {dialog.mode === 'create' && form.createMode === 'pair'
                      ? 'Plan name (base label)'
                      : 'Label'}
                  </Label>
                  <Input
                    id="plan-label"
                    value={form.label}
                    onChange={(e) => setForm((s) => ({ ...s, label: e.target.value }))}
                    placeholder={
                      form.createMode === 'pair' ? 'e.g. Test series membership' : undefined
                    }
                    required
                    disabled={busy}
                  />
                  {dialog.mode === 'create' && form.createMode === 'pair' ? (
                    <p className="text-xs text-muted-foreground">
                      Saved as “{form.label.trim() || '…'} — Monthly” and “… — Yearly”.
                    </p>
                  ) : null}
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
                  {dialog.mode === 'edit' || form.createMode === 'single' ? (
                    <div className="space-y-2">
                      <Label htmlFor="plan-interval">Interval</Label>
                      <select
                        id="plan-interval"
                        className={selectClass}
                        value={form.interval}
                        onChange={(e) => setForm((s) => ({ ...s, interval: e.target.value }))}
                        disabled={busy || dialog.mode === 'edit'}
                      >
                        <option value="month">Monthly</option>
                        <option value="year">Yearly</option>
                      </select>
                    </div>
                  ) : (
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
                  )}
                </div>
                {dialog.mode === 'create' && form.createMode === 'pair' ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="plan-monthly-price">Monthly price</Label>
                      <Input
                        id="plan-monthly-price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.monthlyPriceAmount}
                        onChange={(e) =>
                          setForm((s) => ({ ...s, monthlyPriceAmount: e.target.value }))
                        }
                        required
                        disabled={busy}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="plan-yearly-price">Yearly price</Label>
                      <Input
                        id="plan-yearly-price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.yearlyPriceAmount}
                        onChange={(e) =>
                          setForm((s) => ({ ...s, yearlyPriceAmount: e.target.value }))
                        }
                        required
                        disabled={busy}
                      />
                    </div>
                  </div>
                ) : (
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
                      <Label htmlFor="plan-currency-single">Currency</Label>
                      <select
                        id="plan-currency-single"
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
                )}
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm((s) => ({ ...s, isActive: e.target.checked }))}
                    disabled={busy}
                  />
                  Active (visible to students)
                </label>
              </CardContent>
              <div className="flex justify-end gap-2 border-t p-4">
                <Button type="button" variant="outline" onClick={() => setDialog(null)} disabled={busy}>
                  Cancel
                </Button>
                <Button type="submit" disabled={busy}>
                  {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                  Save
                </Button>
              </div>
            </form>
          </Card>
        </div>
      ) : null}

      <DeleteConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete subscription plan?"
        description={
          deleteTarget ? (
            <>
              This removes <strong>{deleteTarget.label}</strong> ({deleteTarget.market},{' '}
              {deleteTarget.interval}) and any student subscriptions tied to this plan key. This
              cannot be undone.
            </>
          ) : null
        }
        loading={deleteMu.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMu.mutate(deleteTarget.uuid)}
      />
    </div>
  )
}
