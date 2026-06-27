import { useState } from 'react'
import { Loader2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { dataTableSelectClass } from '@/components/ui/data-table'

/**
 * @param {{
 *   open: boolean,
 *   onOpenChange: (open: boolean) => void,
 *   onSubmit: (payload: { name: string, portalType: 'ADMIN_PORTAL' | 'CLASSROOM_APP' }) => void,
 *   isPending?: boolean,
 * }} props
 */
export function AddRoleForm({ open, onOpenChange, onSubmit, isPending = false }) {
  const [name, setName] = useState('')
  const [portalType, setPortalType] = useState('ADMIN_PORTAL')

  if (!open) return null

  function handleSubmit(e) {
    e.preventDefault()
    onSubmit({
      name: name.trim(),
      portalType: /** @type {'ADMIN_PORTAL' | 'CLASSROOM_APP'} */ (portalType),
    })
  }

  function handleClose() {
    setName('')
    setPortalType('ADMIN_PORTAL')
    onOpenChange(false)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border bg-card p-4 shadow-sm"
    >
      <p className="text-sm font-semibold">Add role</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Admin portal roles can be assigned permissions. Classroom roles are for student/instructor
        invites only.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="role-name">Role name</Label>
          <Input
            id="role-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Content Manager"
            maxLength={64}
            required
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="role-portal">App</Label>
          <select
            id="role-portal"
            className={dataTableSelectClass}
            value={portalType}
            onChange={(e) => setPortalType(e.target.value)}
          >
            <option value="ADMIN_PORTAL">Admin portal</option>
            <option value="CLASSROOM_APP">Classroom app</option>
          </select>
        </div>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={handleClose} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isPending || !name.trim()}>
          {isPending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Plus className="size-4" aria-hidden />
          )}
          Create role
        </Button>
      </div>
    </form>
  )
}
