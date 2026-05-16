import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  filterTimezoneOptions,
  formatTimezoneLabel,
  getBrowserTimezone,
} from '@/lib/datetime/timezone-utils'
import { cn } from '@/lib/utils'
import { LocateFixed } from 'lucide-react'

/**
 * @param {{
 *   id?: string,
 *   value: string,
 *   onChange: (value: string) => void,
 *   error?: string,
 *   hint?: string,
 *   className?: string,
 *   disabled?: boolean,
 * }} props
 */
export function TimezoneField({
  id = 'timezone',
  value,
  onChange,
  error,
  hint = 'Pre-filled from your device. Search or pick from the list.',
  className,
  disabled = false,
}) {
  const [query, setQuery] = useState(value)
  const [open, setOpen] = useState(false)

  const displayValue = open ? query : value
  const suggestions = useMemo(() => filterTimezoneOptions(displayValue, 12), [displayValue])

  function selectTimezone(tz) {
    onChange(tz)
    setQuery(tz)
    setOpen(false)
  }

  function useDeviceTimezone() {
    const deviceTz = getBrowserTimezone()
    onChange(deviceTz)
    setQuery(deviceTz)
    setOpen(false)
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="space-y-1">
        <Label htmlFor={id} className="text-sm font-medium">
          Timezone
        </Label>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>

      <div className="space-y-2">
        <div className="relative">
          <Input
            id={id}
            value={displayValue}
            onChange={(e) => {
              setQuery(e.target.value)
              onChange(e.target.value)
              setOpen(true)
            }}
            onFocus={() => {
              setQuery(value)
              setOpen(true)
            }}
            onBlur={() => {
              window.setTimeout(() => setOpen(false), 150)
            }}
            placeholder="Search or select a timezone"
            autoComplete="off"
            role="combobox"
            aria-expanded={open}
            aria-invalid={Boolean(error)}
            aria-autocomplete="list"
            disabled={disabled}
          />

          {open && suggestions.length > 0 && !disabled ? (
            <ul
              className={cn(
                'absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border border-border',
                'bg-popover py-1 text-sm shadow-md',
              )}
              role="listbox"
            >
              {suggestions.map((opt) => (
                <li key={opt.value} role="option">
                  <button
                    type="button"
                    className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-muted"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectTimezone(opt.value)}
                  >
                    <span className="font-medium">{opt.label}</span>
                    <span className="text-xs text-muted-foreground">{opt.value}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={useDeviceTimezone}
            disabled={disabled}
          >
            <LocateFixed className="size-3.5" aria-hidden />
            Use device timezone
          </Button>
          {value && isValidDisplay(value) ? (
            <span className="text-xs text-muted-foreground">{formatTimezoneLabel(value)}</span>
          ) : null}
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}

/**
 * @param {string} value
 */
function isValidDisplay(value) {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: value.trim() })
    return Boolean(value.trim())
  } catch {
    return false
  }
}
