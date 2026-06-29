import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
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
  fetchTestSeriesSubscribers,
  grantTestSeriesSubscription,
} from '@/features/tests/api/tests-api'
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

export default function SubscribersPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [grantOpen, setGrantOpen] = useState(false)
  const [grantForm, setGrantForm] = useState({
    email: '',
    planKey: '',
    periodEnd: '',
  })

  const { data, isLoading, isError, error } = useQuery({
    queryKey: [...qk, search, status, page, pageSize],
    queryFn: () =>
      fetchTestSeriesSubscribers({
        q: search || undefined,
        status: status || undefined,
        page,
        pageSize,
      }),
  })

  const { data: plans = [] } = useQuery({
    queryKey: ['tests', 'subscription-plans'],
    queryFn: fetchSubscriptionPlans,
  })

  const cancelMu = useMutation({
    mutationFn: ({ uuid, immediate }) => cancelTestSeriesSubscriber(uuid, { immediate }),
    onSuccess: () => {
      notifySuccess('Subscription updated')
      void queryClient.invalidateQueries({ queryKey: qk })
    },
    onError: (err) => notifyError(handleApiError(err).message),
  })

  const grantMu = useMutation({
    mutationFn: () =>
      grantTestSeriesSubscription({
        email: grantForm.email.trim(),
        planKey: grantForm.planKey,
        periodEnd: grantForm.periodEnd.trim()
          ? new Date(grantForm.periodEnd).toISOString()
          : undefined,
      }),
    onSuccess: () => {
      notifySuccess('Access granted')
      setGrantOpen(false)
      void queryClient.invalidateQueries({ queryKey: qk })
    },
    onError: (err) => notifyError(handleApiError(err).message),
  })

  const rows = useMemo(() => data?.subscribers ?? [], [data])
  const pagination = data?.pagination ?? { page: 1, pageSize: 10, total: 0 }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 pb-4">
          <div>
            <CardTitle>Subscribers</CardTitle>
            <CardDescription>
              Students with test series subscriptions. Grant complimentary access or cancel
              subscriptions.
            </CardDescription>
          </div>
          <Button type="button" size="sm" onClick={() => setGrantOpen(true)}>
            Grant access
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
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
                <table className="w-full min-w-[880px] text-left text-sm">
                  <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Student</th>
                      <th className="px-4 py-3 font-medium">Product</th>
                      <th className="px-4 py-3 font-medium">Plan</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Provider</th>
                      <th className="px-4 py-3 font-medium">Period end</th>
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
                      rows.map((row) => (
                        <tr key={row.uuid} className="border-b border-border/60 last:border-0">
                          <td className="px-4 py-3">
                            <div>{row.user?.name || '—'}</div>
                            <div className="text-xs text-muted-foreground">{row.user?.email}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div>{row.product?.shortTitle ?? row.productType ?? '—'}</div>
                            <div className="text-xs text-muted-foreground">
                              {row.product?.type ?? row.productType ?? ''}
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs">{row.planKey ?? '—'}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(row.status)}`}
                            >
                              {row.status.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs">{row.paymentProvider}</td>
                          <td className="px-4 py-3 text-xs">
                            {row.currentPeriodEnd
                              ? new Date(row.currentPeriodEnd).toLocaleDateString()
                              : '—'}
                          </td>
                          <td className="px-4 py-3">
                            {row.status === 'ACTIVE' || row.status === 'PAST_DUE' ? (
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={cancelMu.isPending}
                                  onClick={() =>
                                    cancelMu.mutate({ uuid: row.uuid, immediate: false })
                                  }
                                >
                                  Cancel at period end
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="destructive"
                                  disabled={cancelMu.isPending}
                                  onClick={() =>
                                    cancelMu.mutate({ uuid: row.uuid, immediate: true })
                                  }
                                >
                                  Cancel now
                                </Button>
                              </div>
                            ) : (
                              '—'
                            )}
                          </td>
                        </tr>
                      ))
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

      {grantOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Grant complimentary access</CardTitle>
            </CardHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                grantMu.mutate()
              }}
            >
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="grant-email">Student email</Label>
                  <Input
                    id="grant-email"
                    type="email"
                    value={grantForm.email}
                    onChange={(e) => setGrantForm((s) => ({ ...s, email: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="grant-plan">Plan</Label>
                  <select
                    id="grant-plan"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={grantForm.planKey}
                    onChange={(e) => setGrantForm((s) => ({ ...s, planKey: e.target.value }))}
                    required
                  >
                    <option value="">Select plan…</option>
                    {plans.map((p) => (
                      <option key={p.uuid} value={p.planKey}>
                        {p.label} ({p.interval})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="grant-end">Period end (optional)</Label>
                  <Input
                    id="grant-end"
                    type="datetime-local"
                    value={grantForm.periodEnd}
                    onChange={(e) => setGrantForm((s) => ({ ...s, periodEnd: e.target.value }))}
                  />
                </div>
              </CardContent>
              <div className="flex justify-end gap-2 border-t p-4">
                <Button type="button" variant="outline" onClick={() => setGrantOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={grantMu.isPending}>
                  {grantMu.isPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                  Grant
                </Button>
              </div>
            </form>
          </Card>
        </div>
      ) : null}
    </div>
  )
}
