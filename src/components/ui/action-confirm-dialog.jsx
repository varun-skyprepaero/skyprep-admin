import { Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'

/**
 * @param {{
 *   open: boolean,
 *   title: string,
 *   description?: import('react').ReactNode,
 *   children?: import('react').ReactNode,
 *   confirmLabel?: string,
 *   cancelLabel?: string,
 *   confirmVariant?: 'destructive' | 'secondary' | 'default',
 *   loading?: boolean,
 *   confirmDisabled?: boolean,
 *   onConfirm: () => void,
 *   onClose: () => void,
 * }} props
 */
export function ActionConfirmDialog({
  open,
  title,
  description,
  children,
  confirmLabel = 'Continue',
  cancelLabel = 'Cancel',
  confirmVariant = 'destructive',
  loading = false,
  confirmDisabled = false,
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
        className="relative z-10 w-full max-w-lg shadow-lg"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="action-confirm-title"
        aria-describedby={description ? 'action-confirm-description' : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle id="action-confirm-title">{title}</CardTitle>
              {description ? (
                <CardDescription id="action-confirm-description" className="text-sm leading-relaxed">
                  {description}
                </CardDescription>
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
        {children ? <CardContent className="space-y-4 pt-0">{children}</CardContent> : null}
        <CardContent className={cn(children ? 'border-t pt-4' : '')}>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              {cancelLabel}
            </Button>
            <Button
              type="button"
              variant={confirmVariant}
              onClick={onConfirm}
              disabled={loading || confirmDisabled}
            >
              {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              {confirmLabel}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Impact list for warning dialogs.
 * @param {{ items: string[] }} props
 */
export function ActionImpactList({ items }) {
  if (!items?.length) return null
  return (
    <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  )
}
