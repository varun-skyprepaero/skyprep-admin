import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/ui/modal'
import {
  createFocusOneEnrollment,
  createFocusOneInvitation,
  createTrainingEnrollment,
  fetchTrainingPrograms,
  fetchTrainingSubjects,
} from '@/features/focus-one/api/focus-one-api'
import { formatTimezoneDisplay } from '@/features/focus-one/constants'
import {
  StudentSearchField,
  isKnownStudentEmail,
} from '@/features/subscription/components/StudentSearchField'
import { formatProgramType } from '@/features/training/constants'
import { fetchUsers } from '@/features/users/api/users-api'
import { handleApiError } from '@/lib/http/api-error'
import { notifyError, notifySuccess } from '@/lib/notifications'

const usersQueryKey = ['admin', 'users', 'training-enroll']

/**
 * @param {{
 *   open: boolean
 *   onOpenChange: (open: boolean) => void
 *   mode?: 'enroll' | 'invite'
 *   programType?: string
 *   initialEmail?: string
 *   onSuccess?: () => void
 * }} props
 */
export function EnrollFocusOneDialog({
  open,
  onOpenChange,
  mode = 'enroll',
  programType = 'FOCUS_ONE',
  initialEmail = '',
  onSuccess,
}) {
  const queryClient = useQueryClient()
  const typeLabel = formatProgramType(programType)
  const [email, setEmail] = useState('')
  const [programKey, setProgramKey] = useState('')
  const [selectedSubjectUuids, setSelectedSubjectUuids] = useState(/** @type {string[]} */ ([]))
  const [instructorBySubject, setInstructorBySubject] = useState(/** @type {Record<string, string>} */ ({}))
  const [subjectQuery, setSubjectQuery] = useState('')

  const { data: programs = [], isLoading: programsLoading } = useQuery({
    queryKey: ['training', 'programs', 'enroll', programType],
    queryFn: () => fetchTrainingPrograms({ activeOnly: true, programType }),
    enabled: open,
  })

  const selectedProgram = useMemo(
    () => programs.find((program) => program.programKey === programKey) ?? programs[0] ?? null,
    [programs, programKey],
  )

  const enrollmentConfig = selectedProgram?.enrollmentConfig ?? {
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

  const studentOptions = useMemo(() => {
    return users
      .filter(
        (user) =>
          user.isActive &&
          user.email &&
          user.role?.name === 'Student',
      )
      .map((user) => ({
        email: user.email,
        name: [user.firstName, user.lastName].filter(Boolean).join(' '),
        timezone: user.timezone ?? null,
      }))
      .sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email))
  }, [users])

  const selectedStudent = useMemo(() => {
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) return null
    return studentOptions.find((student) => student.email.toLowerCase() === trimmed) ?? null
  }, [email, studentOptions])

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

  const filteredSubjects = useMemo(() => {
    const q = subjectQuery.trim().toLowerCase()
    if (!q) return subjects
    return subjects.filter((subject) => subject.name?.toLowerCase().includes(q))
  }, [subjects, subjectQuery])

  useEffect(() => {
    if (!open) return
    setEmail(initialEmail)
    setProgramKey(programs[0]?.programKey ?? '')
    setSelectedSubjectUuids([])
    setInstructorBySubject({})
    setSubjectQuery('')
  }, [open, initialEmail, programs])

  const enrollMutation = useMutation({
    mutationFn: () => {
      const instructorPayload = buildInstructorPayload()
      const payload = {
        email: email.trim().toLowerCase(),
        programKey,
        subjectUuids: selectedSubjectUuids,
        instructorBySubject: instructorPayload,
      }
      if (mode === 'invite') {
        return createFocusOneInvitation({
          email: payload.email,
          roleName: 'Student',
          trainingIntent: {
            programKey: payload.programKey,
            subjectUuids: payload.subjectUuids,
            instructorBySubject: instructorPayload,
          },
        })
      }
      if (programType === 'FOCUS_ONE') {
        return createFocusOneEnrollment(payload)
      }
      return createTrainingEnrollment(payload)
    },
    onSuccess: () => {
      notifySuccess(
        mode === 'invite'
          ? `Invitation sent with ${typeLabel} enrollment details.`
          : `Student enrolled in ${typeLabel}.`,
      )
      queryClient.invalidateQueries({ queryKey: ['training', 'enrollments'] })
      queryClient.invalidateQueries({ queryKey: ['focus-one', 'enrollments'] })
      onOpenChange(false)
      onSuccess?.()
    },
    onError: (error) => notifyError(handleApiError(error)),
  })

  const studentValid =
    mode === 'invite' || isKnownStudentEmail(email, studentOptions) || email.includes('@')
  const subjectsValid =
    !subjectSelection.enabled ||
    selectedSubjectUuids.length >= (subjectSelection.minSubjects ?? 1)

  const instructorsValid =
    !subjectSelection.instructorRequired ||
    selectedSubjectUuids.length === 0 ||
    allTeachersAssigned

  const canSubmit =
    studentValid &&
    Boolean(programKey) &&
    subjectsValid &&
    instructorsValid &&
    (!subjectSelection.instructorRequired || instructorOptions.length > 0) &&
    !enrollMutation.isPending &&
    !usersLoading &&
    !subjectsLoading &&
    !programsLoading

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

  if (!open) return null

  return (
    <Modal
      open={open}
      onClose={() => onOpenChange(false)}
      size="lg"
      closeDisabled={enrollMutation.isPending}
    >
      <ModalHeader
        title={mode === 'invite' ? `Invite to ${typeLabel}` : `Enroll in ${typeLabel}`}
        description={
          mode === 'invite'
            ? `Send a student invitation with ${typeLabel} track and subject assignments.`
            : `Assign an existing student to a ${typeLabel} program.`
        }
        onClose={() => onOpenChange(false)}
        closeDisabled={enrollMutation.isPending}
      />
      <ModalBody className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="focus-one-email">Student email</Label>
            <StudentSearchField
              id="focus-one-email"
              value={email}
              onChange={setEmail}
              users={studentOptions}
              disabled={enrollMutation.isPending || usersLoading}
              allowCustomEmail={mode === 'invite'}
              placeholder={
                mode === 'invite'
                  ? 'Search students or type a new email…'
                  : 'Search by name or email…'
              }
            />
            {selectedStudent?.timezone ? (
              <p className="text-xs text-muted-foreground">
                Student timezone: {formatTimezoneDisplay(selectedStudent.timezone)}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="focus-one-track">Training program</Label>
            <select
              id="focus-one-track"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={programKey}
              onChange={(event) => setProgramKey(event.target.value)}
              disabled={enrollMutation.isPending || programsLoading}
            >
              {programsLoading ? (
                <option value="">Loading programs…</option>
              ) : programs.length === 0 ? (
                <option value="">No active programs</option>
              ) : (
                programs.map((program) => (
                  <option key={program.programKey} value={program.programKey}>
                    {program.name}
                  </option>
                ))
              )}
            </select>
          </div>

          {subjectSelection.enabled ? (
          <div className="space-y-2">
            <Label htmlFor="focus-one-subject-search">Subjects</Label>
            <Input
              id="focus-one-subject-search"
              value={subjectQuery}
              onChange={(event) => setSubjectQuery(event.target.value)}
              placeholder="Search subjects…"
              disabled={enrollMutation.isPending || subjectsLoading}
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
                      disabled={enrollMutation.isPending}
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

          {subjectSelection.enabled && selectedSubjects.length > 0 && subjectSelection.instructorRequired ? (
            <div className="space-y-3">
              <div>
                <Label>Teachers</Label>
                <p className="text-xs text-muted-foreground">
                  Assign an instructor for each selected subject. Timezones are shown to help
                  schedule across regions.
                </p>
              </div>
              <div className="space-y-2 rounded-md border p-3">
                {selectedSubjects.map((subject) => (
                  <div key={subject.uuid} className="grid gap-2 sm:grid-cols-[1fr_1.2fr] sm:items-center">
                    <span className="text-sm font-medium">{subject.name}</span>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={instructorBySubject[subject.uuid] ?? ''}
                      onChange={(event) =>
                        setInstructorForSubject(subject.uuid, event.target.value)
                      }
                      disabled={enrollMutation.isPending}
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
                    No instructors found. Invite instructors from Users before enrolling.
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
          disabled={enrollMutation.isPending}
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={() => enrollMutation.mutate()}
          disabled={!canSubmit}
        >
          {enrollMutation.isPending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Saving…
            </>
          ) : mode === 'invite' ? (
            'Send invitation'
          ) : (
            'Enroll student'
          )}
        </Button>
      </ModalFooter>
    </Modal>
  )
}
