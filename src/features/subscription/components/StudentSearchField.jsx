import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/**
 * @param {string} input
 * @param {Array<{ email: string, name?: string }>} users
 */
export function resolveStudentEmail(input, users) {
  const trimmed = input.trim()
  if (!trimmed) return ''

  const byEmail = users.find((user) => user.email.toLowerCase() === trimmed.toLowerCase())
  if (byEmail) return byEmail.email

  const byName = users.find((user) => (user.name ?? '').toLowerCase() === trimmed.toLowerCase())
  if (byName) return byName.email

  return trimmed
}

/**
 * @param {string} email
 * @param {Array<{ email: string, name?: string }>} users
 */
export function isKnownStudentEmail(email, users) {
  const trimmed = email.trim().toLowerCase()
  if (!trimmed) return false
  return users.some((user) => user.email.toLowerCase() === trimmed)
}

/**
 * @param {{
 *   id?: string
 *   value: string
 *   onChange: (email: string) => void
 *   users: Array<{ email: string, name?: string }>
 *   disabled?: boolean
 *   readOnly?: boolean
 *   allowCustomEmail?: boolean
 *   placeholder?: string
 * }} props
 */
export function StudentSearchField({
  id = 'grant-student',
  value,
  onChange,
  users,
  disabled = false,
  readOnly = false,
  allowCustomEmail = false,
  placeholder = 'Search by name or email…',
}) {
  const inputRef = useRef(/** @type {HTMLInputElement | null} */ (null))
  const listRef = useRef(/** @type {HTMLElement | null} */ (null))
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [menuStyle, setMenuStyle] = useState(
    /** @type {{ top: number, left: number, width: number } | null} */ (null),
  )

  const selectedUser = useMemo(
    () => users.find((user) => user.email.toLowerCase() === value.trim().toLowerCase()) ?? null,
    [users, value],
  )

  const displayValue = open
    ? query
    : selectedUser
      ? selectedUser.name
        ? `${selectedUser.name} (${selectedUser.email})`
        : selectedUser.email
      : value

  const filteredUsers = useMemo(() => {
    const q = (open ? query : '').trim().toLowerCase()
    const list = q
      ? users.filter((user) => {
          const email = user.email.toLowerCase()
          const name = (user.name ?? '').toLowerCase()
          return email.includes(q) || name.includes(q)
        })
      : users
    return list.slice(0, 20)
  }, [users, query, open])

  useEffect(() => {
    if (!open) {
      setMenuStyle(null)
      return
    }

    function updatePosition() {
      const input = inputRef.current
      if (!input) return
      const rect = input.getBoundingClientRect()
      setMenuStyle({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open, filteredUsers.length, query])

  function selectUser(email) {
    onChange(email)
    setQuery('')
    setOpen(false)
  }

  if (readOnly) {
    return (
      <Input
        id={id}
        value={
          selectedUser
            ? selectedUser.name
              ? `${selectedUser.name} (${selectedUser.email})`
              : selectedUser.email
            : value
        }
        readOnly
        disabled={disabled}
      />
    )
  }

  const showResults = open && filteredUsers.length > 0 && !disabled && menuStyle
  const showEmpty =
    open && Boolean(query.trim()) && filteredUsers.length === 0 && !disabled && menuStyle

  const dropdown =
    showResults || showEmpty
      ? createPortal(
          showResults ? (
            <ul
              ref={listRef}
              id={`${id}-listbox`}
              className={cn(
                'fixed z-[200] max-h-56 overflow-auto rounded-md border border-border',
                'bg-popover py-1 text-sm shadow-md',
              )}
              style={{
                top: menuStyle.top,
                left: menuStyle.left,
                width: menuStyle.width,
              }}
              role="listbox"
            >
              {filteredUsers.map((user) => (
                <li key={user.email} role="option" aria-selected={user.email === value}>
                  <button
                    type="button"
                    className={cn(
                      'flex w-full flex-col items-start px-3 py-2 text-left hover:bg-muted',
                      user.email === value && 'bg-muted/60',
                    )}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectUser(user.email)}
                  >
                    <span className="font-medium">{user.name || user.email}</span>
                    {user.name ? (
                      <span className="text-xs text-muted-foreground">{user.email}</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div
              ref={listRef}
              className="fixed z-[200] rounded-md border border-border bg-popover px-3 py-2 text-sm text-muted-foreground shadow-md"
              style={{
                top: menuStyle.top,
                left: menuStyle.left,
                width: menuStyle.width,
              }}
            >
              {allowCustomEmail && query.trim().includes('@')
                ? `Invite ${query.trim()}`
                : allowCustomEmail
                  ? 'No matching students. Type a full email to invite someone new.'
                  : 'No matching students. They may need to sign up in Classroom first.'}
            </div>
          ),
          document.body,
        )
      : null

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        id={id}
        value={displayValue}
        onChange={(e) => {
          setQuery(e.target.value)
          onChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => {
          setQuery(selectedUser?.email ?? value)
          setOpen(true)
        }}
        onBlur={() => {
          window.setTimeout(() => {
            const raw = (query || value).trim()
            const resolved = resolveStudentEmail(raw, users)
            const next =
              allowCustomEmail && raw && resolved === raw && raw.includes('@') ? raw : resolved
            if (next !== value) onChange(next)
            setQuery('')
            setOpen(false)
          }, 150)
        }}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-controls={`${id}-listbox`}
        disabled={disabled}
        required
      />
      {dropdown}
    </div>
  )
}
