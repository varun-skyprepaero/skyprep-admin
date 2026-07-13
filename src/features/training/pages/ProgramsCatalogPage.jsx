import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Loader2, Pencil, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DataTable,
  DataTableContent,
  DataTablePagination,
  DataTableToolbar,
  dataTableSelectClass,
} from '@/components/ui/data-table'
import { fetchTrainingPrograms } from '@/features/focus-one/api/focus-one-api'
import { hasPermission } from '@/features/auth/lib/admin-section-access'
import { ProgramFormDialog } from '@/features/training/components/ProgramFormDialog'
import {
  formatProgramType,
  formatTrainingTrack,
  programTypeToSlug,
  summarizeEnrollmentConfig,
} from '@/features/training/constants'
import { usePaginatedRows } from '@/hooks/use-paginated-rows'
import { useAuthStore } from '@/stores/auth-store'
import { usePermissionsStore } from '@/stores/permissions-store'
import { cn } from '@/lib/utils'

const programsQueryKey = ['training', 'programs', 'catalog']

/**
 * @param {{ active: boolean }} props
 */
function StatusBadge({ active }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium',
        active
          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
          : 'bg-muted text-muted-foreground',
      )}
    >
      {active ? 'Live' : 'Inactive'}
    </span>
  )
}

export default function ProgramsCatalogPage() {
  const user = useAuthStore((s) => s.user)
  const matrix = usePermissionsStore((s) => s.matrix)
  const canCreate = hasPermission(matrix, 'training_programs', 'create', user)
  const canEdit = hasPermission(matrix, 'training_programs', 'edit', user)

  const [search, setSearch] = useState('')
  const [trackFilter, setTrackFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingProgram, setEditingProgram] = useState(
    /** @type {Record<string, any> | null} */ (null),
  )

  const { data: programs = [], isLoading } = useQuery({
    queryKey: programsQueryKey,
    queryFn: () => fetchTrainingPrograms(),
  })

  const filterOptions = useMemo(() => {
    const tracks = new Set()
    const types = new Set()
    for (const program of programs) {
      if (program.track) tracks.add(program.track)
      if (program.programType) types.add(program.programType)
    }
    return {
      tracks: [...tracks].sort((a, b) =>
        formatTrainingTrack(a).localeCompare(formatTrainingTrack(b)),
      ),
      types: [...types].sort((a, b) =>
        formatProgramType(a).localeCompare(formatProgramType(b)),
      ),
    }
  }, [programs])

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return programs.filter((program) => {
      if (trackFilter && program.track !== trackFilter) return false
      if (typeFilter && program.programType !== typeFilter) return false
      if (statusFilter === 'live' && !program.isActive) return false
      if (statusFilter === 'inactive' && program.isActive) return false
      if (!q) return true
      const haystack = [
        program.name,
        program.description,
        formatTrainingTrack(program.track),
        formatProgramType(program.programType),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [programs, search, trackFilter, typeFilter, statusFilter])

  const { paginatedRows, paginationProps, resetPage } = usePaginatedRows(filteredRows)

  const activeCount = programs.filter((program) => program.isActive).length

  function openCreate() {
    setEditingProgram(null)
    setFormOpen(true)
  }

  function openEdit(program) {
    setEditingProgram(program)
    setFormOpen(true)
  }

  function onSearchChange(value) {
    setSearch(value)
    resetPage()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">Training catalog</p>
          <p className="text-sm text-muted-foreground">
            {isLoading
              ? 'Loading…'
              : `${programs.length} programs · ${filterOptions.tracks.length} tracks · ${filterOptions.types.length} types · ${activeCount} live`}
          </p>
        </div>
        {canCreate ? (
          <Button type="button" size="sm" onClick={openCreate}>
            <Plus className="mr-1.5 size-3.5" />
            Add program
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <div className="flex min-h-[24vh] items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading programs…
        </div>
      ) : programs.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed bg-muted/20 px-5 py-10">
          <div>
            <p className="text-sm font-medium">No programs yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create a training program to start accepting enrollments.
            </p>
          </div>
          {canCreate ? (
            <Button type="button" size="sm" onClick={openCreate}>
              <Plus className="mr-1.5 size-3.5" />
              Add program
            </Button>
          ) : null}
        </div>
      ) : (
        <DataTable>
          <DataTableToolbar
            searchValue={search}
            onSearchChange={onSearchChange}
            searchPlaceholder="Search name, key, track, or type…"
          >
            <select
              className={dataTableSelectClass}
              value={trackFilter}
              onChange={(event) => {
                setTrackFilter(event.target.value)
                resetPage()
              }}
              aria-label="Filter by track"
            >
              <option value="">All tracks</option>
              {filterOptions.tracks.map((track) => (
                <option key={track} value={track}>
                  {formatTrainingTrack(track)}
                </option>
              ))}
            </select>
            <select
              className={dataTableSelectClass}
              value={typeFilter}
              onChange={(event) => {
                setTypeFilter(event.target.value)
                resetPage()
              }}
              aria-label="Filter by program type"
            >
              <option value="">All types</option>
              {filterOptions.types.map((type) => (
                <option key={type} value={type}>
                  {formatProgramType(type)}
                </option>
              ))}
            </select>
            <select
              className={dataTableSelectClass}
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value)
                resetPage()
              }}
              aria-label="Filter by status"
            >
              <option value="">All statuses</option>
              <option value="live">Live</option>
              <option value="inactive">Inactive</option>
            </select>
          </DataTableToolbar>

          <DataTableContent>
            {filteredRows.length === 0 ? (
              <div className="px-6 py-10 text-sm text-muted-foreground">
                No programs match these filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Program</th>
                      <th className="px-4 py-3 font-medium">Track</th>
                      <th className="px-4 py-3 font-medium">Type</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Enrollment</th>
                      <th className="px-4 py-3 font-medium">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRows.map((program) => {
                      const canManageEnrollments = Boolean(program.isActive)
                      return (
                        <tr
                          key={program.uuid || program.programKey}
                          className="border-b last:border-0 hover:bg-muted/30"
                        >
                          <td className="px-4 py-3.5 align-top">
                            <div className="font-medium">{program.name}</div>
                            {program.description ? (
                              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                                {program.description}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-4 py-3.5 align-top">
                            {formatTrainingTrack(program.track)}
                          </td>
                          <td className="px-4 py-3.5 align-top">
                            {formatProgramType(program.programType)}
                          </td>
                          <td className="px-4 py-3.5 align-top">
                            <StatusBadge active={Boolean(program.isActive)} />
                          </td>
                          <td className="px-4 py-3.5 align-top text-xs text-muted-foreground">
                            {summarizeEnrollmentConfig(program.enrollmentConfig)}
                          </td>
                          <td className="px-4 py-3.5 align-top">
                            <div className="flex justify-end gap-1.5">
                              {canEdit ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-8"
                                  onClick={() => openEdit(program)}
                                >
                                  <Pencil className="mr-1 size-3.5" />
                                  Edit
                                </Button>
                              ) : null}
                              {canManageEnrollments ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-8"
                                  asChild
                                >
                                  <Link to={`/programs/${programTypeToSlug(program.programType)}`}>
                                    Enrollments
                                    <ArrowRight className="ml-1 size-3.5" />
                                  </Link>
                                </Button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </DataTableContent>

          <DataTablePagination {...paginationProps} />
        </DataTable>
      )}

      <ProgramFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditingProgram(null)
        }}
        program={editingProgram}
      />
    </div>
  )
}
