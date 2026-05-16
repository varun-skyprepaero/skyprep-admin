import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Spinner({ className, label = 'Loading' }) {
  return (
    <div className={cn('flex flex-col items-center gap-3', className)} role="status">
      <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
      <span className="sr-only">{label}</span>
    </div>
  )
}
