import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  countrySelectionFromIso,
  detectUserCountrySelection,
} from '@/lib/phone/country-selection'
import { COUNTRY_CALLING_CODES } from '@/lib/phone/country-calling-codes'
import { cn } from '@/lib/utils'
import { ChevronDown, Loader2, LocateFixed } from 'lucide-react'

const selectClass = cn(
  'flex h-10 w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-9 text-sm shadow-sm',
  'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  'disabled:cursor-not-allowed disabled:opacity-50',
)

const phoneCodeSelectClass = cn(
  'h-10 w-full appearance-none border-0 bg-transparent pl-2.5 pr-7 text-sm font-medium tabular-nums outline-none',
  'disabled:cursor-not-allowed disabled:opacity-50',
)

/**
 * @param {{
 *   countryIso: string,
 *   phoneCountryIso: string,
 *   phoneNumber: string,
 *   onCountryIsoChange: (iso2: string, selection: ReturnType<typeof countrySelectionFromIso>) => void,
 *   onPhoneCountryIsoChange: (iso2: string, selection: ReturnType<typeof countrySelectionFromIso>) => void,
 *   onPhoneNumberChange: (value: string) => void,
 *   errors?: { country?: string, phoneCountryCode?: string, phoneNumber?: string },
 *   disabled?: boolean,
 * }} props
 */
export function RegistrationCountryFields({
  countryIso,
  phoneCountryIso,
  phoneNumber,
  onCountryIsoChange,
  onPhoneCountryIsoChange,
  onPhoneNumberChange,
  errors = {},
  disabled = false,
}) {
  const [locationError, setLocationError] = useState('')
  const [detecting, setDetecting] = useState(false)

  const selectedCountry = countrySelectionFromIso(countryIso)
  const selectedPhoneCountry = countrySelectionFromIso(phoneCountryIso)

  async function useMyLocation() {
    setLocationError('')
    setDetecting(true)
    try {
      const sel = await detectUserCountrySelection()
      onCountryIsoChange(sel.countryIso, sel)
      onPhoneCountryIsoChange(sel.countryIso, sel)
    } catch (err) {
      setLocationError(err instanceof Error ? err.message : 'Could not detect location')
    } finally {
      setDetecting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <Label htmlFor="countryIso" className="mb-0">
            Country
          </Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={disabled || detecting}
            onClick={() => void useMyLocation()}
          >
            {detecting ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <LocateFixed className="size-4" aria-hidden />
            )}
            Use my location
          </Button>
        </div>
        <div className="relative">
          <select
            id="countryIso"
            className={selectClass}
            autoComplete="country"
            value={countryIso}
            onChange={(e) => {
              const iso = e.target.value
              onCountryIsoChange(iso, countrySelectionFromIso(iso))
              setLocationError('')
            }}
            disabled={disabled || detecting}
            aria-invalid={Boolean(errors.country)}
            aria-required
          >
            <option value="">Select your country</option>
            {COUNTRY_CALLING_CODES.map((c) => (
              <option key={c.iso2} value={c.iso2}>
                {c.country}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
        </div>
        {errors.country ? (
          <p className="text-sm text-destructive">{errors.country}</p>
        ) : selectedCountry ? (
          <p className="text-xs text-muted-foreground">
            Used for regional pricing and your profile.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Choose your country or use your location to fill it automatically.
          </p>
        )}
        {locationError ? (
          <p className="text-sm text-destructive" role="alert">
            {locationError}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="phoneNumber">Phone number</Label>
        <div
          className={cn(
            'flex overflow-hidden rounded-md border border-input bg-background shadow-sm transition-colors',
            'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
            (disabled || detecting) && 'opacity-50',
            errors.phoneCountryCode && 'border-destructive/60',
          )}
        >
          <div className="relative w-[8.75rem] shrink-0 border-r border-input bg-muted/40">
            <select
              id="phoneCountryIso"
              className={phoneCodeSelectClass}
              autoComplete="tel-country-code"
              value={phoneCountryIso}
              onChange={(e) => {
                const iso = e.target.value
                onPhoneCountryIsoChange(iso, countrySelectionFromIso(iso))
              }}
              disabled={disabled || detecting}
              aria-invalid={Boolean(errors.phoneCountryCode)}
              aria-label="Phone country code"
              aria-required
            >
              <option value="">+--</option>
              {COUNTRY_CALLING_CODES.map((c) => (
                <option key={c.iso2} value={c.iso2}>
                  {c.dialCode} · {c.country}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-1.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
          </div>
          <input
            id="phoneNumber"
            type="tel"
            autoComplete="tel-national"
            value={phoneNumber}
            onChange={(e) => onPhoneNumberChange(e.target.value)}
            disabled={disabled || detecting}
            aria-invalid={Boolean(errors.phoneNumber)}
            aria-required
            placeholder="Mobile number"
            className={cn(
              'flex h-10 w-full min-w-0 bg-transparent px-3 text-sm outline-none',
              'placeholder:text-muted-foreground disabled:cursor-not-allowed',
            )}
          />
        </div>
        {errors.phoneCountryCode ? (
          <p className="text-sm text-destructive">{errors.phoneCountryCode}</p>
        ) : errors.phoneNumber ? (
          <p className="text-sm text-destructive">{errors.phoneNumber}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            {selectedPhoneCountry
              ? `Dialing ${selectedPhoneCountry.countryCode}. National number only, without country code.`
              : 'Pick a phone country code, then enter your national number.'}
          </p>
        )}
      </div>
    </div>
  )
}
