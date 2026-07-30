import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { ActionConfirmDialog } from '@/components/ui/action-confirm-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/ui/modal'
import { DataTable, DataTableContent } from '@/components/ui/data-table'
import { Label } from '@/components/ui/label'
import {
  fetchAuthorEntries,
  fetchPaymentStats,
  fetchPayoutBatches,
  markEntriesPaid,
  revertPayout,
} from '@/features/review/api/review-api'
import { REVIEW_ENTITY_LABELS } from '@/features/review/constants'
import { ReviewItemLabel } from '@/features/review/components/review-item-label'
import { handleApiError } from '@/lib/http/api-error'
import { notifyError, notifySuccess } from '@/lib/notifications'

const statsKey = ['review', 'payment-stats']
const batchesKey = ['review', 'payout-batches']

function entityLabel(item) {
  return item.entityLabel ?? REVIEW_ENTITY_LABELS[item.entityType] ?? item.entityType
}

function formatDate(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

function itemKey(item) {
  return `${item.entityType}:${item.uuid}`
}

function parseRate(value) {
  const trimmed = String(value ?? '').trim()
  if (!trimmed) return null
  const n = Number.parseFloat(trimmed)
  return Number.isFinite(n) && n >= 0 ? n : null
}

function formatMoney(value) {
  if (value == null || value === '') return '—'
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function selectFirstItems(items, count) {
  const n = Math.max(0, Math.min(items.length, Math.floor(Number(count) || 0)))
  const next = {}
  for (let i = 0; i < n; i += 1) {
    const it = items[i]
    next[itemKey(it)] = it
  }
  return next
}

/** Drill-in modal: an author's payable (accepted + unpaid) entries with bulk pay. */
function PayoutDialog({ author, onClose, onPaid }) {
  const [selected, setSelected] = useState(/** @type {Record<string, any>} */ ({}))
  const [selectCount, setSelectCount] = useState('')
  const [rate, setRate] = useState('')
  const [note, setNote] = useState('')

  const entriesQuery = useQuery({
    queryKey: ['review', 'author-payable', author.authorUuid],
    queryFn: () =>
      fetchAuthorEntries({
        authorUuid: author.authorUuid,
        reviewStatus: 'ACCEPTED',
        paymentStatus: 'UNPAID',
      }),
  })

  const items = entriesQuery.data?.items ?? []
  const selectedKeys = Object.keys(selected)
  const allSelected = items.length > 0 && selectedKeys.length === items.length
  const parsedRate = parseRate(rate)
  const payoutCount = selectedKeys.length
  const finalAmount = parsedRate != null && payoutCount > 0 ? parsedRate * payoutCount : null

  const mutation = useMutation({
    mutationFn: () =>
      markEntriesPaid({
        authorUuid: author.authorUuid,
        items: Object.values(selected).map((it) => ({
          domain: it.domain,
          entityType: it.entityType,
          uuid: it.uuid,
        })),
        note: note.trim() || undefined,
        ratePerItem: parsedRate,
      }),
    onSuccess: (data) => {
      notifySuccess(
        data?.count ? `Marked ${data.count} item${data.count === 1 ? '' : 's'} paid` : 'Nothing to pay',
      )
      onPaid()
    },
    onError: (err) => {
      const { message } = handleApiError(err, 'Unable to record payout')
      notifyError(message)
    },
  })

  const toggle = (item) => {
    setSelected((prev) => {
      const next = { ...prev }
      const key = itemKey(item)
      if (next[key]) delete next[key]
      else next[key] = item
      setSelectCount(String(Object.keys(next).length))
      return next
    })
  }

  const toggleAll = () => {
    if (allSelected) {
      setSelected({})
      setSelectCount('0')
    } else {
      const next = {}
      for (const it of items) next[itemKey(it)] = it
      setSelected(next)
      setSelectCount(String(items.length))
    }
  }

  const onSelectCountChange = (value) => {
    if (value.trim() === '') {
      setSelectCount('')
      setSelected({})
      return
    }
    const n = Number.parseInt(value, 10)
    if (!Number.isFinite(n)) return
    const clamped = Math.max(0, Math.min(items.length, n))
    setSelectCount(String(clamped))
    setSelected(selectFirstItems(items, clamped))
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      closeDisabled={mutation.isPending}
      aria-labelledby="payout-dialog-title"
    >
      <ModalHeader
        title={`Pay ${author.author?.name ?? 'author'}`}
        description={`${author.author?.email ?? author.authorUuid} · ${items.length} payable item${items.length === 1 ? '' : 's'}`}
        titleId="payout-dialog-title"
        onClose={onClose}
        closeDisabled={mutation.isPending}
      />
      <ModalBody>
        {entriesQuery.isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
          </div>
        ) : entriesQuery.isError ? (
          <p className="text-sm text-destructive">
            {entriesQuery.error?.message ?? 'Unable to load payable entries'}
          </p>
        ) : items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No accepted, unpaid entries for this person.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="payout-select-count">
                  Questions to pay <span className="text-muted-foreground">(max {items.length})</span>
                </Label>
                <Input
                  id="payout-select-count"
                  type="number"
                  min={0}
                  max={items.length}
                  step={1}
                  value={selectCount}
                  onChange={(e) => onSelectCountChange(e.target.value)}
                  placeholder={String(items.length)}
                  className="mt-1"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Selects the first N payable items (up to {items.length}).
                </p>
              </div>
              <div>
                <Label htmlFor="payout-rate">Rate per question</Label>
                <Input
                  id="payout-rate"
                  type="number"
                  min={0}
                  step="0.01"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  placeholder="e.g. 50"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Final amount</Label>
                <div className="mt-1 flex h-10 items-center rounded-md border border-input bg-muted/30 px-3 text-sm font-medium">
                  {finalAmount != null ? (
                    <>
                      {formatMoney(parsedRate)} × {payoutCount} = {formatMoney(finalAmount)}
                    </>
                  ) : (
                    <span className="text-muted-foreground">Enter rate and select items</span>
                  )}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="w-10 px-3 py-2">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      aria-label="Select all"
                    />
                  </th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Item</th>
                  <th className="px-3 py-2 text-right font-medium">Rate</th>
                  <th className="px-3 py-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const key = itemKey(item)
                  const isSelected = Boolean(selected[key])
                  return (
                    <tr key={key} className="border-b border-border/60 last:border-0">
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggle(item)}
                          aria-label={`Select ${item.title || item.uuid}`}
                        />
                      </td>
                      <td className="px-3 py-2 text-xs">{entityLabel(item)}</td>
                      <td className="max-w-sm px-3 py-2">
                        <ReviewItemLabel item={item} />
                      </td>
                      <td className="px-3 py-2 text-right text-xs tabular-nums">
                        {isSelected && parsedRate != null ? formatMoney(parsedRate) : '—'}
                      </td>
                      <td className="px-3 py-2 text-right text-xs tabular-nums">
                        {isSelected && parsedRate != null ? formatMoney(parsedRate) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </ModalBody>
      {items.length > 0 ? (
        <ModalFooter className="flex-col items-stretch gap-4">
          <div>
            <Label htmlFor="payout-note">Note (optional)</Label>
            <textarea
              id="payout-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="e.g. July payout"
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              disabled={mutation.isPending || selectedKeys.length === 0}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
              ) : null}
              Mark selected paid ({selectedKeys.length})
            </Button>
          </div>
        </ModalFooter>
      ) : null}
    </Modal>
  )
}

export function PayoutsTab() {
  const queryClient = useQueryClient()
  const [target, setTarget] = useState(/** @type {null | any} */ (null))
  const [revertTarget, setRevertTarget] = useState(/** @type {null | any} */ (null))

  const statsQuery = useQuery({
    queryKey: statsKey,
    queryFn: fetchPaymentStats,
  })

  const batchesQuery = useQuery({
    queryKey: batchesKey,
    queryFn: () => fetchPayoutBatches(),
  })

  const authors = statsQuery.data ?? []
  const batches = batchesQuery.data ?? []

  const totalPayable = useMemo(
    () => authors.reduce((sum, a) => sum + (a.payable ?? 0), 0),
    [authors],
  )

  const invalidatePayoutQueries = () => {
    void queryClient.invalidateQueries({ queryKey: statsKey })
    void queryClient.invalidateQueries({ queryKey: batchesKey })
    void queryClient.invalidateQueries({ queryKey: ['review', 'author-payable'] })
    void queryClient.invalidateQueries({ queryKey: ['review', 'my-entries'] })
    void queryClient.invalidateQueries({ queryKey: ['review', 'stats'] })
    void queryClient.invalidateQueries({ queryKey: ['review', 'queue'] })
  }

  const onPaid = () => {
    setTarget(null)
    invalidatePayoutQueries()
  }

  const revertMutation = useMutation({
    mutationFn: ({ batchUuid }) => revertPayout({ batchUuid }),
    onSuccess: (data) => {
      notifySuccess(
        data?.count
          ? `Reverted payout (${data.count} item${data.count === 1 ? '' : 's'} marked unpaid)`
          : 'Payout reverted',
      )
      setRevertTarget(null)
      invalidatePayoutQueries()
    },
    onError: (err) => {
      const { message } = handleApiError(err, 'Unable to revert payout')
      notifyError(message)
    },
  })

  return (
    <div className="space-y-6">
      <Card>
      <CardHeader className="pb-4">
        <CardTitle>Payouts</CardTitle>
        <CardDescription>
          Pay data-entry people for accepted work. {totalPayable} item
          {totalPayable === 1 ? '' : 's'} awaiting payment.
        </CardDescription>
      </CardHeader>
      <DataTable>
        <DataTableContent>
          {statsQuery.isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
            </div>
          ) : statsQuery.isError ? (
            <p className="p-6 text-sm text-destructive">
              {statsQuery.error?.message ?? 'Unable to load payouts'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Author</th>
                    <th className="px-4 py-3 text-right font-medium">Total</th>
                    <th className="px-4 py-3 text-right font-medium">Accepted</th>
                    <th className="px-4 py-3 text-right font-medium">Payable</th>
                    <th className="px-4 py-3 text-right font-medium">Paid</th>
                    <th className="w-28 px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {authors.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                        No data-entry activity yet.
                      </td>
                    </tr>
                  ) : (
                    authors.map((row) => (
                      <tr
                        key={row.authorUuid}
                        className="border-b border-border/60 align-top last:border-0"
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium">{row.author?.name ?? '—'}</div>
                          {row.author?.email ? (
                            <div className="text-xs text-muted-foreground">{row.author.email}</div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-right">{row.total}</td>
                        <td className="px-4 py-3 text-right">{row.accepted}</td>
                        <td className="px-4 py-3 text-right">
                          {row.payable ? (
                            <span className="font-medium text-amber-700 dark:text-amber-300">
                              {row.payable}
                            </span>
                          ) : (
                            0
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">{row.paid}</td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            type="button"
                            size="sm"
                            variant={row.payable ? 'default' : 'outline'}
                            disabled={!row.payable}
                            onClick={() => setTarget(row)}
                          >
                            Pay
                          </Button>
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
          <CardDescription>
            Every payout you have recorded, most recent first. Each row is one payment.
          </CardDescription>
        </CardHeader>
        <DataTable>
          <DataTableContent>
            {batchesQuery.isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
              </div>
            ) : batchesQuery.isError ? (
              <p className="p-6 text-sm text-destructive">
                {batchesQuery.error?.message ?? 'Unable to load payout history'}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Person</th>
                      <th className="px-4 py-3 text-right font-medium">Items paid</th>
                      <th className="px-4 py-3 text-right font-medium">Rate</th>
                      <th className="px-4 py-3 text-right font-medium">Total</th>
                      <th className="px-4 py-3 font-medium">Paid by</th>
                      <th className="px-4 py-3 font-medium">Note</th>
                      <th className="w-28 px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {batches.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                          No payouts recorded yet.
                        </td>
                      </tr>
                    ) : (
                      batches.map((b) => (
                        <tr
                          key={b.uuid}
                          className="border-b border-border/60 align-top last:border-0"
                        >
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {formatDate(b.createdAt)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium">{b.author?.name ?? '—'}</div>
                            {b.author?.email ? (
                              <div className="text-xs text-muted-foreground">{b.author.email}</div>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 text-right font-medium">{b.itemCount}</td>
                          <td className="px-4 py-3 text-right text-xs tabular-nums">
                            {formatMoney(b.ratePerItem)}
                          </td>
                          <td className="px-4 py-3 text-right text-xs font-medium tabular-nums">
                            {formatMoney(b.totalAmount)}
                          </td>
                          <td className="px-4 py-3 text-xs">{b.createdBy?.name ?? '—'}</td>
                          <td className="max-w-xs px-4 py-3 text-xs text-muted-foreground">
                            <span className="line-clamp-2">{b.note || '—'}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={revertMutation.isPending}
                              onClick={() => setRevertTarget(b)}
                            >
                              Revert
                            </Button>
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

      {target ? <PayoutDialog author={target} onClose={() => setTarget(null)} onPaid={onPaid} /> : null}

      <ActionConfirmDialog
        open={Boolean(revertTarget)}
        title="Revert payout?"
        description={
          revertTarget
            ? `This will mark ${revertTarget.itemCount} item${revertTarget.itemCount === 1 ? '' : 's'} for ${revertTarget.author?.name ?? 'this person'} as unpaid again and remove the payout from history.`
            : undefined
        }
        confirmLabel="Revert payout"
        loading={revertMutation.isPending}
        onClose={() => {
          if (!revertMutation.isPending) setRevertTarget(null)
        }}
        onConfirm={() => {
          if (revertTarget) revertMutation.mutate({ batchUuid: revertTarget.uuid })
        }}
      />
    </div>
  )
}
