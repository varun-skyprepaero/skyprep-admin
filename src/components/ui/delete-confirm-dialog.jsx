import { ActionConfirmDialog, ActionImpactList } from '@/components/ui/action-confirm-dialog'

/**
 * @param {{
 *   open: boolean,
 *   title: string,
 *   description?: import('react').ReactNode,
 *   impactTitle?: string,
 *   impactItems?: string[],
 *   children?: import('react').ReactNode,
 *   confirmLabel?: string,
 *   cancelLabel?: string,
 *   editLabel?: string,
 *   loading?: boolean,
 *   onConfirm: () => void,
 *   onClose: () => void,
 *   onEdit?: (() => void) | null,
 * }} props
 */
export function DeleteConfirmDialog({
  open,
  title,
  description,
  impactTitle = 'What happens if you delete',
  impactItems,
  children,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  editLabel = 'Edit instead',
  loading = false,
  onConfirm,
  onClose,
  onEdit = null,
}) {
  const showImpact = Boolean(impactItems?.length) || Boolean(children)

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
      secondaryAction={
        onEdit
          ? {
              label: editLabel,
              onClick: onEdit,
            }
          : null
      }
    >
      {showImpact ? (
        <div className="space-y-3">
          {children}
          {impactItems?.length ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">{impactTitle}</p>
              <ActionImpactList items={impactItems} />
            </div>
          ) : null}
        </div>
      ) : null}
    </ActionConfirmDialog>
  )
}
