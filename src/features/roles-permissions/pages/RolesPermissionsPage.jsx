import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Save, Trash2 } from 'lucide-react'
import { Navigate } from 'react-router-dom'
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog'
import { Button } from '@/components/ui/button'
import {
  hasPermission,
} from '@/features/auth/lib/admin-section-access'
import { AddRoleForm } from '@/features/roles-permissions/components/add-role-form'
import { RolePermissionsPanel } from '@/features/roles-permissions/components/role-permissions-panel'
import {
  createRole,
  deleteRole,
  fetchRolePermissions,
  updateRolePermissions,
} from '@/features/roles-permissions/api/permissions-api'
import { createFullAccessPermissions } from '@/features/roles-permissions/constants'
import { handleApiError } from '@/lib/http/api-error'
import { notifyError, notifySuccess } from '@/lib/notifications'
import { useAuthStore } from '@/stores/auth-store'
import { usePermissionsStore } from '@/stores/permissions-store'
import { cn } from '@/lib/utils'

const rolePermissionsQueryKey = ['admin', 'role-permissions']

export default function RolesPermissionsPage() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const matrix = usePermissionsStore((s) => s.matrix)
  const hasHydrated = useAuthStore((s) => s._hasHydrated)
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping)

  const canView = hasPermission(matrix, 'roles.permissions', 'view', user)
  const canEdit = hasPermission(matrix, 'roles.permissions', 'edit', user)
  const canCreate = hasPermission(matrix, 'roles.permissions', 'create', user)
  const canDelete = hasPermission(matrix, 'roles.permissions', 'delete', user)

  const [selectedRoleUuid, setSelectedRoleUuid] = useState(null)
  const [showAddRole, setShowAddRole] = useState(false)
  const [draftPermissions, setDraftPermissions] = useState(
    /** @type {Record<string, Record<string, Record<string, boolean>>>} */ ({}),
  )
  const [isDirty, setIsDirty] = useState(false)
  const [deleteRoleConfirmOpen, setDeleteRoleConfirmOpen] = useState(false)

  const permissionsQuery = useQuery({
    queryKey: rolePermissionsQueryKey,
    queryFn: fetchRolePermissions,
    enabled: canView,
  })

  const saveMutation = useMutation({
    mutationFn: ({ roleUuid, permissions }) => updateRolePermissions(roleUuid, permissions),
    onSuccess: async () => {
      notifySuccess('Permissions saved')
      setIsDirty(false)
      await queryClient.invalidateQueries({ queryKey: rolePermissionsQueryKey })
    },
    onError: (error) => notifyError(handleApiError(error)),
  })

  const createRoleMutation = useMutation({
    mutationFn: createRole,
    onSuccess: async (role) => {
      notifySuccess(`Role "${role.name}" created`)
      setShowAddRole(false)
      if (role.configurable) {
        setSelectedRoleUuid(role.uuid)
      }
      setIsDirty(false)
      await queryClient.invalidateQueries({ queryKey: rolePermissionsQueryKey })
      await queryClient.invalidateQueries({ queryKey: ['admin', 'invitable-roles'] })
    },
    onError: (error) => notifyError(handleApiError(error)),
  })

  const deleteRoleMutation = useMutation({
    mutationFn: deleteRole,
    onSuccess: async (result) => {
      notifySuccess(`Role "${result.name}" deleted`)
      setSelectedRoleUuid(null)
      setIsDirty(false)
      setDeleteRoleConfirmOpen(false)
      await queryClient.invalidateQueries({ queryKey: rolePermissionsQueryKey })
      await queryClient.invalidateQueries({ queryKey: ['admin', 'invitable-roles'] })
    },
    onError: (error) => notifyError(handleApiError(error)),
  })

  const configurableRoles = permissionsQuery.data?.roles ?? []
  const classroomRoles = permissionsQuery.data?.classroomRoles ?? []
  const superAdminName = permissionsQuery.data?.superAdmin?.name ?? 'Super Admin'

  const allRoles = useMemo(
    () => [
      { uuid: 'super-admin', name: superAdminName, configurable: false, isSystem: true },
      ...configurableRoles.map((role) => ({
        uuid: role.uuid,
        name: role.name,
        configurable: true,
        isSystem: role.isSystem,
        permissions: role.permissions,
      })),
    ],
    [configurableRoles, superAdminName],
  )

  const selectedRole =
    allRoles.find((role) => role.uuid === selectedRoleUuid) ??
    allRoles.find((role) => role.configurable)

  if (!hasHydrated || isBootstrapping) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
      </div>
    )
  }

  if (!canView) {
    return <Navigate to="/" replace />
  }

  if (permissionsQuery.isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
      </div>
    )
  }

  if (permissionsQuery.isError) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        {handleApiError(permissionsQuery.error)}
      </div>
    )
  }

  const activeRoleUuid = selectedRole?.uuid ?? null
  const isReadOnly = !selectedRole?.configurable || !canEdit
  const canDeleteSelected =
    canDelete && selectedRole?.configurable && !selectedRole?.isSystem && activeRoleUuid

  const serverPermissions = selectedRole?.permissions ?? {}
  const panelPermissions = isDirty
    ? draftPermissions[activeRoleUuid] ?? serverPermissions
    : serverPermissions

  function handleToggle(screenId, action, enabled) {
    if (!activeRoleUuid || isReadOnly || !canEdit) return

    const base = draftPermissions[activeRoleUuid] ?? serverPermissions
    setDraftPermissions((prev) => ({
      ...prev,
      [activeRoleUuid]: {
        ...base,
        [screenId]: {
          ...base[screenId],
          [action]: enabled,
        },
      },
    }))
    setIsDirty(true)
  }

  function handleSave() {
    if (!activeRoleUuid || isReadOnly || !isDirty) return
    saveMutation.mutate({
      roleUuid: activeRoleUuid,
      permissions: draftPermissions[activeRoleUuid] ?? serverPermissions,
    })
  }

  function handleDeleteRole() {
    if (!canDeleteSelected || !activeRoleUuid) return
    setDeleteRoleConfirmOpen(true)
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Roles &amp; permissions</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Add roles, then set access per screen and action.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canDeleteSelected ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDeleteRole}
              disabled={deleteRoleMutation.isPending}
            >
              {deleteRoleMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Trash2 className="size-4" aria-hidden />
              )}
              Delete role
            </Button>
          ) : null}
          {canEdit ? (
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={!isDirty || isReadOnly || saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Save className="size-4" aria-hidden />
              )}
              Save
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {allRoles.map((role) => {
          const isActive = role.uuid === activeRoleUuid
          return (
            <button
              key={role.uuid}
              type="button"
              onClick={() => {
                setSelectedRoleUuid(role.uuid)
                setIsDirty(false)
              }}
              className={cn(
                'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground',
              )}
            >
              {role.name}
            </button>
          )
        })}
        {canCreate ? (
          <button
            type="button"
            onClick={() => setShowAddRole((v) => !v)}
            className="rounded-full border border-dashed px-4 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            + Add role
          </button>
        ) : null}
      </div>

      <AddRoleForm
        open={showAddRole && canCreate}
        onOpenChange={setShowAddRole}
        onSubmit={(payload) => createRoleMutation.mutate(payload)}
        isPending={createRoleMutation.isPending}
      />

      {classroomRoles.length > 0 ? (
        <p className="text-sm text-muted-foreground">
          Classroom roles: {classroomRoles.map((role) => role.name).join(', ')} — available for
          invites; permissions are managed in the classroom app.
        </p>
      ) : null}

      {isReadOnly ? (
        <>
          <p className="text-sm text-muted-foreground">
            {superAdminName} always has full access and cannot be restricted.
          </p>
          <RolePermissionsPanel
            readOnly
            permissions={createFullAccessPermissions()}
            onToggle={() => {}}
          />
        </>
      ) : (
        <RolePermissionsPanel
          readOnly={!canEdit}
          permissions={panelPermissions}
          onToggle={handleToggle}
        />
      )}

      <DeleteConfirmDialog
        open={deleteRoleConfirmOpen}
        title="Delete role?"
        description={
          <>
            Delete{' '}
            <span className="font-medium text-foreground">
              {selectedRole?.name ?? 'this role'}
            </span>
            ? This cannot be undone.
          </>
        }
        loading={deleteRoleMutation.isPending}
        onClose={() => setDeleteRoleConfirmOpen(false)}
        onConfirm={() => activeRoleUuid && deleteRoleMutation.mutate(activeRoleUuid)}
      />
    </div>
  )
}
