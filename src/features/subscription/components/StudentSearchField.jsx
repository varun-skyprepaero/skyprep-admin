import { useMemo, useState } from 'react'
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
 * }} props
 */
export function StudentSearchField({
  id = 'grant-student',
  value,
  onChange,
  users,
  disabled = false,
  readOnly = false,
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

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

  return (
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
          setQuery(selectedUser?.email ?? value)
          setOpen(true)
        }}
        onBlur={() => {
          window.setTimeout(() => {
            const resolved = resolveStudentEmail(query || value, users)
            if (resolved !== value) onChange(resolved)
            setQuery('')
            setOpen(false)
          }, 150)
        }}
        placeholder="Search by name or email…"
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-controls={`${id}-listbox`}
        disabled={disabled}
        required
      />

      {open && filteredUsers.length > 0 && !disabled ? (
        <ul
          id={`${id}-listbox`}
          className={cn(
            'absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border border-border',
            'bg-popover py-1 text-sm shadow-md',
          )}
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
      ) : null}

      {open && query.trim() && filteredUsers.length === 0 ? (
        <div className="absolute z-20 mt-1 w-full rounded-md border border-border bg-popover px-3 py-2 text-sm text-muted-foreground shadow-md">
          No matching students. They may need to sign up in Classroom first.
        </div>
      ) : null}
    </div>
  )
}
