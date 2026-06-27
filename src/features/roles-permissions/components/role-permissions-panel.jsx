import {
  PERMISSION_ACTION_LABELS,
  UI_PERMISSION_SECTIONS,
} from '@/features/roles-permissions/constants'

/**
 * @param {{
 *   readOnly?: boolean,
 *   permissions: Record<string, Partial<Record<import('@/features/roles-permissions/constants').PermissionAction, boolean>>>,
 *   onToggle: (screenId: string, action: import('@/features/roles-permissions/constants').PermissionAction, enabled: boolean) => void,
 * }} props
 */
export function RolePermissionsPanel({ readOnly = false, permissions, onToggle }) {
  return (
    <div className="space-y-6">
      {UI_PERMISSION_SECTIONS.map((section) => (
        <section key={section.id} className="overflow-hidden rounded-xl border bg-card">
          <div className="border-b bg-muted/30 px-4 py-2.5">
            <h3 className="text-sm font-semibold">{section.label}</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">Screen</th>
                  {Object.entries(PERMISSION_ACTION_LABELS).map(([action, label]) => (
                    <th key={action} className="px-3 py-2.5 text-center font-medium">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {section.screens.map((screen) => (
                  <tr key={screen.id} className="border-b last:border-b-0">
                    <td className="px-4 py-3 font-medium">{screen.label}</td>
                    {Object.keys(PERMISSION_ACTION_LABELS).map((action) => {
                      const isApplicable = screen.actions.includes(
                        /** @type {import('@/features/roles-permissions/constants').PermissionAction} */ (
                          action
                        ),
                      )

                      if (!isApplicable) {
                        return <td key={action} className="px-3 py-3 text-center text-muted-foreground/40">—</td>
                      }

                      return (
                        <td key={action} className="px-3 py-3 text-center">
                          <input
                            type="checkbox"
                            className="size-4 rounded border-input accent-primary disabled:cursor-not-allowed"
                            checked={Boolean(permissions[screen.id]?.[action])}
                            disabled={readOnly}
                            aria-label={`${screen.label} — ${PERMISSION_ACTION_LABELS[action]}`}
                            onChange={(e) =>
                              onToggle(
                                screen.id,
                                /** @type {import('@/features/roles-permissions/constants').PermissionAction} */ (
                                  action
                                ),
                                e.target.checked,
                              )
                            }
                          />
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  )
}
