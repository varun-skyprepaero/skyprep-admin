import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  countrySelectionFromIso,
  detectUserCountrySelection,
} from '@/lib/phone/country-selection'
import {
  fetchCityOptions,
  fetchStateOptions,
  resolveDetectedLocation,
} from '@/lib/location/location-data'
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
 *   id: string,
 *   label: string,
 *   value: string,
 *   options: import('@/lib/location/location-data').LocationOption[],
 *   placeholder: string,
 *   disabled?: boolean,
 *   invalid?: boolean,
 *   error?: string,
 *   hint?: string,
 *   loading?: boolean,
 *   preferSelect?: boolean,
 *   onChange: (value: string) => void,
 *   manualPlaceholder?: string,
 * }} props
 */
function LocationPickerField({
  id,
  label,
  value,
  options,
  placeholder,
  disabled = false,
  invalid = false,
  error,
  hint,
  loading = false,
  preferSelect = false,
  onChange,
  manualPlaceholder,
}) {
  const useDropdown = preferSelect || options.length > 0 || loading
  const fieldDisabled = disabled || loading
  const displayOptions =
    value && !options.some((option) => option.value === value)
      ? [{ value, label: value }, ...options]
      : options

  return (
    <div className="min-w-0 space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {useDropdown ? (
        <div className="relative min-w-0 overflow-hidden">
          <select
            id={id}
            className={cn(selectClass, 'min-w-0 truncate', invalid && 'border-destructive/60')}
            value={value}
            disabled={fieldDisabled}
            aria-invalid={invalid}
            aria-required
            title={value || placeholder}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="">{loading ? 'Loading…' : placeholder}</option>
            {displayOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
            {loading ? (
              <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden />
            ) : (
              <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
            )}
          </span>
        </div>
      ) : (
        <Input
          id={id}
          value={value}
          disabled={fieldDisabled}
          aria-invalid={invalid}
          aria-required
          placeholder={loading ? 'Loading…' : manualPlaceholder ?? placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={cn(selectClass, 'shadow-sm')}
        />
      )}
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}

/**
 * @param {{
 *   countryIso: string,
 *   phoneCountryIso: string,
 *   phoneNumber: string,
 *   city: string,
 *   state: string,
 *   onCountryIsoChange: (iso2: string, selection: ReturnType<typeof countrySelectionFromIso>) => void,
 *   onPhoneCountryIsoChange: (iso2: string, selection: ReturnType<typeof countrySelectionFromIso>) => void,
 *   onPhoneNumberChange: (value: string) => void,
 *   onCityChange: (value: string) => void,
 *   onStateChange: (value: string) => void,
 *   onLocationDetected?: (detected: { city?: string, state?: string }) => void,
 *   errors?: {
 *     country?: string,
 *     phoneCountryCode?: string,
 *     phoneNumber?: string,
 *     city?: string,
 *     state?: string,
 *   },
 *   disabled?: boolean,
 * }} props
 */
export function RegistrationCountryFields({
  countryIso,
  phoneCountryIso,
  phoneNumber,
  city,
  state,
  onCountryIsoChange,
  onPhoneCountryIsoChange,
  onPhoneNumberChange,
  onCityChange,
  onStateChange,
  onLocationDetected,
  errors = {},
  disabled = false,
}) {
  const [locationError, setLocationError] = useState('')
  const [detecting, setDetecting] = useState(false)
  const [stateOptions, setStateOptions] = useState(/** @type {import('@/lib/location/location-data').LocationOption[]} */ ([]))
  const [cityOptions, setCityOptions] = useState(/** @type {import('@/lib/location/location-data').LocationOption[]} */ ([]))
  const [statesLoading, setStatesLoading] = useState(false)
  const [citiesLoading, setCitiesLoading] = useState(false)

  const selectedPhoneCountry = countrySelectionFromIso(phoneCountryIso)
  const hasStateDropdown = stateOptions.length > 0
  const hasCityDropdown = cityOptions.length > 0
  const stateUsesSelect = Boolean(countryIso) && (statesLoading || hasStateDropdown)
  const cityUsesSelect =
    citiesLoading || hasCityDropdown || (hasStateDropdown && !state.trim())

  useEffect(() => {
    if (!countryIso) {
      setStateOptions([])
      return
    }

    let cancelled = false
    setStatesLoading(true)
    void fetchStateOptions(countryIso)
      .then((options) => {
        if (!cancelled) setStateOptions(options)
      })
      .catch(() => {
        if (!cancelled) setStateOptions([])
      })
      .finally(() => {
        if (!cancelled) setStatesLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [countryIso])

  useEffect(() => {
    if (!countryIso || !state.trim()) {
      setCityOptions([])
      return
    }

    let cancelled = false
    setCitiesLoading(true)
    void fetchCityOptions(countryIso, state)
      .then((options) => {
        if (!cancelled) setCityOptions(options)
      })
      .catch(() => {
        if (!cancelled) setCityOptions([])
      })
      .finally(() => {
        if (!cancelled) setCitiesLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [countryIso, state])

  const stateHint = useMemo(() => {
    if (!countryIso) return 'Select a country first'
    if (statesLoading) return 'Loading states…'
    if (hasStateDropdown) return 'Choose your state or province'
    return 'Enter your state or region'
  }, [countryIso, statesLoading, hasStateDropdown])

  const cityHint = useMemo(() => {
    if (!countryIso) return 'Select a country first'
    if (hasStateDropdown && !state) return 'Select a state first'
    if (citiesLoading) return 'Loading cities…'
    if (hasCityDropdown) return 'Choose your city'
    return 'Enter your city'
  }, [countryIso, state, citiesLoading, hasCityDropdown, hasStateDropdown])

  function handleCountryChange(iso, selection) {
    onCountryIsoChange(iso, selection)
    onStateChange('')
    onCityChange('')
    setLocationError('')
  }

  function handleStateChange(nextState) {
    onStateChange(nextState)
    onCityChange('')
  }

  async function useMyLocation() {
    setLocationError('')
    setDetecting(true)
    try {
      const sel = await detectUserCountrySelection()
      handleCountryChange(sel.countryIso, sel)
      onPhoneCountryIsoChange(sel.countryIso, sel)

      const resolved = await resolveDetectedLocation(sel.countryIso, sel.state, sel.city)
      if (resolved.state) onStateChange(resolved.state)
      if (resolved.city) onCityChange(resolved.city)

      onLocationDetected?.({ city: resolved.city || sel.city, state: resolved.state || sel.state })
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
              handleCountryChange(iso, countrySelectionFromIso(iso))
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

      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        <LocationPickerField
          id="state"
          label="State"
          value={state}
          options={stateOptions}
          loading={statesLoading}
          preferSelect={stateUsesSelect}
          placeholder={countryIso ? 'Select state' : 'Select country first'}
          manualPlaceholder="State / province"
          disabled={disabled || detecting || !countryIso}
          invalid={Boolean(errors.state)}
          error={errors.state}
          hint={stateHint}
          onChange={handleStateChange}
        />
        <LocationPickerField
          id="city"
          label="City"
          value={city}
          options={cityOptions}
          loading={citiesLoading}
          preferSelect={cityUsesSelect}
          placeholder={
            !countryIso
              ? 'Select country first'
              : hasStateDropdown && !state
                ? 'Select state first'
                : 'Select city'
          }
          manualPlaceholder="City"
          disabled={disabled || detecting || !countryIso || (hasStateDropdown && !state)}
          invalid={Boolean(errors.city)}
          error={errors.city}
          hint={cityHint}
          onChange={onCityChange}
        />
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
