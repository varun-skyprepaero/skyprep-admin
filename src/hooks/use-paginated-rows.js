import { useMemo, useState } from 'react'

/**
 * Client-side pagination for filtered table rows (same pattern as Users admin table).
 * @template T
 * @param {T[]} filteredRows
 */
export function usePaginatedRows(filteredRows) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const total = filteredRows.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1)
  const effectivePage = Math.min(Math.max(1, page), totalPages)

  const paginatedRows = useMemo(() => {
    const start = (effectivePage - 1) * pageSize
    return filteredRows.slice(start, start + pageSize)
  }, [filteredRows, effectivePage, pageSize])

  return {
    paginatedRows,
    paginationProps: {
      page: effectivePage,
      pageSize,
      total,
      onPageChange: setPage,
      onPageSizeChange: (size) => {
        setPageSize(size)
        setPage(1)
      },
    },
    resetPage: () => setPage(1),
  }
}
