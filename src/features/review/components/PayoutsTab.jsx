import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/ui/modal'
import { DataTable, DataTableContent } from '@/components/ui/data-table'
import { Label } from '@/components/ui/label'
import {
  fetchAuthorEntries,
  fetchPaymentStats,
  fetchPayoutBatches,
  markEntriesPaid,
} from '@/features/review/api/review-api'
import { REVIEW_ENTITY_LABELS } from '@/features/review/constants'
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

/** Drill-in modal: an author's payable (accepted + unpaid) entries with bulk pay. */
function PayoutDialog({ author, onClose, onPaid }) {
  const [selected, setSelected] = useState(/** @type {Record<string, any>} */ ({}))
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

  const mutation = useMutation({
    mutationFn: ({ all }) =>
      markEntriesPaid({
        authorUuid: author.authorUuid,
        all,
        items: all
          ? undefined
          : Object.values(selected).map((it) => ({
              domain: it.domain,
              entityType: it.entityType,
              uuid: it.uuid,
            })),
        note: note.trim() || undefined,
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
      return next
    })
  }

  const toggleAll = () => {
    if (allSelected) {
      setSelected({})
    } else {
      const next = {}
      for (const it of items) next[itemKey(it)] = it
      setSelected(next)
    }
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
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const key = itemKey(item)
                  return (
                    <tr key={key} className="border-b border-border/60 last:border-0">
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={Boolean(selected[key])}
                          onChange={() => toggle(item)}
                          aria-label={`Select ${item.title || item.uuid}`}
                        />
                      </td>
                      <td className="px-3 py-2 text-xs">{entityLabel(item)}</td>
                      <td className="max-w-sm px-3 py-2">
                        <span className="line-clamp-2">{item.title || item.uuid}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
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
              variant="outline"
              disabled={mutation.isPending || selectedKeys.length === 0}
              onClick={() => mutation.mutate({ all: false })}
            >
              {mutation.isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
              ) : null}
              Mark selected paid ({selectedKeys.length})
            </Button>
            <Button
              type="button"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate({ all: true })}
            >
              {mutation.isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
              ) : null}
              Mark all payable paid ({items.length})
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

  const onPaid = () => {
    setTarget(null)
    void queryClient.invalidateQueries({ queryKey: statsKey })
    void queryClient.invalidateQueries({ queryKey: batchesKey })
    void queryClient.invalidateQueries({ queryKey: ['review', 'author-payable'] })
    void queryClient.invalidateQueries({ queryKey: ['review', 'my-entries'] })
    void queryClient.invalidateQueries({ queryKey: ['review', 'stats'] })
    void queryClient.invalidateQueries({ queryKey: ['review', 'queue'] })
  }

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
                      <th className="px-4 py-3 font-medium">Paid by</th>
                      <th className="px-4 py-3 font-medium">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batches.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
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
                          <td className="px-4 py-3 text-xs">{b.createdBy?.name ?? '—'}</td>
                          <td className="max-w-xs px-4 py-3 text-xs text-muted-foreground">
                            <span className="line-clamp-2">{b.note || '—'}</span>
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
    </div>
  )
}
