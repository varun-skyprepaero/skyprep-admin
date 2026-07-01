import { ActionConfirmDialog } from '@/components/ui/action-confirm-dialog'

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
  return (
    <ActionConfirmDialog
      open={open}
      title={title}
      description={description}
      confirmLabel={confirmLabel}
      cancelLabel={cancelLabel}
      confirmVariant="destructive"
      loading={loading}
      onConfirm={onConfirm}
      onClose={onClose}
    />
  )
}
