import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Trash2 } from 'lucide-react'
import { ActionConfirmDialog, ActionImpactList } from '@/components/ui/action-confirm-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/ui/modal'
import {
  createTrainingProgram,
  deleteTrainingProgram,
  updateTrainingProgram,
} from '@/features/focus-one/api/focus-one-api'
import {
  PROGRAM_TYPE_OPTIONS,
  TRACK_OPTIONS,
} from '@/features/training/constants'
import { hasPermission } from '@/features/auth/lib/admin-section-access'
import { handleApiError } from '@/lib/http/api-error'
import { notifyError, notifySuccess } from '@/lib/notifications'
import { useAuthStore } from '@/stores/auth-store'
import { usePermissionsStore } from '@/stores/permissions-store'

const programsQueryKey = ['training', 'programs', 'catalog']

/**
 * @param {{
 *   open: boolean
 *   onOpenChange: (open: boolean) => void
 *   program?: Record<string, any> | null
 * }} props
 */
export function ProgramFormDialog({ open, onOpenChange, program = null }) {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const matrix = usePermissionsStore((s) => s.matrix)
  const canDelete = hasPermission(matrix, 'training_programs', 'delete', user)
  const isEdit = Boolean(program?.uuid)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [track, setTrack] = useState(TRACK_OPTIONS[0].value)
  const [programType, setProgramType] = useState(PROGRAM_TYPE_OPTIONS[0].value)
  const [isActive, setIsActive] = useState(true)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [confirmName, setConfirmName] = useState('')
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    if (!open) return
    setDeleteOpen(false)
    setConfirmName('')
    setDeleteError('')
    if (program) {
      setName(program.name ?? '')
      setDescription(program.description ?? '')
      setTrack(program.track ?? TRACK_OPTIONS[0].value)
      setProgramType(program.programType ?? PROGRAM_TYPE_OPTIONS[0].value)
      setIsActive(program.isActive !== false)
      return
    }
    setName('')
    setDescription('')
    setTrack(TRACK_OPTIONS[0].value)
    setProgramType(PROGRAM_TYPE_OPTIONS[0].value)
    setIsActive(true)
  }, [open, program])

  useEffect(() => {
    if (!deleteOpen) {
      setConfirmName('')
      setDeleteError('')
    }
  }, [deleteOpen])

  const saveMutation = useMutation({
    mutationFn: () => {
      if (isEdit) {
        return updateTrainingProgram(program.uuid, {
          name: name.trim(),
          description: description.trim() || null,
          isActive,
        })
      }
      return createTrainingProgram({
        name: name.trim(),
        description: description.trim() || undefined,
        track,
        programType,
        isActive,
      })
    },
    onSuccess: () => {
      notifySuccess(isEdit ? 'Program updated' : 'Program created')
      queryClient.invalidateQueries({ queryKey: programsQueryKey })
      queryClient.invalidateQueries({ queryKey: ['focus-one', 'programs'] })
      onOpenChange(false)
    },
    onError: (error) => notifyError(handleApiError(error)),
  })

  const deleteMutation = useMutation({
    mutationFn: () =>
      deleteTrainingProgram(program.uuid, {
        confirmKey: confirmName.trim(),
      }),
    onSuccess: () => {
      notifySuccess('Program deleted')
      queryClient.invalidateQueries({ queryKey: programsQueryKey })
      queryClient.invalidateQueries({ queryKey: ['focus-one', 'programs'] })
      setDeleteOpen(false)
      onOpenChange(false)
    },
    onError: (error) => {
      const parsed = handleApiError(error)
      const message =
        parsed.statusCode === 409
          ? parsed.message ||
            'This program still has active enrollments. Cancel or reassign them before deleting.'
          : parsed.message || 'Could not delete this program'
      setDeleteError(message)
      notifyError(message)
    },
  })

  const expectedName = String(program?.name ?? '').trim()
  const nameMatches = confirmName.trim() === expectedName
  const busy = saveMutation.isPending || deleteMutation.isPending
  const canSubmit = Boolean(name.trim()) && !busy

  return (
    <>
      <Modal
        open={open}
        onClose={() => onOpenChange(false)}
        size="md"
        closeDisabled={busy}
      >
        <ModalHeader
          title={isEdit ? 'Edit program' : 'Add program'}
          description={
            isEdit
              ? 'Update this training program’s name, description, or active status.'
              : 'Create a new training program in the catalog.'
          }
          onClose={() => onOpenChange(false)}
          closeDisabled={busy}
        />
        <ModalBody className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="program-name">Name</Label>
            <Input
              id="program-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. NIOS — FocusOne"
              disabled={busy}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="program-description">Description</Label>
            <textarea
              id="program-description"
              className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Short description for admins"
              disabled={busy}
            />
          </div>

          {!isEdit ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="program-track">Track</Label>
                <select
                  id="program-track"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={track}
                  onChange={(event) => setTrack(event.target.value)}
                  disabled={busy}
                >
                  {TRACK_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="program-type">Program type</Label>
                <select
                  id="program-type"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={programType}
                  onChange={(event) => setProgramType(event.target.value)}
                  disabled={busy}
                >
                  {PROGRAM_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <p className="font-medium">{program?.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Track and type are fixed after creation.
              </p>
            </div>
          )}

          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
              disabled={busy}
            />
            Active (can accept enrollments when supported)
          </label>
        </ModalBody>
        <ModalFooter className={isEdit && canDelete ? 'sm:justify-between' : undefined}>
          {isEdit && canDelete ? (
            <Button
              type="button"
              variant="destructive"
              onClick={() => setDeleteOpen(true)}
              disabled={busy}
              className="sm:mr-auto"
            >
              <Trash2 className="mr-2 size-4" />
              Delete
            </Button>
          ) : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button type="button" onClick={() => saveMutation.mutate()} disabled={!canSubmit}>
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Saving…
                </>
              ) : isEdit ? (
                'Save changes'
              ) : (
                'Add program'
              )}
            </Button>
          </div>
        </ModalFooter>
      </Modal>

      <ActionConfirmDialog
        open={deleteOpen}
        title="Delete this program permanently?"
        description={
          program ? (
            <>
              This removes <strong>{program.name}</strong> from the catalog. Programs with
              student enrollments cannot be deleted.
            </>
          ) : null
        }
        confirmLabel="Delete program"
        cancelLabel="Keep program"
        loading={deleteMutation.isPending}
        confirmDisabled={!nameMatches}
        onClose={() => !deleteMutation.isPending && setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
      >
        <ActionImpactList
          items={[
            'The catalog entry is removed and cannot be restored from this screen.',
            'Existing enrollments block deletion — cancel or migrate them first.',
          ]}
        />
        {deleteError ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {deleteError}
          </p>
        ) : null}
        <div className="space-y-2 rounded-md border border-destructive/20 bg-destructive/5 p-3">
          <Label htmlFor="confirm-program-name">
            Type <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{expectedName}</code>{' '}
            to confirm
          </Label>
          <Input
            id="confirm-program-name"
            value={confirmName}
            onChange={(event) => {
              setConfirmName(event.target.value)
              if (deleteError) setDeleteError('')
            }}
            placeholder={expectedName}
            disabled={deleteMutation.isPending}
            className="text-sm"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </ActionConfirmDialog>
    </>
  )
}
