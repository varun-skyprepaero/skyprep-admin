import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/ui/modal'
import {
  DataTable,
  DataTableContent,
  DataTableRowActions,
  dataTableSelectClass,
} from '@/components/ui/data-table'
import {
  fetchMyReviewItems,
  fetchReviewQueue,
  fetchReviewStats,
  applyReviewDecision,
} from '@/features/review/api/review-api'
import { fetchTestQuestion } from '@/features/tests/api/tests-api'
import { ReviewStatusBadge } from '@/features/review/components/review-status-badge'
import { ReviewActionDialog } from '@/features/review/components/review-action-dialog'
import { ReviewItemLabel } from '@/features/review/components/review-item-label'
import { MyEntriesTab } from '@/features/review/components/MyEntriesTab'
import { PayoutsTab } from '@/features/review/components/PayoutsTab'
import { QuestionViewContent } from '@/features/tests/components/QuestionViewContent'
import {
  OPEN_REVIEW_STATUSES,
  REVIEW_ENTITY_LABELS,
  REVIEW_QUEUE_TYPE_FILTER_OPTIONS,
  REVIEW_STATUS_FILTER_OPTIONS,
  REVIEW_STATUS_META,
} from '@/features/review/constants'
import { hasPermission, isDataEntryUser, isSuperAdmin } from '@/features/auth/lib/admin-section-access'
import { handleApiError } from '@/lib/http/api-error'
import { notifyError, notifySuccess } from '@/lib/notifications'
import { useAuthStore } from '@/stores/auth-store'
import { usePermissionsStore } from '@/stores/permissions-store'

const queueKey = ['review', 'queue']
const mineKey = ['review', 'mine']

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

/** Entity types that can be previewed in-place on this page. */
const PREVIEWABLE = new Set(['question'])

