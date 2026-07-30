import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Loader2, MoreHorizontal, Search } from 'lucide-react'

/**
 * @typedef {{
 *   label: string,
 *   onClick: () => void,
 *   destructive?: boolean,
 *   disabled?: boolean,
 * }} DataTableRowActionItem
 */

/** Shared styles for native `<select>` in table toolbars and pagination. */
export const dataTableSelectClass =
  'h-9 rounded-md border border-input bg-background px-2.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'

/**
 * @param {{ className?: string, children: React.ReactNode }} props
 */
export function DataTable({ className, children }) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border border-border/80 bg-card text-card-foreground shadow-sm',
        className,
      )}
    >
      {children}
    </div>
  )
}

/**
 * @param {{
 *   searchValue: string,
 *   onSearchChange: (value: string) => void,
 *   searchPlaceholder?: string,
 *   actions?: React.ReactNode,
 *   children?: React.ReactNode,
 * }} props
 */
export function DataTableToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search…',
  actions,
  children,
}) {
  const hasActions = actions != null
  const trailing = hasActions ? actions : children
  const filters = hasActions ? children : null

  return (
    <div className="border-b border-border/80 bg-muted/30">
      <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between lg:px-6">
        <div className="relative min-w-[12rem] max-w-md flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            className="h-9 pl-9"
            type="search"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label="Search table"
            autoComplete="off"
          />
        </div>
        {trailing ? (
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">{trailing}</div>
        ) : null}
      </div>
      {filters ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-border/60 px-4 py-2.5 lg:px-6">
          {filters}
        </div>
      ) : null}
    </div>
  )
}

/**
 * @param {{
 *   page: number,
 *   pageSize: number,
 *   total: number,
 *   onPageChange: (page: number) => void,
 *   onPageSizeChange: (size: number) => void,
 *   pageSizeOptions?: number[],
 * }} props
 */
export function DataTablePagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50],
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1)
  const safePage = Math.min(Math.max(1, page), totalPages)
  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1
  const to = Math.min(safePage * pageSize, total)

  return (
    <div className="flex flex-col gap-3 border-t border-border/80 bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between lg:px-6">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span>
          Showing <span className="font-medium text-foreground">{from}</span>–
          <span className="font-medium text-foreground">{to}</span> of{' '}
          <span className="font-medium text-foreground">{total}</span>
        </span>
        <label className="ml-0 flex items-center gap-2 sm:ml-2">
          <span className="sr-only">Rows per page</span>
          <select
            className={dataTableSelectClass}
            value={String(pageSize)}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            aria-label="Rows per page"
          >
            {pageSizeOptions.map((n) => (
              <option key={n} value={n}>
                {n} / page
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(safePage - 1)}
          disabled={safePage <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4" aria-hidden />
          <span className="hidden sm:inline">Previous</span>
        </Button>
        <span className="min-w-[4.5rem] text-center text-sm tabular-nums text-muted-foreground">
          Page {safePage} of {totalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage >= totalPages}
          aria-label="Next page"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="size-4" aria-hidden />
        </Button>
      </div>
    </div>
  )
}

/**
 * @param {{ className?: string, children: React.ReactNode }} props
 */
export function DataTableContent({ className, children }) {
  return <div className={cn('overflow-x-auto', className)}>{children}</div>
}

/** Narrow actions column header — pair with {@link DataTableRowActions}. */
export function DataTableActionsHeader({ className }) {
  return (
    <th
      className={cn('h-11 w-12 px-2 align-middle lg:px-3', className)}
      aria-label="Actions"
    />
  )
}

/**
 * Per-row ⋯ menu for edit/delete and other row actions.
 *
 * @param {{
 *   rowId: string,
 *   items: DataTableRowActionItem[],
 *   leading?: React.ReactNode,
 *   busy?: boolean,
 *   disabled?: boolean,
 *   className?: string,
 * }} props
 */
export function DataTableRowActions({
  rowId,
  items,
  leading = null,
  busy = false,
  disabled = false,
  className,
}) {
  const [open, setOpen] = useState(false)
  const [menuStyle, setMenuStyle] = useState(
    /** @type {{ top: number, left: number } | null} */ (null),
  )
  const triggerRef = useRef(/** @type {HTMLButtonElement | null} */ (null))
  const panelRef = useRef(/** @type {HTMLDivElement | null} */ (null))

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      setMenuStyle(null)
      return
    }
    function updatePosition() {
      const trigger = triggerRef.current
      if (!trigger) return
      const rect = trigger.getBoundingClientRect()
      setMenuStyle({
        top: rect.bottom + 4,
        left: rect.right,
      })
    }
    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function onPointerDown(e) {
      const target = /** @type {Node} */ (e.target)
      if (panelRef.current?.contains(target)) return
      if (triggerRef.current?.contains(target)) return
      setOpen(false)
    }
    const frame = requestAnimationFrame(() => {
      document.addEventListener('mousedown', onPointerDown)
    })
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('mousedown', onPointerDown)
    }
  }, [open])

  const menu =
    open && menuStyle
      ? createPortal(
          <div
            ref={panelRef}
            className="fixed z-[200] min-w-[10rem] -translate-x-full rounded-md border border-border bg-popover py-1 text-popover-foreground shadow-md"
            style={{ top: menuStyle.top, left: menuStyle.left }}
            role="menu"
          >
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                className={cn(
                  'flex w-full px-3 py-2 text-left text-sm hover:bg-accent disabled:pointer-events-none disabled:opacity-50',
                  item.destructive && 'text-destructive hover:bg-destructive/10',
                )}
                disabled={disabled || item.disabled}
                onClick={() => {
                  setOpen(false)
                  item.onClick()
                }}
              >
                {item.label}
              </button>
            ))}
          </div>,
          document.body,
        )
      : null

  return (
    <td className={cn('px-2 py-3 align-middle lg:px-3', className)} onClick={(event) => event.stopPropagation()}>
      <div className="flex items-center justify-end gap-1">
        {leading}
        <Button
          ref={triggerRef}
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          data-row-menu-trigger={rowId}
          aria-label="Open row actions"
          aria-expanded={open}
          aria-haspopup="menu"
          disabled={disabled}
          onClick={() => setOpen((prev) => !prev)}
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <MoreHorizontal className="size-4" aria-hidden />
          )}
        </Button>
      </div>
      {menu}
    </td>
  )
}

