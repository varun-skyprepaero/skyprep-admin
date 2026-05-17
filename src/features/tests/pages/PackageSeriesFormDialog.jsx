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
  CURRENCY_OPTIONS,
  DIFFICULTY_OPTIONS,
  QUESTION_TYPE_OPTIONS,
} from '@/features/tests/constants'
import { slugifyFromName } from '@/lib/slug'
import { cn } from '@/lib/utils'

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
  onClose,
  onSubmit,
  subjects,
  suites,
  booksForPackage,
  toggleSubject,
  toggleDifficulty,
  toggleQuestionType,
  toggleBook,
}) {
  const catalogSlugPreview = slugifyFromName(form.name)

  return (
    <div
      className="fixed inset-0 z-50 flex min-h-0 items-end justify-center bg-background/80 p-4 backdrop-blur-sm sm:items-center"
      role="presentation"
      onClick={() => !busy && onClose()}
    >
      <Card
        className="relative z-10 flex max-h-[min(92vh,100dvh-2rem)] w-full max-w-3xl min-h-0 flex-col overflow-hidden p-0 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pkg-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="flex shrink-0 flex-row items-start justify-between gap-4 space-y-0 border-b bg-muted/30 px-6 py-5">
          <div className="space-y-1.5 pr-2">
            <CardTitle id="pkg-dialog-title" className="text-xl">
              {dialog.mode === 'create' ? 'New test series' : 'Edit test series'}
            </CardTitle>
            <CardDescription className="text-sm leading-relaxed">
              Configure catalog details, pricing, and which questions are included in this series.
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

        <form className="flex min-h-0 flex-1 flex-col overflow-hidden" onSubmit={onSubmit}>
          <CardContent className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5">
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
              title="Pricing & time"
              description="Checkout amount and how long students have to finish once they start."
            >
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="pkg-price">Price</Label>
                  <Input
                    id="pkg-price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.priceAmount}
                    onChange={(e) => setForm((s) => ({ ...s, priceAmount: e.target.value }))}
                    disabled={busy}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pkg-curr">Currency</Label>
                  <select
                    id="pkg-curr"
                    className={selectClass}
                    value={form.currency}
                    onChange={(e) => setForm((s) => ({ ...s, currency: e.target.value }))}
                    disabled={busy}
                    required
                  >
                    {CURRENCY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pkg-time-limit">Time limit (min)</Label>
                  <Input
                    id="pkg-time-limit"
                    type="number"
                    min={1}
                    step={1}
                    placeholder="No limit"
                    value={form.timeLimitMinutes}
                    onChange={(e) => setForm((s) => ({ ...s, timeLimitMinutes: e.target.value }))}
                    disabled={busy}
                  />
                </div>
              </div>
              {dialog.mode === 'edit' ? (
                <div className="mt-4 space-y-2 rounded-lg border border-dashed border-border bg-background/80 p-3">
                  <Label htmlFor="pkg-sku-ro" className="text-xs text-muted-foreground">
                    Internal billing SKU
                  </Label>
                  <Input
                    id="pkg-sku-ro"
                    readOnly
                    value={form.billingSku}
                    className="font-mono text-xs"
                    disabled={busy}
                  />
                </div>
              ) : null}
            </FormSection>

            <FormSection
              title="Catalog & visibility"
              description="Control who sees this series and whether new purchases are allowed."
            >
              <div className="grid gap-2 sm:grid-cols-2">
                <CheckboxOption
                  id="pkg-published"
                  checked={form.isPublished}
                  onChange={() => setForm((s) => ({ ...s, isPublished: !s.isPublished }))}
                  disabled={busy}
                  label="Published"
                  hint="Visible in the public test series catalog."
                />
                <CheckboxOption
                  id="pkg-open-purchase"
                  checked={form.isOpenForPurchase}
                  onChange={() => setForm((s) => ({ ...s, isOpenForPurchase: !s.isOpenForPurchase }))}
                  disabled={busy}
                  label="Open for new purchases"
                  hint="Existing buyers keep access when unchecked."
                />
              </div>
              <div className="mt-4 space-y-2">
                <Label htmlFor="pkg-suite">Suite (optional)</Label>
                <select
                  id="pkg-suite"
                  className={selectClass}
                  value={form.suiteUuid}
                  onChange={(e) => setForm((s) => ({ ...s, suiteUuid: e.target.value }))}
                  disabled={busy}
                >
                  <option value="">None</option>
                  {suites.map((s) => (
                    <option key={s.uuid} value={s.uuid}>
                      {s.name} ({s.slug})
                    </option>
                  ))}
                </select>
              </div>
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

          <div className="flex shrink-0 justify-end gap-2 border-t bg-card px-6 py-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy} className="min-w-[5.5rem]">
              {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              Save
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
