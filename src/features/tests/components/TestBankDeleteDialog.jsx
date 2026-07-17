import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog'
import { fetchDeleteImpact } from '@/features/tests/api/tests-api'
import { deleteImpactFallback, formatDeleteImpact } from '@/features/tests/lib/delete-impact'

/**
 * Delete confirm that loads live dependency counts from the bank API.
 *
 * @param {{
 *   entityType: string,
 *   title: string,
 *   deleteTarget: { uuid: string, label: string } | null,
 *   deletePending?: boolean,
 *   editLabel?: string,
 *   onClose: () => void,
 *   onConfirm: () => void,
 *   onEdit?: (() => void) | null,
 * }} props
 */
export function TestBankDeleteDialog({
  entityType,
  title,
  deleteTarget,
  deletePending = false,
  editLabel,
  onClose,
  onConfirm,
  onEdit = null,
}) {
  const uuid = deleteTarget?.uuid ?? ''
  const impactQuery = useQuery({
    queryKey: ['tests', 'delete-impact', entityType, uuid],
    queryFn: () => fetchDeleteImpact(entityType, uuid),
    enabled: Boolean(uuid),
    staleTime: 15_000,
  })

  const impactLoading = Boolean(uuid) && impactQuery.isFetching && !impactQuery.data
  const impactItems = impactQuery.data
    ? formatDeleteImpact(entityType, impactQuery.data)
    : impactQuery.isError
      ? deleteImpactFallback()
      : []

  return (
    <DeleteConfirmDialog
      open={Boolean(deleteTarget)}
      title={title}
      description={
        deleteTarget ? (
          <>
            Delete <span className="font-medium text-foreground">{deleteTarget.label}</span>? This
            cannot be undone.
          </>
        ) : null
      }
      impactTitle="What happens if you delete"
      impactItems={impactItems}
      loading={deletePending}
      editLabel={editLabel}
      onClose={onClose}
      onEdit={onEdit}
      onConfirm={onConfirm}
    >
      {impactLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Checking what depends on this…
        </div>
      ) : null}
    </DeleteConfirmDialog>
  )
}
