import { useEffect, useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'

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

  if (!open) return null

  const isFlag = mode === 'flag'
  const canConfirm = !loading && (!isFlag || note.trim().length > 0)

  function submit(e) {
    e.preventDefault()
    if (!canConfirm) return
    onConfirm(note.trim())
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 p-4 backdrop-blur-sm sm:items-center"
      role="presentation"
      onClick={() => !loading && onClose()}
    >
      <Card
        className="relative z-10 w-full max-w-md overflow-y-auto shadow-lg"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle>{isFlag ? 'Mark for review' : 'Resolve review'}</CardTitle>
              <CardDescription>
                {isFlag
                  ? 'Describe what needs fixing. The author will see this note.'
                  : 'Mark this item as reviewed and correct.'}
                {itemTitle ? (
                  <>
                    {' '}
                    <span className="font-medium text-foreground">{itemTitle}</span>
                  </>
                ) : null}
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={onClose}
              aria-label="Close"
              disabled={loading}
            >
              <X className="size-4" aria-hidden />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={submit}>
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
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={!canConfirm} variant={isFlag ? 'default' : 'default'}>
                {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                {isFlag ? 'Flag for review' : 'Mark resolved'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
