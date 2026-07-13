import { useMemo, useState } from 'react'
import {
  ChevronRight,
  Clock,
  GraduationCap,
  Layers,
  Plus,
  Target,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  createInitialDemoExams,
  DEMO_BOARDS,
  DEMO_SUBJECTS,
  findBoard,
  findSuite,
  findSubject,
  formatExamName,
  suitesForBoard,
} from '@/features/tests/demo/exams-demo-data'
import {
  examTotals,
  sectionPassMarks,
  sectionSummary,
  sectionTotalMarks,
} from '@/features/tests/demo/exam-demo-utils'
import { cn } from '@/lib/utils'

function newId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}

function DemoBanner() {
  return (
    <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
      <span className="font-semibold">UI demo only</span> — exam blueprints are stored in browser
      memory. Nothing is saved to the test bank or classroom backend yet.
    </div>
  )
}

function StatPill({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-3 py-2">
      <Icon className="size-4 shrink-0 text-primary" aria-hidden />
      <div>
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="text-sm font-semibold tabular-nums text-foreground">{value}</p>
      </div>
    </div>
  )
}

/**
 * @param {{
 *   exam: import('@/features/tests/demo/exams-demo-data').DemoExam,
 *   selected: boolean,
 *   onSelect: () => void,
 * }} props
 */
function ExamListItem({ exam, selected, onSelect }) {
  const board = findBoard(exam.boardId)
  const suite = findSuite(exam.suiteId)
  const totals = examTotals(exam.sections)

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full rounded-lg border px-3 py-3 text-left transition-colors',
        selected
          ? 'border-primary bg-primary/5 shadow-sm'
          : 'border-border/60 bg-card hover:border-primary/40 hover:bg-muted/30',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-foreground">{exam.name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {board?.code} · {suite?.name}
          </p>
        </div>
        <ChevronRight
          className={cn('size-4 shrink-0 text-muted-foreground', selected && 'text-primary')}
          aria-hidden
        />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {exam.sections.length} section{exam.sections.length === 1 ? '' : 's'} ·{' '}
        {totals.questionCount} Q · {totals.totalMarks} marks · {totals.timeLimitMinutes} min
      </p>
    </button>
  )
}

/**
 * @param {{
 *   section: import('@/features/tests/demo/exams-demo-data').DemoExamSection,
 *   index: number,
 *   onChange: (patch: Partial<import('@/features/tests/demo/exams-demo-data').DemoExamSection>) => void,
 *   onRemove: () => void,
 *   canRemove: boolean,
 * }} props
 */
