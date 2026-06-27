import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

/**
 * @param {{
 *   label: string,
 *   emptyLabel?: string,
 *   options: Array<{ uuid: string, label: string }>,
 *   selected: string[],
 *   disabled?: boolean,
 *   onChange: (selected: string[]) => void,
 * }} props
 */
export function QuestionLinkMultiSelect({
  label,
  emptyLabel = 'None available',
  options,
  selected,
  disabled = false,
  onChange,
}) {
  function toggle(uuid) {
    if (disabled) return
    if (selected.includes(uuid)) {
      onChange(selected.filter((id) => id !== uuid))
    } else {
      onChange([...selected, uuid])
    }
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div
        className={cn(
          'max-h-40 overflow-y-auto rounded-md border border-input bg-background p-3',
          disabled && 'opacity-60',
        )}
      >
        {options.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        ) : (
          <ul className="space-y-2">
            {options.map((option) => (
              <li key={option.uuid}>
                <label className="flex cursor-pointer items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={selected.includes(option.uuid)}
                    disabled={disabled}
                    onChange={() => toggle(option.uuid)}
                  />
                  <span>{option.label}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
