import { REVIEW_STATUS_META } from '@/features/review/constants'
import { cn } from '@/lib/utils'

/**
 * @param {{
 *   status?: string | null
 *   className?: string
 *   onClick?: () => void
 *   title?: string
 * }} props
 */
export function ReviewStatusBadge({ status, className, onClick, title }) {
  const meta = REVIEW_STATUS_META[status ?? 'OK'] ?? REVIEW_STATUS_META.OK
  const classes = cn(
    'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
    meta.badgeClass,
    onClick && 'cursor-pointer underline-offset-2 transition-opacity hover:opacity-80 hover:underline',
    className,
  )

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={classes} title={title ?? 'View review details'}>
        {meta.label}
      </button>
    )
  }

  return <span className={classes}>{meta.label}</span>
}
