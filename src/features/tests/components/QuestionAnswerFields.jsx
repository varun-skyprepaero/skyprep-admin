import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  choiceLabelAt,
  usesChoiceOptionsList,
  withSequentialChoiceLabels,
} from '@/features/tests/lib/question-form-options'

/**
 * @param {{
 *   type: string,
 *   options: Array<{ label: string, text: string, isCorrect: boolean }>,
 *   onChange: (options: Array<{ label: string, text: string, isCorrect: boolean }>) => void,
 *   disabled?: boolean,
 * }} props
 */
export function QuestionAnswerFields({ type, options, onChange, disabled = false }) {
  if (type === 'ESSAY') {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Essay question</p>
        <p className="mt-1">
          No answer options are stored. Scoring is manual (set score to 0 until graded). The test
          engine will show a text response field when essay support is enabled for students.
        </p>
      </div>
    )
  }

  if (type === 'SHORT_ANSWER') {
    return (
      <div className="space-y-2 rounded-lg border border-border/80 p-3">
        <Label htmlFor="q-short-answer">Accepted answer</Label>
        <Input
          id="q-short-answer"
          placeholder="e.g. New Delhi"
          value={options[0]?.text ?? ''}
          onChange={(e) =>
            onChange([{ label: 'A', text: e.target.value, isCorrect: true }])
          }
          disabled={disabled}
          required
        />
        <p className="text-xs text-muted-foreground">
          Student answers are compared to this text (case-sensitive for now).
        </p>
      </div>
    )
  }

  if (type === 'TRUE_FALSE') {
    const correctIsTrue = options[0]?.isCorrect ?? true
    return (
      <div className="space-y-2 rounded-lg border border-border/80 p-3">
        <Label>Correct answer</Label>
        <div className="flex flex-wrap gap-4">
          <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-4 py-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
            <input
              type="radio"
              name="tf-correct"
              className="size-4 accent-primary"
              checked={correctIsTrue}
              disabled={disabled}
              onChange={() =>
                onChange([
                  { label: 'T', text: 'True', isCorrect: true },
                  { label: 'F', text: 'False', isCorrect: false },
                ])
              }
            />
            <span className="text-sm font-medium">True</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-4 py-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
            <input
              type="radio"
              name="tf-correct"
              className="size-4 accent-primary"
              checked={!correctIsTrue}
              disabled={disabled}
              onChange={() =>
                onChange([
                  { label: 'T', text: 'True', isCorrect: false },
                  { label: 'F', text: 'False', isCorrect: true },
                ])
              }
            />
            <span className="text-sm font-medium">False</span>
          </label>
        </div>
      </div>
    )
  }

  if (!usesChoiceOptionsList(type)) return null

  const singleCorrect = type === 'SINGLE_CHOICE'

  function updateOption(index, patch) {
    onChange(options.map((o, i) => (i === index ? { ...o, ...patch } : o)))
  }

  function setCorrect(index) {
    if (singleCorrect) {
      onChange(options.map((o, i) => ({ ...o, isCorrect: i === index })))
    } else {
      updateOption(index, { isCorrect: !options[index].isCorrect })
    }
  }

  function addOption() {
    onChange(
      withSequentialChoiceLabels([
        ...options,
        {
          label: choiceLabelAt(options.length),
          text: '',
          isCorrect: false,
        },
      ]),
    )
  }

  function removeOption(index) {
    onChange(withSequentialChoiceLabels(options.filter((_, i) => i !== index)))
  }

  return (
    <div className="space-y-2 rounded-lg border border-border/80 p-3">
      <div className="flex items-center justify-between gap-2">
        <Label>Answer options</Label>
        <Button type="button" variant="outline" size="sm" onClick={addOption} disabled={disabled}>
          Add option
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {singleCorrect
          ? 'Mark exactly one option as correct. Labels are assigned automatically (A, B, C…).'
          : 'Mark all options that are correct (select all that apply). Labels are assigned automatically (A, B, C…).'}
      </p>
      <div className="space-y-2">
        {options.map((opt, idx) => {
          const label = choiceLabelAt(idx)
          return (
            <div
              key={idx}
              className="flex flex-wrap items-start gap-2 border-t border-border/60 pt-2 first:border-0 first:pt-0"
            >
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-input bg-muted/40 text-sm font-medium"
                aria-label={`Option ${label}`}
              >
                {label}
              </span>
              <Input
                className="min-w-[12rem] flex-1"
                placeholder="Answer text"
                value={opt.text}
                onChange={(e) => updateOption(idx, { text: e.target.value })}
                disabled={disabled}
              />
              <label className="flex items-center gap-1.5 text-xs whitespace-nowrap">
                <input
                  type={singleCorrect ? 'radio' : 'checkbox'}
                  name={singleCorrect ? 'single-correct' : undefined}
                  className="size-4 accent-primary"
                  checked={opt.isCorrect}
                  onChange={() => setCorrect(idx)}
                  disabled={disabled}
                />
                Correct
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() => removeOption(idx)}
                disabled={disabled || options.length <= 2}
              >
                Remove
              </Button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
