import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/ui/modal'

/**
 * Confirm dialog for flagging or resolving a review item. When flagging, a note
 * is required so the author knows what to fix.
 *
 * @param {{
 *   open: boolean
 *   mode: 'flag' | 'resolve'
 *   itemTitle?: string
 *   currentNote?: string | null
 *   loading?: boolean
 *   onClose: () => void
 *   onConfirm: (note: string) => void
 * }} props
 */
export function ReviewActionDialog({
  open,
  mode,
  itemTitle,
  currentNote,
  loading = false,
  onClose,
  onConfirm,
}) {
  const [note, setNote] = useState('')

  useEffect(() => {
    if (open) setNote(mode === 'flag' ? currentNote ?? '' : '')
  }, [open, mode, currentNote])

  const isFlag = mode === 'flag'
  const canConfirm = !loading && (!isFlag || note.trim().length > 0)

  function submit(e) {
    e.preventDefault()
    if (!canConfirm) return
    onConfirm(note.trim())
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      closeDisabled={loading}
      aria-labelledby="review-action-title"
    >
      <ModalHeader
        title={isFlag ? 'Mark for review' : 'Resolve review'}
        description={
          <>
            {isFlag
              ? 'Describe what needs fixing. The author will see this note.'
              : 'Mark this item as reviewed and correct.'}
            {itemTitle ? (
              <>
                {' '}
                <span className="font-medium text-foreground">{itemTitle}</span>
              </>
            ) : null}
          </>
        }
        titleId="review-action-title"
        onClose={onClose}
        closeDisabled={loading}
      />
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        <ModalBody className="space-y-4">
          {isFlag ? (
            <div className="space-y-2">
              <Label htmlFor="review-note">Note</Label>
              <textarea
                id="review-note"
                className="min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Option B is also correct — please fix the answer key."
                disabled={loading}
                autoFocus
                required
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="review-note">Resolution note (optional)</Label>
              <textarea
                id="review-note"
                className="min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={loading}
              />
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={!canConfirm} variant={isFlag ? 'default' : 'default'}>
            {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            {isFlag ? 'Flag for review' : 'Mark resolved'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  )
}
