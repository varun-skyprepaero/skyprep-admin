import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable, DataTableContent, dataTableSelectClass } from '@/components/ui/data-table'
import { fetchMyEntries } from '@/features/review/api/review-api'
import { ReviewStatusBadge } from '@/features/review/components/review-status-badge'
import { PaymentStatusBadge } from '@/features/review/components/payment-status-badge'
import { REVIEW_ENTITY_LABELS } from '@/features/review/constants'

function formatDate(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

function entityLabel(item) {
  return item.entityLabel ?? REVIEW_ENTITY_LABELS[item.entityType] ?? item.entityType
}

function StatCard({ label, value, accent }) {
  return (
    <div className="rounded-lg border bg-card px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={'mt-1 text-2xl font-semibold ' + (accent ?? '')}>{value}</div>
    </div>
  )
}

export function MyEntriesTab() {
  const [typeFilter, setTypeFilter] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('')

  const query = useQuery({
    queryKey: ['review', 'my-entries'],
    queryFn: () => fetchMyEntries(),
  })

  const items = query.data?.items ?? []
  const totals = query.data?.totals ?? { total: 0, accepted: 0, payable: 0, paid: 0, unpaid: 0 }
  const batches = query.data?.batches ?? []

  const typeOptions = useMemo(() => {
    const set = new Set(items.map((it) => it.entityType))
    return [...set]
  }, [items])

  const displayed = useMemo(
    () =>
      items.filter(
        (it) =>
          (!typeFilter || it.entityType === typeFilter) &&
          (!paymentFilter || it.paymentStatus === paymentFilter),
      ),
    [items, typeFilter, paymentFilter],
  )

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total entries" value={totals.total} />
        <StatCard label="Accepted" value={totals.accepted} accent="text-emerald-600 dark:text-emerald-400" />
        <StatCard label="Awaiting payment" value={totals.payable} accent="text-amber-600 dark:text-amber-400" />
        <StatCard label="Paid" value={totals.paid} accent="text-emerald-700 dark:text-emerald-400" />
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle>My entries</CardTitle>
          <CardDescription>
            Everything you have authored, with its review and payment state.
          </CardDescription>
        </CardHeader>
        <DataTable>
          <div className="flex flex-wrap items-center gap-2 border-b border-border/80 bg-muted/30 px-4 py-3 lg:px-6">
            <span className="text-sm text-muted-foreground">Type</span>
            <select
              className={dataTableSelectClass}
              aria-label="Filter by type"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">All types</option>
              {typeOptions.map((t) => (
                <option key={t} value={t}>
                  {REVIEW_ENTITY_LABELS[t] ?? t}
                </option>
              ))}
            </select>
            <span className="ml-2 text-sm text-muted-foreground">Payment</span>
            <select
              className={dataTableSelectClass}
              aria-label="Filter by payment"
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
            >
              <option value="">All</option>
              <option value="UNPAID">Unpaid</option>
              <option value="PAID">Paid</option>
            </select>
          </div>
          <DataTableContent>
            {query.isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
              </div>
            ) : query.isError ? (
              <p className="p-6 text-sm text-destructive">
                {query.error?.message ?? 'Unable to load your entries'}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Type</th>
                      <th className="px-4 py-3 font-medium">Item</th>
                      <th className="px-4 py-3 font-medium">Review</th>
                      <th className="px-4 py-3 font-medium">Payment</th>
                      <th className="px-4 py-3 font-medium">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayed.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                          No entries yet.
                        </td>
                      </tr>
                    ) : (
                      displayed.map((item) => (
                        <tr
                          key={`${item.entityType}:${item.uuid}`}
                          className="border-b border-border/60 align-top last:border-0"
                        >
                          <td className="px-4 py-3 text-xs">{entityLabel(item)}</td>
                          <td className="max-w-sm px-4 py-3">
                            <span className="line-clamp-2">{item.title || item.uuid}</span>
                          </td>
                          <td className="px-4 py-3">
                            <ReviewStatusBadge status={item.reviewStatus} />
                          </td>
                          <td className="px-4 py-3">
                            <PaymentStatusBadge status={item.paymentStatus} />
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {formatDate(item.createdAt)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </DataTableContent>
        </DataTable>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Payout history</CardTitle>
          <CardDescription>Payments recorded against your accepted work.</CardDescription>
        </CardHeader>
        <CardContent>
          {batches.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No payouts recorded yet.</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {batches.map((b) => (
                <li key={b.uuid} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div>
                    <div className="font-medium">
                      {b.itemCount} item{b.itemCount === 1 ? '' : 's'} paid
                    </div>
                    {b.note ? (
                      <div className="text-xs text-muted-foreground">{b.note}</div>
                    ) : null}
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <div>{formatDate(b.createdAt)}</div>
                    {b.createdBy?.name ? <div>by {b.createdBy.name}</div> : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
