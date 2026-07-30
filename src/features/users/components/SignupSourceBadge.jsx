/**
 * @param {{ registrationSource?: string | null, pendingInvite?: boolean }} props
 */
export function SignupSourceBadge({ registrationSource, pendingInvite = false }) {
  if (pendingInvite) {
    return <span className="text-xs text-muted-foreground">Pending invite</span>
  }

  switch (registrationSource) {
    case 'INVITED':
      return (
        <span className="inline-flex rounded-full bg-violet-500/15 px-2 py-0.5 text-xs font-medium text-violet-800 dark:text-violet-300">
          Admin invite
        </span>
      )
    case 'SELF_REGISTERED':
      return (
        <span className="inline-flex rounded-full bg-teal-500/15 px-2 py-0.5 text-xs font-medium text-teal-800 dark:text-teal-300">
          Classroom (web)
        </span>
      )
    case 'ADMIN_CREATED':
      return (
        <span className="inline-flex rounded-full bg-slate-500/15 px-2 py-0.5 text-xs font-medium text-slate-800 dark:text-slate-300">
          Admin created
        </span>
      )
    default:
      return <span className="text-xs text-muted-foreground">Unknown</span>
  }
}
