import { Suspense } from 'react'
import { Spinner } from '@/components/ui/spinner'

export function SuspensePage({ children }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <Spinner label="Loading page" />
        </div>
      }
    >
      {children}
    </Suspense>
  )
}