function SectionEditor({ section, index, onChange, onRemove, canRemove }) {
  const summary = sectionSummary(section)
  const totalMarks = sectionTotalMarks(section)
  const passMarks = sectionPassMarks(section)

  return (
    <Card className="border-border/70 shadow-none">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
        <div>
          <CardTitle className="text-base">
            Section {index + 1}: {summary.subjectName}
          </CardTitle>
          <CardDescription>
            Subject-wise time limit, marks from question pool, and passing threshold.
          </CardDescription>
        </div>
        {canRemove ? (
          <Button type="button" variant="ghost" size="icon" onClick={onRemove}>
            <Trash2 className="size-4 text-destructive" aria-hidden />
            <span className="sr-only">Remove section</span>
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2 sm:col-span-2 lg:col-span-1">
            <Label htmlFor={`subject-${section.id}`}>Subject</Label>
            <select
              id={`subject-${section.id}`}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              value={section.subjectId}
              onChange={(e) => onChange({ subjectId: e.target.value })}
            >
              {DEMO_SUBJECTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`qcount-${section.id}`}>Questions in section</Label>
            <Input
              id={`qcount-${section.id}`}
              type="number"
              min={1}
              value={section.questionCount}
              onChange={(e) =>
                onChange({ questionCount: Math.max(1, Number(e.target.value) || 1) })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`marks-${section.id}`}>Marks per question</Label>
            <Input
              id={`marks-${section.id}`}
              type="number"
              min={1}
              value={section.marksPerQuestion}
              onChange={(e) =>
                onChange({ marksPerQuestion: Math.max(1, Number(e.target.value) || 1) })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`time-${section.id}`}>Time limit (minutes)</Label>
            <Input
              id={`time-${section.id}`}
              type="number"
              min={1}
              value={section.timeLimitMinutes}
              onChange={(e) =>
                onChange({ timeLimitMinutes: Math.max(1, Number(e.target.value) || 1) })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`pass-${section.id}`}>Passing (% of section marks)</Label>
            <Input
              id={`pass-${section.id}`}
              type="number"
              min={1}
              max={100}
              value={section.passMinPercent}
              onChange={(e) =>
                onChange({
                  passMinPercent: Math.min(100, Math.max(1, Number(e.target.value) || 1)),
                })
              }
            />
          </div>
        </div>

        <div className="grid gap-2 rounded-md border border-dashed border-border/80 bg-muted/20 p-3 text-sm sm:grid-cols-3">
          <p>
            <span className="text-muted-foreground">Section marks: </span>
            <span className="font-medium tabular-nums">
              {section.questionCount} × {section.marksPerQuestion} = {totalMarks}
            </span>
          </p>
          <p>
            <span className="text-muted-foreground">Pass marks: </span>
            <span className="font-medium tabular-nums">
              {passMarks} / {totalMarks} ({section.passMinPercent}%)
            </span>
          </p>
          <p>
            <span className="text-muted-foreground">Time: </span>
            <span className="font-medium tabular-nums">{section.timeLimitMinutes} min</span>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * @param {{ exam: import('@/features/tests/demo/exams-demo-data').DemoExam }} props
 */
function ExamBlueprint({ exam }) {
  const board = findBoard(exam.boardId)
  const suite = findSuite(exam.suiteId)

  return (
    <div className="rounded-lg border border-border/70 bg-muted/15 p-4 font-mono text-xs leading-relaxed text-foreground sm:text-sm">
      <p className="font-semibold">
        {board?.code} — {suite?.name}
      </p>
      {exam.sections.map((section, index) => {
        const { subjectName, totalMarks, passMarks } = sectionSummary(section)
        const isLast = index === exam.sections.length - 1
        const branch = isLast ? '└──' : '├──'
        return (
          <p key={section.id} className="mt-1 text-muted-foreground">
            <span className="text-foreground">{branch}</span> {subjectName}
            <span className="text-foreground/80">
              {' '}
              · {section.questionCount} Q × {section.marksPerQuestion} = {totalMarks} marks ·{' '}
              {section.timeLimitMinutes} min · pass {passMarks}/{totalMarks} (
              {section.passMinPercent}%)
            </span>
          </p>
        )
      })}
    </div>
  )
}

export default function ExamsDemoPage() {
  const [exams, setExams] = useState(createInitialDemoExams)
  const [selectedId, setSelectedId] = useState('exam-dgca-cpl')
  const [createOpen, setCreateOpen] = useState(false)
  const [draftBoardId, setDraftBoardId] = useState(DEMO_BOARDS[0].id)
  const draftSuites = useMemo(() => suitesForBoard(draftBoardId), [draftBoardId])
  const [draftSuiteId, setDraftSuiteId] = useState('suite-dgca-cpl')

  const selectedExam = useMemo(
    () => exams.find((e) => e.id === selectedId) ?? exams[0] ?? null,
    [exams, selectedId],
  )

  const draftName = useMemo(() => {
    const board = findBoard(draftBoardId)
    const suite = findSuite(draftSuiteId)
    if (!board || !suite) return ''
    return formatExamName(board.code, suite.name)
  }, [draftBoardId, draftSuiteId])

  const totals = selectedExam ? examTotals(selectedExam.sections) : null

  function updateExam(examId, updater) {
    setExams((prev) => prev.map((e) => (e.id === examId ? updater(e) : e)))
  }

  function createExam() {
    const board = findBoard(draftBoardId)
    const suite = findSuite(draftSuiteId)
    if (!board || !suite || suite.boardId !== draftBoardId) return

    const id = newId('exam')
    const exam = {
      id,
      boardId: draftBoardId,
      suiteId: draftSuiteId,
      name: formatExamName(board.code, suite.name),
      sections: [
        {
          id: newId('sec'),
          subjectId: DEMO_SUBJECTS[0].id,
          questionCount: 20,
          marksPerQuestion: 2,
          timeLimitMinutes: 30,
          passMinPercent: 50,
        },
      ],
    }
    setExams((prev) => [exam, ...prev])
    setSelectedId(id)
    setCreateOpen(false)
  }

  function addSection(examId) {
    updateExam(examId, (exam) => ({
      ...exam,
      sections: [
        ...exam.sections,
        {
          id: newId('sec'),
          subjectId: DEMO_SUBJECTS[Math.min(exam.sections.length, DEMO_SUBJECTS.length - 1)].id,
          questionCount: 20,
          marksPerQuestion: 2,
          timeLimitMinutes: 30,
          passMinPercent: 50,
        },
      ],
    }))
  }

  function updateSection(examId, sectionId, patch) {
    updateExam(examId, (exam) => ({
      ...exam,
      sections: exam.sections.map((s) => (s.id === sectionId ? { ...s, ...patch } : s)),
    }))
  }

  function removeSection(examId, sectionId) {
    updateExam(examId, (exam) => ({
      ...exam,
      sections: exam.sections.filter((s) => s.id !== sectionId),
    }))
  }

  return (
    <div className="space-y-5">
      <DemoBanner />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Exams</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Compose board + license exams (e.g. DGCA — CPL) with subject sections, each with its own
            timer, marks from the question pool, and passing criteria.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={() => {
            const boardId = DEMO_BOARDS[0].id
            setDraftBoardId(boardId)
            setDraftSuiteId(suitesForBoard(boardId)[0]?.id ?? '')
            setCreateOpen(true)
          }}
        >
          <Plus className="size-4" aria-hidden />
          New exam
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(240px,300px)_1fr]">
        <Card className="h-fit shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Exam catalog</CardTitle>
            <CardDescription>Board × license combinations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {exams.map((exam) => (
              <ExamListItem
                key={exam.id}
                exam={exam}
                selected={exam.id === selectedExam?.id}
                onSelect={() => setSelectedId(exam.id)}
              />
            ))}
          </CardContent>
        </Card>

        {selectedExam && totals ? (
          <div className="space-y-5">
            <Card className="shadow-none">
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-xl">{selectedExam.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {findBoard(selectedExam.boardId)?.name} ·{' '}
                      {findSuite(selectedExam.suiteId)?.name} license track
                    </CardDescription>
                  </div>
                  <div className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/40 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    <Layers className="size-3.5" aria-hidden />
                    {selectedExam.sections.length} sections
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2 sm:grid-cols-3">
                  <StatPill
                    icon={GraduationCap}
                    label="Total questions"
                    value={String(totals.questionCount)}
                  />
                  <StatPill icon={Target} label="Total marks" value={String(totals.totalMarks)} />
                  <StatPill
                    icon={Clock}
                    label="Total time"
                    value={`${totals.timeLimitMinutes} min`}
                  />
                </div>

                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Blueprint preview
                  </p>
                  <ExamBlueprint exam={selectedExam} />
                </div>

                <p className="text-xs text-muted-foreground">
                  Each section is attempted separately with its own clock. A student must meet the
                  pass marks in every section — failing one section fails the exam, even if the
                  overall total is high.
                </p>
              </CardContent>
            </Card>

            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold">Subject sections</h3>
              <Button type="button" variant="outline" size="sm" onClick={() => addSection(selectedExam.id)}>
                <Plus className="size-4" aria-hidden />
                Add section
              </Button>
            </div>

            <div className="space-y-4">
              {selectedExam.sections.map((section, index) => (
                <SectionEditor
                  key={section.id}
                  section={section}
                  index={index}
                  canRemove={selectedExam.sections.length > 1}
                  onChange={(patch) => updateSection(selectedExam.id, section.id, patch)}
                  onRemove={() => removeSection(selectedExam.id, section.id)}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {createOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 p-4 backdrop-blur-sm sm:items-center"
          role="presentation"
          onClick={() => setCreateOpen(false)}
        >
          <Card
            className="relative z-10 max-h-[min(92vh,100dvh-2rem)] w-full max-w-md overflow-y-auto overscroll-contain shadow-lg"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-exam-title"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <CardTitle id="create-exam-title">New exam</CardTitle>
              <CardDescription>Pick a regulatory board and license.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="exam-board">Board</Label>
                <select
                  id="exam-board"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  value={draftBoardId}
                  onChange={(e) => {
                    const boardId = e.target.value
                    setDraftBoardId(boardId)
                    setDraftSuiteId(suitesForBoard(boardId)[0]?.id ?? '')
                  }}
                >
                  {DEMO_BOARDS.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code} — {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="exam-suite">License</Label>
                <select
                  id="exam-suite"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  value={draftSuiteId}
                  onChange={(e) => setDraftSuiteId(e.target.value)}
                >
                  {draftSuites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="rounded-md border border-dashed border-border/80 bg-muted/20 px-3 py-2 text-sm">
                <span className="text-muted-foreground">Exam name: </span>
                <span className="font-semibold">{draftName}</span>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" onClick={createExam} disabled={!draftSuiteId}>
                  Create exam
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  )
}
