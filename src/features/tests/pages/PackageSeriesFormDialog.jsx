import { Loader2, X } from 'lucide-react'
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
  DIFFICULTY_OPTIONS,
  QUESTION_TYPE_OPTIONS,
} from '@/features/tests/constants'
import { slugifyFromName } from '@/lib/slug'
import { cn } from '@/lib/utils'
import { CoverImageField } from '@/features/tests/components/CoverImageField'

const selectClass =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'

const textareaClass =
  'min-h-[88px] w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'

function FormSection({ title, description, children, className }) {
  return (
    <section
      className={cn('rounded-xl border border-border/60 bg-muted/25 p-4 sm:p-5', className)}
    >
      <div className="mb-4 space-y-1">
        <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3>
        {description ? (
          <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  )
}

function CheckboxOption({ id, checked, onChange, disabled, label, hint }) {
  return (
    <label
      htmlFor={id}
      className={cn(
        'flex cursor-pointer gap-3 rounded-lg border px-3 py-2.5 transition-colors',
        checked ? 'border-primary/25 bg-background shadow-sm' : 'border-transparent hover:bg-background/70',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 size-4 shrink-0 rounded border-input accent-primary"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium leading-snug">{label}</span>
        {hint ? (
          <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{hint}</span>
        ) : null}
      </span>
    </label>
  )
}

export function PackageSeriesFormDialog({
  dialog,
  form,
  setForm,
  busy,
  variant = 'series',
  availableQuestionCount = null,
  poolLoading = false,
  questionCountTooHigh = false,
  onClose,
  onSubmit,
  subjects,
  boards,
  suites,
  booksForPackage,
  toggleSubject,
  toggleDifficulty,
  toggleQuestionType,
  toggleBook,
  toggleBoard,
  toggleSuite,
}) {
  const isQuiz = variant === 'quiz'
  const catalogSlugPreview = slugifyFromName(form.name)

  return (
    <div
      className="fixed inset-0 z-50 flex min-h-0 items-end justify-center bg-background/80 p-4 backdrop-blur-sm sm:items-center"
      role="presentation"
      onClick={() => !busy && onClose()}
    >
      <Card
        className="relative z-10 w-full max-w-3xl max-h-[90vh] overflow-y-auto overscroll-contain p-0 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pkg-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="sticky top-0 z-10 flex flex-row items-start justify-between gap-4 space-y-0 border-b bg-card/95 px-6 py-5 backdrop-blur-sm">
          <div className="space-y-1.5 pr-2">
            <CardTitle id="pkg-dialog-title" className="text-xl">
              {dialog.mode === 'create'
                ? isQuiz
                  ? 'New quiz'
                  : 'New test series'
                : isQuiz
                  ? 'Edit quiz'
                  : 'Edit test series'}
            </CardTitle>
            <CardDescription className="text-sm leading-relaxed">
              {isQuiz
                ? 'Timed quiz — students pick difficulty when the test starts. Set subject, scope, and time limit here.'
                : 'Configure catalog details and which questions are included in this series.'}
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0"
            disabled={busy}
            onClick={onClose}
            aria-label="Close"
          >
            <X className="size-4" aria-hidden />
          </Button>
        </CardHeader>

        <form onSubmit={onSubmit}>
          <CardContent className="px-6 py-5">
            <div className="space-y-5">
            <FormSection title="Basics" description="How this series appears in the student catalog.">
              <div className="space-y-2">
                <Label htmlFor="pkg-name">Name</Label>
                <Input
                  id="pkg-name"
                  value={form.name}
                  onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                  disabled={busy}
                  required
                  placeholder="e.g. Air Navigation Practice Series"
                />
                {dialog.mode === 'create' ? (
                  catalogSlugPreview ? (
                    <p className="text-xs text-muted-foreground">
                      Catalog link:{' '}
                      <span className="font-mono text-foreground">{catalogSlugPreview}</span>
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      A catalog link is created automatically from the name.
                    </p>
                  )
                ) : (
                  <div className="rounded-lg border border-dashed border-border bg-background/80 px-3 py-2">
                    <p className="text-xs text-muted-foreground">Catalog link (fixed after creation)</p>
                    <p className="font-mono text-sm">{form.slug}</p>
                  </div>
                )}
              </div>
              <div className="mt-4">
                <CoverImageField
                  value={form.coverImageUrl}
                  mediaUuid={form.coverMediaUuid}
                  purpose={isQuiz ? 'quiz_cover' : 'test_series_cover'}
                  entityUuid={dialog.mode === 'edit' ? dialog.uuid : null}
                  entityType={isQuiz ? 'quiz' : 'test-series'}
                  disabled={busy}
                  onChange={({ coverImageUrl, coverMediaUuid }) =>
                    setForm((s) => ({
                      ...s,
                      coverImageUrl,
                      coverMediaUuid,
                    }))
                  }
                />
              </div>
              <div className="mt-4 space-y-2">
                <Label htmlFor="pkg-desc">Description</Label>
                <textarea
                  id="pkg-desc"
                  className={textareaClass}
                  value={form.description}
                  onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
                  disabled={busy}
                  placeholder="Short summary for students…"
                />
              </div>
            </FormSection>

            <FormSection
              title={isQuiz ? 'Time limit' : 'Test length'}
              description={
                isQuiz
                  ? 'Required. Students pick difficulty at test start — a focused question set is sampled for the timer.'
                  : 'How many questions and how long students have per attempt.'
              }
            >
              <div
                className={cn(
                  'grid gap-4',
                  isQuiz ? 'max-w-md' : 'sm:grid-cols-2',
                )}
              >
                {!isQuiz ? (
                  <div className="space-y-2">
                    <Label htmlFor="pkg-question-count">Number of questions</Label>
                    <Input
                      id="pkg-question-count"
                      type="number"
                      min={1}
                      max={
                        availableQuestionCount != null && availableQuestionCount > 0
                          ? availableQuestionCount
                          : undefined
                      }
                      step={1}
                      placeholder="All matching questions"
                      value={form.questionCount}
                      onChange={(e) => setForm((s) => ({ ...s, questionCount: e.target.value }))}
                      disabled={busy}
                      aria-invalid={questionCountTooHigh}
                      className={questionCountTooHigh ? 'border-destructive' : undefined}
                    />
                    {form.subjectUuids.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Select at least one subject to see how many questions match your scope.
                      </p>
                    ) : poolLoading ? (
                      <p className="text-xs text-muted-foreground">Counting matching questions…</p>
                    ) : availableQuestionCount === 0 ? (
                      <p className="text-xs text-destructive">
                        No questions match the selected subjects, books, boards, licenses, and filters yet.
                      </p>
                    ) : availableQuestionCount != null ? (
                      <p className="text-xs text-muted-foreground">
                        {availableQuestionCount} question{availableQuestionCount === 1 ? '' : 's'}{' '}
                        match this scope.
                        {form.questionCount.trim()
                          ? ' Each attempt randomly samples from that pool when a limit is set.'
                          : ' Leave empty to use all of them.'}
                      </p>
                    ) : null}
                    {questionCountTooHigh ? (
                      <p className="text-xs text-destructive">
                        {availableQuestionCount === 0
                          ? 'Cannot set a question limit until at least one question matches this scope.'
                          : `Limit cannot exceed ${availableQuestionCount} — only that many questions match.`}
                      </p>
                    ) : null}
                  </div>
                ) : form.subjectUuids.length > 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {poolLoading
                      ? 'Counting questions in scope…'
                      : availableQuestionCount === 0
                        ? 'No questions match this scope yet — add questions or broaden filters.'
                        : `${availableQuestionCount} question${availableQuestionCount === 1 ? '' : 's'} in scope across all difficulty levels.`}
                  </p>
                ) : null}
                <div className="space-y-2">
                  <Label htmlFor="pkg-time-limit">
                    Time limit (minutes)
                    {isQuiz ? ' *' : ''}
                  </Label>
                  <Input
                    id="pkg-time-limit"
                    type="number"
                    min={1}
                    step={1}
                    placeholder={isQuiz ? 'Required' : 'No limit'}
                    value={form.timeLimitMinutes}
                    onChange={(e) => setForm((s) => ({ ...s, timeLimitMinutes: e.target.value }))}
                    disabled={busy}
                    required={isQuiz}
                  />
                  {isQuiz ? (
                    <p className="text-xs text-muted-foreground">
                      Required — students choose difficulty when the quiz starts.
                    </p>
                  ) : null}
                </div>
              </div>
            </FormSection>

            <FormSection
              title="Catalog & visibility"
              description="Control whether this series appears in the student catalog."
            >
              <CheckboxOption
                id="pkg-published"
                checked={form.isPublished}
                onChange={() => setForm((s) => ({ ...s, isPublished: !s.isPublished }))}
                disabled={busy}
                label="Published"
                hint="Visible in the public test series catalog for subscribed students."
              />
              <CheckboxOption
                id="pkg-demo"
                checked={form.isDemo}
                onChange={() => setForm((s) => ({ ...s, isDemo: !s.isDemo }))}
                disabled={busy}
                label="Free demo"
                hint="Any signed-in student can take this series without a subscription."
              />
            </FormSection>

            <FormSection
              title="Question bank scope"
              description="Pick subjects and optional filters. Empty filters include everything in that category."
            >
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-3 rounded-lg border border-border/50 bg-background/60 p-3">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Subjects
                  </Label>
                  <div className="max-h-44 space-y-1 overflow-y-auto pr-1">
                    {subjects.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Create a subject first.</p>
                    ) : (
                      subjects.map((s) => (
                        <CheckboxOption
                          key={s.uuid}
                          id={`pkg-sub-${s.uuid}`}
                          checked={form.subjectUuids.includes(s.uuid)}
                          onChange={() => toggleSubject(s.uuid)}
                          disabled={busy}
                          label={s.name}
                        />
                      ))
                    )}
                  </div>
                </div>

                {!isQuiz ? (
                  <div className="space-y-3 rounded-lg border border-border/50 bg-background/60 p-3">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Difficulty
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {DIFFICULTY_OPTIONS.map((o) => (
                        <label
                          key={o.value}
                          className={cn(
                            'inline-flex cursor-pointer items-center rounded-full border px-3 py-1.5 text-sm transition-colors',
                            form.difficultyFilter.includes(o.value)
                              ? 'border-primary bg-primary/10 font-medium text-primary'
                              : 'border-border bg-background hover:bg-muted/50',
                            busy && 'cursor-not-allowed opacity-50',
                          )}
                        >
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={form.difficultyFilter.includes(o.value)}
                            onChange={() => toggleDifficulty(o.value)}
                            disabled={busy}
                          />
                          {o.label}
                        </label>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="space-y-3 rounded-lg border border-border/50 bg-background/60 p-3 lg:col-span-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Question types
                  </Label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {QUESTION_TYPE_OPTIONS.map((o) => (
                      <CheckboxOption
                        key={o.value}
                        id={`pkg-qtype-${o.value}`}
                        checked={form.questionTypeFilter.includes(o.value)}
                        onChange={() => toggleQuestionType(o.value)}
                        disabled={busy}
                        label={o.label}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-3 rounded-lg border border-border/50 bg-background/60 p-3 lg:col-span-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Boards
                  </Label>
                  {boards.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No boards yet.</p>
                  ) : (
                    <div className="max-h-44 space-y-1 overflow-y-auto pr-1">
                      {boards.map((b) => (
                        <CheckboxOption
                          key={b.uuid}
                          id={`pkg-board-${b.uuid}`}
                          checked={form.boardUuids.includes(b.uuid)}
                          onChange={() => toggleBoard(b.uuid)}
                          disabled={busy}
                          label={b.code ? `${b.code} — ${b.name}` : b.name}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-3 rounded-lg border border-border/50 bg-background/60 p-3 lg:col-span-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Licenses
                  </Label>
                  {suites.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No licenses yet.</p>
                  ) : (
                    <div className="max-h-44 space-y-1 overflow-y-auto pr-1">
                      {suites.map((s) => (
                        <CheckboxOption
                          key={s.uuid}
                          id={`pkg-suite-${s.uuid}`}
                          checked={form.suiteUuids.includes(s.uuid)}
                          onChange={() => toggleSuite(s.uuid)}
                          disabled={busy}
                          label={`${s.name} (${s.slug})`}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-3 rounded-lg border border-border/50 bg-background/60 p-3 lg:col-span-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Books
                  </Label>
                  {form.subjectUuids.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Select at least one subject first.</p>
                  ) : booksForPackage.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No books for the selected subjects.</p>
                  ) : (
                    <div className="max-h-44 space-y-1 overflow-y-auto pr-1">
                      {booksForPackage.map((b) => (
                        <CheckboxOption
                          key={b.uuid}
                          id={`pkg-book-${b.uuid}`}
                          checked={form.bookUuids.includes(b.uuid)}
                          onChange={() => toggleBook(b.uuid)}
                          disabled={busy}
                          label={b.title}
                          hint={b.subject?.name ?? undefined}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </FormSection>

            </div>
          </CardContent>

          <div className="sticky bottom-0 z-10 flex justify-end gap-2 border-t bg-card/95 px-6 py-4 backdrop-blur-sm">
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || questionCountTooHigh} className="min-w-[5.5rem]">
              {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              Save
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
