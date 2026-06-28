import { cn } from '@/lib/utils'
import { getPasswordChecks } from '@/features/auth/lib/password-policy'
import { Check, X } from 'lucide-react'

/**
 * @param {{ password: string }} props
 */
export function PasswordRequirements({ password }) {
  const checks = getPasswordChecks(password)

  const passed = checks.filter((c) => c.ok).length
  const strengthPct = password.length === 0 ? 0 : (passed / checks.length) * 100
  const strengthLabel =
    password.length === 0 ? null : passed <= 1 ? 'Weak' : passed === 2 ? 'Fair' : 'Strong'

  return (
    <div className="space-y-3 rounded-lg border border-border/60 bg-muted/30 p-3.5">
      {password.length > 0 ? (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Password strength</span>
            <span
              className={cn(
                'font-medium',
                strengthLabel === 'Strong' && 'text-emerald-600',
                strengthLabel === 'Fair' && 'text-amber-600',
                strengthLabel === 'Weak' && 'text-destructive',
              )}
            >
              {strengthLabel}
            </span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-border">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-300',
                strengthLabel === 'Strong' && 'bg-emerald-500',
                strengthLabel === 'Fair' && 'bg-amber-500',
                strengthLabel === 'Weak' && 'bg-destructive',
              )}
              style={{ width: `${strengthPct}%` }}
            />
          </div>
        </div>
      ) : null}

      <ul className="space-y-1.5">
        {checks.map((check) => (
          <li key={check.label} className="flex items-center gap-2 text-sm">
            {check.ok ? (
              <Check className="size-3.5 shrink-0 text-emerald-600" aria-hidden />
            ) : (
              <X className="size-3.5 shrink-0 text-muted-foreground/40" aria-hidden />
            )}
            <span className={check.ok ? 'text-foreground/80' : 'text-muted-foreground'}>
              {check.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
