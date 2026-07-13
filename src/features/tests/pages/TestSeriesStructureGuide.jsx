import { BookOpen, HelpCircle, Layers, Library, ListChecks } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/ui/modal'
import { cn } from '@/lib/utils'

function GuideSection({ title, children, className }) {
  return (
    <section className={cn('space-y-2', className)}>
      <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3>
      <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  )
}

function FlowStep({ icon: Icon, label, detail }) {
  return (
    <li className="flex gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{detail}</p>
      </div>
    </li>
  )
}

/**
 * @param {{ open: boolean, onClose: () => void }} props
 */
export function TestSeriesStructureGuide({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose} size="lg" aria-labelledby="test-series-guide-title">
      <ModalHeader
        title={
          <span className="flex items-center gap-2">
            <HelpCircle className="size-5 text-primary" aria-hidden />
            How test content fits together
          </span>
        }
        description="A test series is an exam paper you assemble from the question bank. Here is what each piece does and what combinations are possible."
        titleId="test-series-guide-title"
        onClose={onClose}
        className="bg-muted/30"
      />

      <ModalBody>
        <div className="space-y-6">
          <GuideSection title="The big picture">
            <p>
              Think of a <strong className="font-medium text-foreground">subject</strong> as a
              shelf in your library. <strong className="font-medium text-foreground">Questions</strong>{' '}
              are the pages on that shelf. A{' '}
              <strong className="font-medium text-foreground">test series</strong> is the mock exam
              you build by choosing which shelves (and optional filters) to pull from.
            </p>
            <ul className="grid gap-2 sm:grid-cols-2">
              <FlowStep
                icon={Library}
                label="Question bank"
                detail="Subjects, books, lessons, and individual questions — created under Tests."
              />
              <FlowStep
                icon={ListChecks}
                label="Test series"
                detail="The student-facing mock test: scope, length, time limit, demo flag."
              />
              <FlowStep
                icon={Layers}
                label="Subscription / demo"
                detail="Who can take a series: all subscribers, or free demo for everyone."
              />
            </ul>
          </GuideSection>

          <GuideSection title="What each thing means">
            <dl className="divide-y divide-border/60 rounded-lg border border-border/60 text-sm">
              <div className="grid gap-1 px-3 py-2.5 sm:grid-cols-[7rem_1fr]">
                <dt className="font-medium text-foreground">Subject</dt>
                <dd>Required topic area (e.g. Meteorology). Every question belongs to one subject.</dd>
              </div>
              <div className="grid gap-1 px-3 py-2.5 sm:grid-cols-[7rem_1fr]">
                <dt className="font-medium text-foreground">Question</dt>
                <dd>The actual exam item. Always tied to one subject; may also be tagged with books, boards, licenses, or lessons.</dd>
              </div>
              <div className="grid gap-1 px-3 py-2.5 sm:grid-cols-[7rem_1fr]">
                <dt className="font-medium text-foreground">Book</dt>
                <dd>Optional textbook tag on a question. Can narrow a test series when you select specific books.</dd>
              </div>
              <div className="grid gap-1 px-3 py-2.5 sm:grid-cols-[7rem_1fr]">
                <dt className="font-medium text-foreground">Lesson</dt>
                <dd>Chapter or topic inside a subject — helps organize questions in admin. Does not filter a test series today.</dd>
              </div>
              <div className="grid gap-1 px-3 py-2.5 sm:grid-cols-[7rem_1fr]">
                <dt className="font-medium text-foreground">Board</dt>
                <dd>Optional authority tag on a question (DGCA, FAA, …). Narrows a test series when selected.</dd>
              </div>
              <div className="grid gap-1 px-3 py-2.5 sm:grid-cols-[7rem_1fr]">
                <dt className="font-medium text-foreground">License</dt>
                <dd>Optional program tag on a question (PPL, CPL, …). Narrows a test series when selected.</dd>
              </div>
              <div className="grid gap-1 px-3 py-2.5 sm:grid-cols-[7rem_1fr]">
                <dt className="font-medium text-foreground">Test series</dt>
                <dd>The recipe: which subjects, optional boards, licenses, books, difficulty, question types, count, and time limit.</dd>
              </div>
            </dl>
          </GuideSection>

          <GuideSection title="How a test series picks questions">
            <ol className="list-decimal space-y-1.5 pl-5">
              <li>
                <strong className="font-medium text-foreground">Subjects</strong> — pick at least
                one (required).
              </li>
              <li>
                <strong className="font-medium text-foreground">Books</strong> — optional. If none
                selected, every question in those subjects counts. If you pick books, only
                questions linked to those books are used.
              </li>
              <li>
                <strong className="font-medium text-foreground">Boards & licenses</strong> —
                optional. If selected, only questions tagged with those boards and/or licenses are
                used.
              </li>
              <li>
                <strong className="font-medium text-foreground">Difficulty & type</strong> —
                optional. Leave empty to include all levels and types.
              </li>
              <li>
                <strong className="font-medium text-foreground">Number of questions</strong> —
                optional. Leave empty to use every matching question. If you set a limit, each
                attempt randomly samples that many unique questions from the pool.
              </li>
            </ol>
            <p className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-foreground">
              All filters work together: a question must match every rule you set (subject,
              boards, licenses, books if any, and difficulty and type if any).
            </p>
          </GuideSection>

          <GuideSection title="Common setups">
            <ul className="space-y-2">
              <li className="flex gap-2">
                <BookOpen className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                <span>
                  <strong className="font-medium text-foreground">Full subject mock</strong> — one
                  or more subjects, no books, no filters → entire subject bank.
                </span>
              </li>
              <li className="flex gap-2">
                <BookOpen className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                <span>
                  <strong className="font-medium text-foreground">One textbook</strong> — subject +
                  specific books → only questions tagged with those books.
                </span>
              </li>
              <li className="flex gap-2">
                <BookOpen className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                <span>
                  <strong className="font-medium text-foreground">Free demo</strong> — short
                  series, easy difficulty, low question count, <em>Free demo</em> turned on.
                </span>
              </li>
              <li className="flex gap-2">
                <BookOpen className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                <span>
                  <strong className="font-medium text-foreground">PPL mock</strong> — subject +
                  CPL license filter → only questions tagged for that license.
                </span>
              </li>
            </ul>
          </GuideSection>

          <GuideSection title="Good to know">
            <ul className="list-disc space-y-1 pl-5">
              <li>Lessons organize questions in admin but do not scope a test series yet.</li>
              <li>
                The matching-question count under <em>Number of questions</em> updates as you
                change subjects, books, and filters.
              </li>
              <li>
                Published series appear in the student catalog. Subscription unlocks paid series;
                demos are free for any signed-in student.
              </li>
            </ul>
          </GuideSection>
        </div>
      </ModalBody>

      <ModalFooter>
        <Button type="button" onClick={onClose}>
          Got it
        </Button>
      </ModalFooter>
    </Modal>
  )
}
