import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/ui/modal'

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
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      role="alertdialog"
      closeDisabled={loading}
      closeOnOverlayClick={!loading}
      aria-labelledby="action-confirm-title"
      aria-describedby={description ? 'action-confirm-description' : undefined}
    >
      <ModalHeader
        title={title}
        description={description}
        titleId="action-confirm-title"
        descriptionId="action-confirm-description"
        onClose={onClose}
        closeDisabled={loading}
      />
      {children ? <ModalBody className="space-y-4">{children}</ModalBody> : null}
      <ModalFooter>
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
      </ModalFooter>
    </Modal>
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
