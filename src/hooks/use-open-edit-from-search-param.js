import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * Opens an edit dialog when the URL has `?edit=<uuid>`, then clears the param.
 * Used so Review "My entries" can deep-link into the authoring screens.
 * @param {Array<{ uuid: string }> | null | undefined} rows
 * @param {(row: { uuid: string }) => void} openEdit
 */
export function useOpenEditFromSearchParam(rows, openEdit) {
  const [searchParams, setSearchParams] = useSearchParams()
  const editParam = searchParams.get('edit')

  useEffect(() => {
    if (!editParam || !rows?.length) return
    const match = rows.find((row) => row.uuid === editParam)
    if (!match) return
    openEdit(match)
    const next = new URLSearchParams(searchParams)
    next.delete('edit')
    setSearchParams(next, { replace: true })
    // openEdit is stable enough for one-shot deep links; avoid re-firing on identity churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editParam, rows])
}
