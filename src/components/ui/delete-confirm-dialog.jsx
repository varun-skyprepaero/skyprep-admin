import { Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

/**
 * @param {{
 *   open: boolean,
 *   title: string,
 *   description?: import('react').ReactNode,
 *   confirmLabel?: string,
 *   cancelLabel?: string,
 *   loading?: boolean,
 *   onConfirm: () => void,
 *   onClose: () => void,
 * }} props
 */
export function DeleteConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  loading = false,
  onConfirm,
  onClose,
}) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 p-4 backdrop-blur-sm sm:items-center"
      role="presentation"
      onClick={() => !loading && onClose()}
    >
      <Card
        className="relative z-10 w-full max-w-md shadow-lg"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-confirm-title"
        aria-describedby={description ? 'delete-confirm-description' : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle id="delete-confirm-title">{title}</CardTitle>
              {description ? (
                <CardDescription id="delete-confirm-description">{description}</CardDescription>
              ) : null}
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
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              {cancelLabel}
            </Button>
            <Button type="button" variant="destructive" onClick={onConfirm} disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              {confirmLabel}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
