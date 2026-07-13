import { useEffect, useId } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const SIZE_CLASS = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-3xl',
}

/**
 * Central admin modal shell: overlay, max-height, scrollable body, sticky footer.
 *
 * @param {{
 *   open: boolean
 *   onClose: () => void
 *   children: import('react').ReactNode
 *   size?: 'sm' | 'md' | 'lg' | 'xl'
 *   className?: string
 *   closeOnOverlayClick?: boolean
 *   closeDisabled?: boolean
 *   role?: 'dialog' | 'alertdialog'
 *   'aria-labelledby'?: string
 *   'aria-describedby'?: string
 * }} props
 */
export function Modal({
  open,
  onClose,
  children,
  size = 'md',
  className,
  closeOnOverlayClick = true,
  closeDisabled = false,
  role = 'dialog',
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
}) {
  useEffect(() => {
    if (!open) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKeyDown(event) {
      if (event.key === 'Escape' && !closeDisabled) {
        onClose()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose, closeDisabled])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex min-h-0 items-end justify-center bg-background/80 p-4 backdrop-blur-sm sm:items-center"
      role="presentation"
      onClick={() => {
        if (closeOnOverlayClick && !closeDisabled) onClose()
      }}
    >
      <div
        className={cn(
          'relative z-10 flex max-h-[min(92vh,100dvh-2rem)] w-full min-h-0 flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-lg',
          SIZE_CLASS[size] ?? SIZE_CLASS.md,
          className,
        )}
        role={role}
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}

/**
 * @param {{
 *   title: import('react').ReactNode
 *   description?: import('react').ReactNode
 *   onClose?: () => void
 *   closeDisabled?: boolean
 *   showClose?: boolean
 *   titleId?: string
 *   descriptionId?: string
 *   className?: string
 *   children?: import('react').ReactNode
 * }} props
 */
export function ModalHeader({
  title,
  description,
  onClose,
  closeDisabled = false,
  showClose = true,
  titleId,
  descriptionId,
  className,
  children,
}) {
  const reactId = useId()
  const resolvedTitleId = titleId ?? `modal-title-${reactId}`
  const resolvedDescriptionId = descriptionId ?? `modal-description-${reactId}`

  return (
    <div
      className={cn(
        'flex shrink-0 flex-row items-start justify-between gap-4 border-b px-6 py-5',
        className,
      )}
    >
      <div className="min-w-0 flex-1 space-y-1.5">
        <h2 id={resolvedTitleId} className="text-lg font-semibold leading-none tracking-tight">
          {title}
        </h2>
        {description ? (
          <p id={resolvedDescriptionId} className="text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
        {children}
      </div>
      {showClose && onClose ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={onClose}
          disabled={closeDisabled}
          aria-label="Close"
        >
          <X className="size-4" aria-hidden />
        </Button>
      ) : null}
    </div>
  )
}

/**
 * Scrollable modal content area.
 * @param {{ children: import('react').ReactNode, className?: string, as?: 'div' | 'form' } & Record<string, unknown>} props
 */
export function ModalBody({ children, className, as: Comp = 'div', ...props }) {
  return (
    <Comp
      className={cn(
        'min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5',
        className,
      )}
      {...props}
    >
      {children}
    </Comp>
  )
}

/**
 * Sticky action row at the bottom of the modal.
 * @param {{ children: import('react').ReactNode, className?: string }} props
 */
export function ModalFooter({ children, className }) {
  return (
    <div
      className={cn(
        'flex shrink-0 flex-col-reverse gap-2 border-t px-6 py-4 sm:flex-row sm:justify-end',
        className,
      )}
    >
      {children}
    </div>
  )
}
