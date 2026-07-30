import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/ui/modal'
import { SUPER_ADMIN_ROLE_NAME } from '@/features/invitations/constants'
import {
  bytesToStorageMb,
  DEFAULT_STORAGE_QUOTA_MB,
  storageMbToBytes,
} from '@/features/users/lib/user-storage'

/**
 * @param {{
 *   open: boolean
 *   onOpenChange: (open: boolean) => void
 *   user: import('@/features/users/api/users-api.types').AdminUserRow | null
 *   onSave: (payload: {
 *     firstName: string
 *     lastName: string | null
 *     isActive?: boolean
 *     storageQuotaBytes: number
 *   }) => void | Promise<void>
 *   isPending?: boolean
 *   errors?: Record<string, string>
 * }} props
 */
export function UserEditDialog({
  open,
  onOpenChange,
  user,
  onSave,
  isPending = false,
  errors = {},
}) {
  const roleName = user?.role?.name ?? null
  const isSuperAdmin = roleName === SUPER_ADMIN_ROLE_NAME

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [storageQuotaMb, setStorageQuotaMb] = useState(DEFAULT_STORAGE_QUOTA_MB)

  useEffect(() => {
    if (!open || !user) return
    setFirstName(user.firstName ?? '')
    setLastName(user.lastName ?? '')
    setIsActive(Boolean(user.isActive))
    setStorageQuotaMb(bytesToStorageMb(user.storageQuotaBytes))
  }, [open, user])

  async function handleSubmit(event) {
    event.preventDefault()
    const trimmedFirst = firstName.trim()
    if (!trimmedFirst) return

    /** @type {{ firstName: string, lastName: string | null, storageQuotaBytes: number, isActive?: boolean }} */
    const payload = {
      firstName: trimmedFirst,
      lastName: lastName.trim() || null,
      storageQuotaBytes: storageMbToBytes(storageQuotaMb),
    }
    if (!isSuperAdmin) {
      payload.isActive = isActive
    }
    await onSave(payload)
  }

  return (
    <Modal
      open={open}
      onClose={() => onOpenChange(false)}
      size="md"
      closeDisabled={isPending}
      aria-labelledby="edit-user-title"
    >
      <ModalHeader
        title="Edit user"
        description="Update profile fields and account settings."
        titleId="edit-user-title"
        onClose={() => onOpenChange(false)}
        closeDisabled={isPending}
      />
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col" noValidate>
        <ModalBody className="space-y-4">
          {errors.root ? (
            <p
              className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              role="alert"
            >
              {errors.root}
            </p>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-user-first">First name</Label>
              <Input
                id="edit-user-first"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                aria-invalid={Boolean(errors.firstName)}
                disabled={isPending}
              />
              {errors.firstName ? (
                <p className="text-sm text-destructive">{errors.firstName}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-user-last">Last name</Label>
              <Input
                id="edit-user-last"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                disabled={isPending}
              />
            </div>
          </div>

          {isSuperAdmin ? (
            <p className="text-xs text-muted-foreground">
              Super Admin accounts cannot be deactivated from this screen.
            </p>
          ) : (
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 rounded border-input"
                checked={isActive}
                onChange={(event) => setIsActive(event.target.checked)}
                disabled={isPending}
              />
              Account active
            </label>
          )}

          <div className="space-y-2">
            <Label htmlFor="edit-user-storage">Cloud storage limit (MB)</Label>
            <Input
              id="edit-user-storage"
              type="number"
              min={1}
              step={1}
              value={storageQuotaMb}
              onChange={(event) =>
                setStorageQuotaMb(Number(event.target.value) || DEFAULT_STORAGE_QUOTA_MB)
              }
              aria-invalid={Boolean(errors.storageQuotaBytes)}
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground">
              Default is {DEFAULT_STORAGE_QUOTA_MB} MB. Applies to cloud drive uploads.
            </p>
            {errors.storageQuotaBytes ? (
              <p className="text-sm text-destructive">{errors.storageQuotaBytes}</p>
            ) : null}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isPending || !firstName.trim()}>
            {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            Save changes
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  )
}