export default function ReviewQueuePage() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const matrix = usePermissionsStore((s) => s.matrix)
  const hasHydrated = useAuthStore((s) => s._hasHydrated)
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping)

  const canReview =
    isSuperAdmin(user) || hasPermission(matrix, 'review.queue', 'view', user)
  const canEdit = isSuperAdmin(user) || hasPermission(matrix, 'review.queue', 'edit', user)
  const dataEntry = isDataEntryUser(user)

  const [tab, setTab] = useState(canReview ? 'queue' : 'myentries')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [authorFilter, setAuthorFilter] = useState('')
  const [action, setAction] = useState(
    /** @type {null | { mode: 'flag' | 'resolve', item: import('@/features/review/api/review-api.types').ReviewItem }} */ (
      null
    ),
  )
  const [viewItem, setViewItem] = useState(
    /** @type {null | import('@/features/review/api/review-api.types').ReviewItem} */ (null),
  )

  const queueStatuses =
    statusFilter === ''
      ? undefined
      : statusFilter === 'OPEN'
        ? OPEN_REVIEW_STATUSES
        : [statusFilter]

  const queueQuery = useQuery({
    queryKey: [...queueKey, statusFilter, typeFilter],
    queryFn: () =>
      fetchReviewQueue({
        reviewStatus: queueStatuses,
        entityTypes: typeFilter ? [typeFilter] : undefined,
      }),
    enabled: canReview && tab === 'queue',
  })

  const mineQuery = useQuery({
    queryKey: [...mineKey],
    queryFn: () => fetchMyReviewItems({ reviewStatus: OPEN_REVIEW_STATUSES }),
    enabled: tab === 'mine',
  })

  const viewQuery = useQuery({
    queryKey: ['review', 'question-detail', viewItem?.uuid],
    queryFn: () => fetchTestQuestion(viewItem.uuid),
    enabled: Boolean(viewItem && viewItem.entityType === 'question'),
  })

  const statsQuery = useQuery({
    queryKey: ['review', 'stats'],
    queryFn: fetchReviewStats,
    enabled: canReview && tab === 'summary',
  })

  const reviewMutation = useMutation({
    mutationFn: ({ item, status, note }) =>
      applyReviewDecision({
        domain: item.domain,
        entityType: item.entityType,
        uuid: item.uuid,
        status,
        note,
      }),
    onSuccess: (data, variables) => {
      const messages = {
        FLAGGED: 'Marked for review',
        ACCEPTED: 'Item accepted',
        RESOLVED: 'Review resolved',
      }
      notifySuccess(messages[variables.status] ?? 'Review updated')
      setAction(null)
      if (variables.status === 'ACCEPTED') {
        // Preview advance is handled by the Approve button callback.
      } else {
        setViewItem((prev) => {
          if (
            !prev ||
            prev.uuid !== variables.item.uuid ||
            prev.entityType !== variables.item.entityType
          ) {
            return prev
          }
          return {
            ...prev,
            ...(data && typeof data === 'object' ? data : {}),
            reviewStatus: variables.status,
          }
        })
      }
      if (variables.item.entityType === 'question') {
        queryClient.setQueryData(['review', 'question-detail', variables.item.uuid], (old) =>
          old
            ? {
                ...old,
                reviewStatus: variables.status,
                reviewNote:
                  variables.status === 'FLAGGED'
                    ? (data?.reviewNote ?? old.reviewNote)
                    : variables.status === 'ACCEPTED' || variables.status === 'RESOLVED'
                      ? null
                      : old.reviewNote,
              }
            : old,
        )
      }
      void queryClient.invalidateQueries({ queryKey: queueKey })
      void queryClient.invalidateQueries({ queryKey: mineKey })
      void queryClient.invalidateQueries({ queryKey: ['review', 'stats'] })
      void queryClient.invalidateQueries({ queryKey: ['review', 'payment-stats'] })
    },
    onError: (err) => {
      const { message } = handleApiError(err, 'Unable to update review')
      notifyError(message)
    },
  })

  const queueItems = queueQuery.data ?? []
  const mineItems = mineQuery.data ?? []

  const authorOptions = useMemo(() => {
    const map = new Map()
    for (const it of queueItems) {
      const a = it.createdBy
      if (a?.uuid && !map.has(a.uuid)) map.set(a.uuid, a.name || a.uuid)
    }
    return [...map.entries()]
      .map(([uuid, name]) => ({ uuid, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [queueItems])

  const displayedQueueItems = useMemo(
    () =>
      authorFilter
        ? queueItems.filter((it) => it.createdBy?.uuid === authorFilter)
        : queueItems,
    [queueItems, authorFilter],
  )

  // Items the in-place viewer can page through, scoped to the active tab.
  const viewList = useMemo(
    () => (tab === 'mine' ? mineItems : displayedQueueItems).filter((it) => PREVIEWABLE.has(it.entityType)),
    [tab, mineItems, displayedQueueItems],
  )

  const viewIndex = viewItem
    ? viewList.findIndex((it) => it.entityType === viewItem.entityType && it.uuid === viewItem.uuid)
    : -1
  const nextItem = viewIndex >= 0 && viewIndex < viewList.length - 1 ? viewList[viewIndex + 1] : null

  const tabs = useMemo(() => {
    const list = []
    if (canReview) list.push({ id: 'queue', label: 'To review' })
    if (canReview) list.push({ id: 'summary', label: 'Summary' })
    if (canReview) list.push({ id: 'payouts', label: 'Payouts' })
    list.push({ id: 'myentries', label: 'My entries' })
    list.push({ id: 'mine', label: 'My flagged items' })
    return list
  }, [canReview])

  const statsRows = statsQuery.data ?? []

  const renderItemTitle = (item) =>
    PREVIEWABLE.has(item.entityType) ? (
      <ReviewItemLabel item={item} asButton onClick={() => setViewItem(item)} />
    ) : (
      <ReviewItemLabel item={item} />
    )

  if (!hasHydrated || isBootstrapping) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
      </div>
    )
  }

  if (!canReview && !dataEntry) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Review</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          {canReview
            ? 'Audit data-entry work. Flag items that need corrections and resolve them once fixed.'
            : 'Items your auditor flagged for correction. Fix them in the relevant section, then they are re-checked.'}
        </p>
      </div>

      {tabs.length > 1 ? (
        <div className="flex gap-1 border-b border-border/60">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={
                'relative -mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ' +
                (tab === t.id
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground')
              }
            >
              {t.label}
            </button>
          ))}
        </div>
      ) : null}

      {tab === 'queue' && canReview ? (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle>Review queue</CardTitle>
            <CardDescription>
              Content authored by the data-entry people you audit.
            </CardDescription>
          </CardHeader>
          <DataTable>
            <div className="flex flex-wrap items-center gap-2 border-b border-border/80 bg-muted/30 px-4 py-3 lg:px-6">
              <span className="text-sm text-muted-foreground">Status</span>
              <select
                className={dataTableSelectClass}
                aria-label="Filter by review status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All authored</option>
                <option value="OPEN">Open (flagged + recheck)</option>
                {REVIEW_STATUS_FILTER_OPTIONS.filter((o) => o.value).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <span className="ml-2 text-sm text-muted-foreground">Type</span>
              <select
                className={dataTableSelectClass}
                aria-label="Filter by content type"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                {REVIEW_QUEUE_TYPE_FILTER_OPTIONS.map((option) => (
                  <option key={option.value || 'all'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <span className="ml-2 text-sm text-muted-foreground">Author</span>
              <select
                className={dataTableSelectClass}
                aria-label="Filter by author"
                value={authorFilter}
                onChange={(e) => setAuthorFilter(e.target.value)}
              >
                <option value="">All authors</option>
                {authorOptions.map((a) => (
                  <option key={a.uuid} value={a.uuid}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <DataTableContent>
              {queueQuery.isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
                </div>
              ) : queueQuery.isError ? (
                <p className="p-6 text-sm text-destructive">
                  {queueQuery.error?.message ?? 'Unable to load review queue'}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-left text-sm">
                    <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-medium">Type</th>
                        <th className="px-4 py-3 font-medium">Item</th>
                        <th className="px-4 py-3 font-medium">Author</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium">Note</th>
                        <th className="px-4 py-3 font-medium">Updated</th>
                        {canEdit ? <th className="w-16 px-2 py-3 text-right" /> : null}
                      </tr>
                    </thead>
                    <tbody>
                      {displayedQueueItems.length === 0 ? (
                        <tr>
                          <td
                            colSpan={canEdit ? 7 : 6}
                            className="px-4 py-10 text-center text-muted-foreground"
                          >
                            Nothing to review right now.
                          </td>
                        </tr>
                      ) : (
                        displayedQueueItems.map((item) => (
                          <tr
                            key={`${item.entityType}:${item.uuid}`}
                            className="border-b border-border/60 align-top last:border-0"
                          >
                            <td className="px-4 py-3 text-xs">{entityLabel(item)}</td>
                            <td className="max-w-sm px-4 py-3">{renderItemTitle(item)}</td>
                            <td className="px-4 py-3 text-xs">
                              {item.createdBy?.name ?? '—'}
                            </td>
                            <td className="px-4 py-3">
                              <ReviewStatusBadge status={item.reviewStatus} />
                            </td>
                            <td className="max-w-xs px-4 py-3 text-xs text-muted-foreground">
                              <span className="line-clamp-2">{item.reviewNote || '—'}</span>
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              {formatDate(item.updatedAt)}
                            </td>
                            {canEdit ? (
                              <DataTableRowActions
                                rowId={`${item.entityType}:${item.uuid}`}
                                disabled={reviewMutation.isPending}
                                items={[
                                  ...(item.reviewStatus !== 'ACCEPTED'
                                    ? [
                                        {
                                          label: 'Accept (approve for payment)',
                                          onClick: () =>
                                            reviewMutation.mutate({ item, status: 'ACCEPTED' }),
                                        },
                                      ]
                                    : []),
                                  {
                                    label:
                                      item.reviewStatus === 'FLAGGED'
                                        ? 'Update note'
                                        : 'Mark for review',
                                    onClick: () => setAction({ mode: 'flag', item }),
                                  },
                                  {
                                    label: 'Resolve',
                                    onClick: () => setAction({ mode: 'resolve', item }),
                                  },
                                ]}
                              />
                            ) : null}
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
      ) : null}

      {tab === 'summary' && canReview ? (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle>Data-entry summary</CardTitle>
            <CardDescription>
              How much each person you audit has authored, and its review state.
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
                  {statsQuery.error?.message ?? 'Unable to load summary'}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-medium">Author</th>
                        <th className="px-4 py-3 text-right font-medium">Total</th>
                        <th className="px-4 py-3 text-right font-medium">
                          {REVIEW_STATUS_META.OK.label}
                        </th>
                        <th className="px-4 py-3 text-right font-medium">
                          {REVIEW_STATUS_META.FLAGGED.label}
                        </th>
                        <th className="px-4 py-3 text-right font-medium">
                          {REVIEW_STATUS_META.RESUBMITTED.label}
                        </th>
                        <th className="px-4 py-3 text-right font-medium">
                          {REVIEW_STATUS_META.ACCEPTED.label}
                        </th>
                        <th className="px-4 py-3 text-right font-medium">
                          {REVIEW_STATUS_META.RESOLVED.label}
                        </th>
                        <th className="px-4 py-3 font-medium">Breakdown</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statsRows.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                            No data-entry activity yet.
                          </td>
                        </tr>
                      ) : (
                        statsRows.map((row) => (
                          <tr
                            key={row.authorUuid}
                            className="border-b border-border/60 align-top last:border-0"
                          >
                            <td className="px-4 py-3">
                              <div className="font-medium">{row.author?.name ?? '—'}</div>
                              {row.author?.email ? (
                                <div className="text-xs text-muted-foreground">
                                  {row.author.email}
                                </div>
                              ) : null}
                            </td>
                            <td className="px-4 py-3 text-right font-medium">{row.total}</td>
                            <td className="px-4 py-3 text-right">{row.byStatus?.OK ?? 0}</td>
                            <td className="px-4 py-3 text-right">
                              {row.byStatus?.FLAGGED ? (
                                <span className="font-medium text-amber-700 dark:text-amber-300">
                                  {row.byStatus.FLAGGED}
                                </span>
                              ) : (
                                0
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {row.byStatus?.RESUBMITTED ? (
                                <span className="font-medium text-sky-700 dark:text-sky-300">
                                  {row.byStatus.RESUBMITTED}
                                </span>
                              ) : (
                                0
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {row.byStatus?.ACCEPTED ? (
                                <span className="font-medium text-emerald-700 dark:text-emerald-400">
                                  {row.byStatus.ACCEPTED}
                                </span>
                              ) : (
                                0
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">{row.byStatus?.RESOLVED ?? 0}</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              {Object.entries(row.byType ?? {})
                                .map(
                                  ([type, count]) =>
                                    `${REVIEW_ENTITY_LABELS[type] ?? type}: ${count}`,
                                )
                                .join(' · ') || '—'}
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
      ) : null}

      {tab === 'payouts' && canReview ? <PayoutsTab /> : null}

      {tab === 'myentries' ? <MyEntriesTab /> : null}

      {tab === 'mine' ? (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle>Flagged for you</CardTitle>
            <CardDescription>
              Fix these in their section (e.g. Tests). They are re-checked automatically after you
              edit them.
            </CardDescription>
          </CardHeader>
          <DataTable>
            <DataTableContent>
            {mineQuery.isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
              </div>
            ) : mineQuery.isError ? (
              <p className="p-6 text-sm text-destructive">
                {mineQuery.error?.message ?? 'Unable to load your items'}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-left text-sm">
                  <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Type</th>
                      <th className="px-4 py-3 font-medium">Item</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">What to fix</th>
                      <th className="px-4 py-3 font-medium">Flagged by</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mineItems.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                          You have no items awaiting correction.
                        </td>
                      </tr>
                    ) : (
                      mineItems.map((item) => (
                        <tr
                          key={`${item.entityType}:${item.uuid}`}
                          className="border-b border-border/60 align-top last:border-0"
                        >
                          <td className="px-4 py-3 text-xs">{entityLabel(item)}</td>
                          <td className="max-w-sm px-4 py-3">{renderItemTitle(item)}</td>
                          <td className="px-4 py-3">
                            <ReviewStatusBadge status={item.reviewStatus} />
                          </td>
                          <td className="max-w-md px-4 py-3 text-xs text-muted-foreground">
                            <span className="line-clamp-3">{item.reviewNote || '—'}</span>
                          </td>
                          <td className="px-4 py-3 text-xs">{item.reviewedBy?.name ?? '—'}</td>
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
      ) : null}

      <ReviewActionDialog
        open={Boolean(action)}
        mode={action?.mode ?? 'flag'}
        itemTitle={action?.item?.title}
        currentNote={action?.item?.reviewNote}
        loading={reviewMutation.isPending}
        onClose={() => !reviewMutation.isPending && setAction(null)}
        onConfirm={(note) =>
          action &&
          reviewMutation.mutate({
            item: action.item,
            status: action.mode === 'flag' ? 'FLAGGED' : 'RESOLVED',
            note,
          })
        }
      />

      <Modal
        open={Boolean(viewItem)}
        onClose={() => setViewItem(null)}
        size="lg"
        closeDisabled={reviewMutation.isPending}
        aria-labelledby="review-view-title"
      >
        <ModalHeader
          title={viewItem ? entityLabel(viewItem) : ''}
          description={viewItem ? `By ${viewItem.createdBy?.name ?? 'unknown'}` : undefined}
          titleId="review-view-title"
          onClose={() => setViewItem(null)}
          closeDisabled={reviewMutation.isPending}
        />
        <ModalBody>
          {viewQuery.isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
            </div>
          ) : viewQuery.isError ? (
            <p className="text-sm text-destructive">
              {viewQuery.error?.message ?? 'Unable to load this item.'}
            </p>
          ) : viewItem ? (
            <QuestionViewContent
              question={
                viewQuery.data
                  ? {
                      ...viewQuery.data,
                      reviewStatus: viewItem.reviewStatus,
                      reviewNote: viewItem.reviewNote,
                    }
                  : viewQuery.data
              }
            />
          ) : null}
        </ModalBody>
        {viewItem && !viewQuery.isLoading && !viewQuery.isError ? (
          <ModalFooter className="flex-wrap sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {canEdit ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={reviewMutation.isPending}
                    onClick={() => {
                      setAction({ mode: 'flag', item: viewItem })
                      setViewItem(null)
                    }}
                  >
                    Mark for review
                  </Button>
                  {viewItem.reviewStatus !== 'ACCEPTED' ? (
                    <Button
                      type="button"
                      disabled={reviewMutation.isPending}
                      onClick={() => {
                        const next =
                          viewIndex >= 0 && viewIndex < viewList.length - 1
                            ? viewList[viewIndex + 1]
                            : null
                        reviewMutation.mutate(
                          { item: viewItem, status: 'ACCEPTED' },
                          { onSuccess: () => setViewItem(next) },
                        )
                      }}
                    >
                      {reviewMutation.isPending ? (
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                      ) : null}
                      Approve
                    </Button>
                  ) : null}
                </>
              ) : null}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setViewItem(null)}>
                Close
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={!nextItem}
                onClick={() => setViewItem(nextItem)}
              >
                Next
              </Button>
            </div>
          </ModalFooter>
        ) : null}
      </Modal>
    </div>
  )
}
