import { Button } from '@/components/ui/button'
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/ui/modal'
import { ReviewStatusBadge } from '@/features/review/components/review-status-badge'

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

/**
 * Shows review feedback for flagged or resubmitted items.
 * @param {{
 *   open: boolean
 *   item: import('@/features/review/api/review-api.types').ReviewItem | null
 *   onClose: () => void
 * }} props
 */
export function ReviewNoteDialog({ open, item, onClose }) {
  const title = item?.title || item?.uuid || 'Review details'

  return (
    <Modal open={open} onClose={onClose}>
      <ModalHeader onClose={onClose}>Review details</ModalHeader>
      <ModalBody className="space-y-4">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Item</div>
          <div className="mt-1 font-medium">{title}</div>
          {item?.contextLabel ? (
            <div className="mt-0.5 text-xs text-muted-foreground">{item.contextLabel}</div>
          ) : null}
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Status</div>
          <div className="mt-1">
            <ReviewStatusBadge status={item?.reviewStatus} />
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            {item?.reviewStatus === 'RESUBMITTED' ? 'What was flagged' : 'What to fix'}
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm">
            {item?.reviewNote?.trim() ? item.reviewNote : 'No note provided.'}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Flagged by</div>
            <div className="mt-1 text-sm">{item?.reviewedBy?.name ?? '—'}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Flagged on</div>
            <div className="mt-1 text-sm">{formatDate(item?.reviewedAt)}</div>
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button type="button" variant="secondary" onClick={onClose}>
          Close
        </Button>
      </ModalFooter>
    </Modal>
  )
}
