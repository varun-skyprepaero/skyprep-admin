import { Check } from 'lucide-react'
import { ReviewStatusBadge } from '@/features/review/components/review-status-badge'

/**
 * Read-only rendering of a question's entered data (stem, options, links, review state).
 * Shared by the Questions page view modal and the Review queue preview.
 * @param {{ question: any }} props
 */
export function QuestionViewContent({ question }) {
  if (!question) return null
  const q = question
  const books = q.books ?? (q.book ? [q.book] : [])
  const options = q.options ?? []
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <ReviewStatusBadge status={q.reviewStatus} />
        <span className="text-xs text-muted-foreground">
          {q.type} · {q.difficulty} · {q.score} pts
        </span>
      </div>
      {q.reviewNote && q.reviewStatus === 'FLAGGED' ? (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
          <span className="font-medium">Reviewer note: </span>
          {q.reviewNote}
        </div>
      ) : null}

      <div>
        <p className="text-xs font-medium uppercase text-muted-foreground">Question</p>
        <p className="mt-1 whitespace-pre-wrap text-sm">{q.stem}</p>
      </div>

      <div>
        <p className="text-xs font-medium uppercase text-muted-foreground">Answer options</p>
        <div className="mt-1 space-y-1">
          {options.length > 0 ? (
            options.map((o, i) => (
              <div
                key={i}
                className={
                  'flex items-start gap-2 rounded-md border px-3 py-2 text-sm ' +
                  (o.isCorrect
                    ? 'border-emerald-500/50 bg-emerald-500/10'
                    : 'border-border')
                }
              >
                <span className="font-medium">{o.label || String.fromCharCode(65 + i)}.</span>
                <span className="flex-1">{o.text}</span>
                {o.isCorrect ? (
                  <Check className="size-4 shrink-0 text-emerald-600" aria-hidden />
                ) : null}
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No options.</p>
          )}
        </div>
      </div>

      {q.explanation ? (
        <div>
          <p className="text-xs font-medium uppercase text-muted-foreground">Explanation</p>
          <p className="mt-1 whitespace-pre-wrap text-sm">{q.explanation}</p>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium uppercase text-muted-foreground">Subject</p>
          <p className="mt-1 text-sm">{q.subject?.name ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase text-muted-foreground">Books</p>
          <p className="mt-1 text-sm">{books.map((b) => b.title).join(', ') || '—'}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase text-muted-foreground">Lessons</p>
          <p className="mt-1 text-sm">
            {(q.lessons ?? []).map((l) => l.name).join(', ') || '—'}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase text-muted-foreground">Boards</p>
          <p className="mt-1 text-sm">
            {(q.boards ?? []).map((b) => b.code || b.name).join(', ') || '—'}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase text-muted-foreground">Licenses</p>
          <p className="mt-1 text-sm">{(q.suites ?? []).map((s) => s.name).join(', ') || '—'}</p>
        </div>
      </div>
    </div>
  )
}
