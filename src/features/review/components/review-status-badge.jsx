import { REVIEW_STATUS_META } from '@/features/review/constants'
import { cn } from '@/lib/utils'

/**
 * @param {{ status?: string | null, className?: string }} props
 */
export function ReviewStatusBadge({ status, className }) {
  const meta = REVIEW_STATUS_META[status ?? 'OK'] ?? REVIEW_STATUS_META.OK
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
        meta.badgeClass,
        className,
      )}
    >
      {meta.label}
    </span>
  )
}
