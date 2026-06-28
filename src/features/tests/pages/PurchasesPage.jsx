import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { fetchOneTimePurchases } from '@/features/tests/api/tests-api'

const qk = ['tests', 'purchases']

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'PAID', label: 'Paid' },
  { value: 'PENDING_PAYMENT', label: 'Pending payment' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'REFUNDED', label: 'Refunded' },
]

const CATALOG_OPTIONS = [
  { value: '', label: 'All products' },
  { value: 'exam', label: 'Exams' },
  { value: 'test_package', label: 'Test series' },
]

function formatMoney(amount, currency) {
  const n = Number(amount)
  if (!Number.isFinite(n)) return '—'
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency || 'INR',
      maximumFractionDigits: 2,
    }).format(n)
  } catch {
    return `${currency ?? ''} ${n.toFixed(2)}`.trim()
  }
}

function catalogLabel(catalog) {
  if (catalog === 'exam') return 'Exam'
  if (catalog === 'test_package') return 'Test series'
  return catalog || '—'
}

function statusBadgeClass(status) {
  switch (status) {
    case 'PAID':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
    case 'PENDING_PAYMENT':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
    case 'REFUNDED':
      return 'bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300'
    case 'CANCELLED':
      return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

export default function PurchasesPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [catalog, setCatalog] = useState('')

  const { data, isLoading, isError, error } = useQuery({
    queryKey: [...qk, search, status, catalog],
    queryFn: () =>
      fetchOneTimePurchases({
        q: search || undefined,
        status: status || undefined,
        catalog: catalog || undefined,
      }),
  })

  const rows = useMemo(() => data?.orders ?? [], [data])

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle>One-time purchases</CardTitle>
          <CardDescription>
            Exam checkouts and other one-time Razorpay orders. Subscription billing is listed
            under Subscribers.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2 sm:col-span-1">
              <Label htmlFor="purchase-search">Search student</Label>
              <Input
                id="purchase-search"
                placeholder="Name or email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="purchase-status">Status</Label>
              <select
                id="purchase-status"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value || 'all'} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="purchase-catalog">Product type</Label>
              <select
                id="purchase-catalog"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={catalog}
                onChange={(e) => setCatalog(e.target.value)}
              >
                {CATALOG_OPTIONS.map((opt) => (
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
            <p className="text-sm text-destructive">{error?.message ?? 'Unable to load purchases'}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Student</th>
                    <th className="px-4 py-3 font-medium">Items</th>
                    <th className="px-4 py-3 font-medium">Total</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Provider</th>
                    <th className="px-4 py-3 font-medium">Order</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                        No purchases found.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => (
                      <tr key={row.uuid} className="border-b border-border/60 last:border-0">
                        <td className="px-4 py-3 text-xs whitespace-nowrap">
                          {row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div>{row.user?.name || '—'}</div>
                          <div className="text-xs text-muted-foreground">{row.user?.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <ul className="space-y-1">
                            {(row.lines ?? []).map((line) => (
                              <li key={line.uuid}>
                                <span className="font-medium">{line.titleSnapshot}</span>
                                <span className="ml-2 text-xs text-muted-foreground">
                                  {catalogLabel(line.catalog)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {formatMoney(row.totalAmount, row.currency)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(row.status)}`}
                          >
                            {row.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs">{row.paymentProvider ?? '—'}</td>
                        <td className="px-4 py-3 font-mono text-xs">
                          <div>{row.uuid.slice(0, 8)}…</div>
                          {row.externalPaymentId ? (
                            <div className="text-muted-foreground">{row.externalPaymentId}</div>
                          ) : null}
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
    </div>
  )
}
