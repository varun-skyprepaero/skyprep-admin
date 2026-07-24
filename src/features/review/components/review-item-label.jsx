/**
 * Title + optional context line (e.g. book for a lesson) in review tables.
 * @param {{
 *   item: { title?: string, uuid: string, contextLabel?: string | null }
 *   asButton?: boolean
 *   onClick?: () => void
 *   className?: string
 * }} props
 */
export function ReviewItemLabel({ item, asButton = false, onClick, className = '' }) {
  const title = item.title || item.uuid
  const content = (
    <>
      <span className="line-clamp-2">{title}</span>
      {item.contextLabel ? (
        <span className="mt-0.5 block text-xs text-muted-foreground">{item.contextLabel}</span>
      ) : null}
    </>
  )

  if (asButton) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={
          'text-left font-medium text-primary underline-offset-2 hover:underline ' + className
        }
        title="View item"
      >
        {content}
      </button>
    )
  }

  return <div className={className}>{content}</div>
}
