import { REGISTRATION_LEGAL_POLICIES } from '@/features/auth/constants/legal-policies'
import { cn } from '@/lib/utils'

/**
 * @param {{
 *   checked: boolean,
 *   onChange: (checked: boolean) => void,
 *   error?: string,
 *   disabled?: boolean,
 * }} props
 */
export function RegistrationPolicyConsent({ checked, onChange, error, disabled = false }) {
  const { terms, privacy } = REGISTRATION_LEGAL_POLICIES

  return (
    <div className="space-y-2">
      <label
        className={cn(
          'flex cursor-pointer items-start gap-3 rounded-md border border-input bg-muted/20 p-3 text-sm leading-snug',
          error && 'border-destructive/40',
          disabled && 'cursor-not-allowed opacity-60',
        )}
      >
        <input
          id="acceptedPolicies"
          type="checkbox"
          className="mt-0.5 size-4 shrink-0 rounded border-input accent-primary"
          checked={checked}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-required
          onChange={(e) => onChange(e.target.checked)}
        />
        <span>
          I agree to SkyPrep Aero&apos;s{' '}
          <a
            href={terms.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary underline-offset-2 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {terms.label}
          </a>{' '}
          and{' '}
          <a
            href={privacy.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary underline-offset-2 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {privacy.label}
          </a>
          .
        </span>
      </label>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
