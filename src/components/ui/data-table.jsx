import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'

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
 *   children?: React.ReactNode,
 * }} props
 */
export function DataTableToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search…',
  children,
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-border/80 bg-muted/30 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between lg:px-6">
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
      {children ? (
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">{children}</div>
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
