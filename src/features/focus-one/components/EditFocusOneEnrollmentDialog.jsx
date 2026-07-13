import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/ui/modal'
import {
  fetchTrainingSubjects,
  updateFocusOneEnrollment,
} from '@/features/focus-one/api/focus-one-api'
import {
  ENROLLMENT_STATUS_OPTIONS,
  formatPersonName,
  formatTimezoneDisplay,
  formatTrainingTrack,
} from '@/features/focus-one/constants'
import { fetchUsers } from '@/features/users/api/users-api'
import { handleApiError } from '@/lib/http/api-error'
import { notifyError, notifySuccess } from '@/lib/notifications'

const usersQueryKey = ['admin', 'users', 'focus-one-edit']
const enrollmentsQueryKey = ['focus-one', 'enrollments']

/**
 * @param {{
 *   open: boolean
 *   onOpenChange: (open: boolean) => void
 *   enrollment: Record<string, any> | null
 *   onSuccess?: () => void
 * }} props
 */
export function EditFocusOneEnrollmentDialog({
  open,
  onOpenChange,
  enrollment,
  onSuccess,
}) {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState('ACTIVE')
  const [selectedSubjectUuids, setSelectedSubjectUuids] = useState(/** @type {string[]} */ ([]))
  const [instructorBySubject, setInstructorBySubject] = useState(/** @type {Record<string, string>} */ ({}))
  const [subjectQuery, setSubjectQuery] = useState('')

  const enrollmentConfig = enrollment?.program?.enrollmentConfig ?? {
    subjectSelection: { enabled: true, minSubjects: 1, instructorRequired: true },
  }
  const subjectSelection = enrollmentConfig.subjectSelection ?? {
    enabled: true,
    minSubjects: 1,
    instructorRequired: true,
  }

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: usersQueryKey,
    queryFn: fetchUsers,
    enabled: open,
  })

  const { data: subjects = [], isLoading: subjectsLoading } = useQuery({
    queryKey: ['focus-one', 'subjects'],
    queryFn: fetchTrainingSubjects,
    enabled: open,
  })

  const instructorOptions = useMemo(() => {
    return users
      .filter(
        (user) =>
          user.isActive &&
          user.email &&
          user.uuid &&
          user.role?.name === 'Instructor',
      )
      .map((user) => ({
        uuid: user.uuid,
        email: user.email,
        name: [user.firstName, user.lastName].filter(Boolean).join(' '),
        timezone: user.timezone ?? null,
      }))
      .sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email))
  }, [users])

  const selectedSubjects = useMemo(() => {
    const byUuid = new Map(subjects.map((subject) => [subject.uuid, subject]))
    return selectedSubjectUuids
      .map((uuid) => byUuid.get(uuid))
      .filter(Boolean)
  }, [subjects, selectedSubjectUuids])

  const filteredSubjects = useMemo(() => {
    const q = subjectQuery.trim().toLowerCase()
    if (!q) return subjects
    return subjects.filter((subject) => subject.name?.toLowerCase().includes(q))
  }, [subjects, subjectQuery])

  useEffect(() => {
    if (!open || !enrollment) return

    setStatus(enrollment.status ?? 'ACTIVE')
    const subjectUuids = (enrollment.subjects ?? []).map((subject) => subject.uuid)
    setSelectedSubjectUuids(subjectUuids)

    /** @type {Record<string, string>} */
    const instructors = {}
    for (const subject of enrollment.subjects ?? []) {
      if (subject.uuid && subject.instructor?.uuid) {
        instructors[subject.uuid] = subject.instructor.uuid
      }
    }
    setInstructorBySubject(instructors)
    setSubjectQuery('')
  }, [open, enrollment])

  function buildInstructorPayload() {
    /** @type {Record<string, string>} */
    const payload = {}
    for (const subjectUuid of selectedSubjectUuids) {
      const instructorUuid = instructorBySubject[subjectUuid]?.trim()
      if (instructorUuid) payload[subjectUuid] = instructorUuid
    }
    return payload
  }

  const allTeachersAssigned =
    !subjectSelection.instructorRequired ||
    selectedSubjectUuids.length === 0 ||
    selectedSubjectUuids.every((subjectUuid) => Boolean(instructorBySubject[subjectUuid]?.trim()))

  const subjectsValid =
    !subjectSelection.enabled ||
    selectedSubjectUuids.length >= (subjectSelection.minSubjects ?? 1)

  const instructorsValid =
    !subjectSelection.instructorRequired ||
    selectedSubjectUuids.length === 0 ||
    allTeachersAssigned

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!enrollment?.uuid) {
        throw new Error('Enrollment not found')
      }
      return updateFocusOneEnrollment(enrollment.uuid, {
        status,
        subjectUuids: selectedSubjectUuids,
        instructorBySubject: buildInstructorPayload(),
      })
    },
    onSuccess: () => {
      notifySuccess('Enrollment updated')
      queryClient.invalidateQueries({ queryKey: enrollmentsQueryKey })
      onOpenChange(false)
      onSuccess?.()
    },
    onError: (error) => notifyError(handleApiError(error)),
  })

  const canSubmit =
    subjectsValid &&
    instructorsValid &&
    (!subjectSelection.instructorRequired || instructorOptions.length > 0) &&
    !saveMutation.isPending &&
    !usersLoading &&
    !subjectsLoading

  function toggleSubject(uuid) {
    setSelectedSubjectUuids((current) => {
      if (current.includes(uuid)) {
        setInstructorBySubject((assignments) => {
          const next = { ...assignments }
          delete next[uuid]
          return next
        })
        return current.filter((id) => id !== uuid)
      }
      return [...current, uuid]
    })
  }

  function setInstructorForSubject(subjectUuid, instructorUuid) {
    setInstructorBySubject((current) => {
      const next = { ...current }
      if (!instructorUuid) {
        delete next[subjectUuid]
      } else {
        next[subjectUuid] = instructorUuid
      }
      return next
    })
  }

  if (!open || !enrollment) return null

  const student = enrollment.student ?? {}
  const program = enrollment.program ?? {}

  return (
    <Modal
      open={open}
      onClose={() => onOpenChange(false)}
      size="lg"
      closeDisabled={saveMutation.isPending}
    >
      <ModalHeader
        title="Edit enrollment"
        description="Update subjects, teachers, and status for this FocusOne enrollment."
        onClose={() => onOpenChange(false)}
        closeDisabled={saveMutation.isPending}
      />
      <ModalBody className="space-y-4">
          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <p className="font-medium">{formatPersonName(student)}</p>
            <p className="text-muted-foreground">{student.email}</p>
            {student.timezone ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Student timezone: {formatTimezoneDisplay(student.timezone)}
              </p>
            ) : null}
            <p className="mt-2 font-medium">{program.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatTrainingTrack(program.track)}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="focus-one-edit-status">Status</Label>
            <select
              id="focus-one-edit-status"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              disabled={saveMutation.isPending}
            >
              {ENROLLMENT_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {subjectSelection.enabled ? (
            <div className="space-y-2">
              <Label htmlFor="focus-one-edit-subject-search">Subjects</Label>
              <Input
                id="focus-one-edit-subject-search"
                value={subjectQuery}
                onChange={(event) => setSubjectQuery(event.target.value)}
                placeholder="Search subjects…"
                disabled={saveMutation.isPending || subjectsLoading}
              />
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-2">
                {subjectsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading subjects…</p>
                ) : filteredSubjects.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No subjects found.</p>
                ) : (
                  filteredSubjects.map((subject) => (
                    <label
                      key={subject.uuid}
                      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
                    >
                      <input
                        type="checkbox"
                        checked={selectedSubjectUuids.includes(subject.uuid)}
                        onChange={() => toggleSubject(subject.uuid)}
                        disabled={saveMutation.isPending}
                      />
                      <span>{subject.name}</span>
                    </label>
                  ))
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedSubjectUuids.length} subject
                {selectedSubjectUuids.length === 1 ? '' : 's'} selected
              </p>
            </div>
          ) : null}

          {subjectSelection.enabled &&
          selectedSubjects.length > 0 &&
          subjectSelection.instructorRequired ? (
            <div className="space-y-3">
              <div>
                <Label>Teachers</Label>
                <p className="text-xs text-muted-foreground">
                  Assign an instructor for each selected subject.
                </p>
              </div>
              <div className="space-y-2 rounded-md border p-3">
                {selectedSubjects.map((subject) => (
                  <div
                    key={subject.uuid}
                    className="grid gap-2 sm:grid-cols-[1fr_1.2fr] sm:items-center"
                  >
                    <span className="text-sm font-medium">{subject.name}</span>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={instructorBySubject[subject.uuid] ?? ''}
                      onChange={(event) =>
                        setInstructorForSubject(subject.uuid, event.target.value)
                      }
                      disabled={saveMutation.isPending}
                      required
                    >
                      <option value="" disabled>
                        Select teacher…
                      </option>
                      {instructorOptions.map((instructor) => (
                        <option key={instructor.uuid} value={instructor.uuid}>
                          {instructor.name
                            ? `${instructor.name} · ${formatTimezoneDisplay(instructor.timezone)}`
                            : `${instructor.email} · ${formatTimezoneDisplay(instructor.timezone)}`}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
                {instructorOptions.length === 0 ? (
                  <p className="text-xs text-destructive">
                    No instructors found. Add instructors from Users first.
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
      </ModalBody>
      <ModalFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={saveMutation.isPending}
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={() => saveMutation.mutate()}
          disabled={!canSubmit}
        >
          {saveMutation.isPending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Saving…
            </>
          ) : (
            'Save changes'
          )}
        </Button>
      </ModalFooter>
    </Modal>
  )
}
