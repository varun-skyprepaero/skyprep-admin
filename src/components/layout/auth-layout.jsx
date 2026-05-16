import { Outlet } from 'react-router-dom'
import { Shield } from 'lucide-react'
import { env } from '@/config/env'
import { cn } from '@/lib/utils'

export function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background lg:flex-row">
      <div
        className={cn(
          'relative flex flex-1 flex-col justify-between overflow-hidden px-6 py-8 lg:max-w-[42%] lg:px-12 lg:py-12',
          'bg-gradient-to-br from-primary via-primary/95 to-slate-800 text-primary-foreground',
        )}
      >
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -right-16 top-16 size-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-12 left-8 size-48 rounded-full bg-sky-400/20 blur-2xl" />
        </div>

        <div className="relative z-10 flex items-center gap-2.5 font-semibold tracking-tight">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary-foreground/15 backdrop-blur">
            <Shield className="size-4" aria-hidden />
          </span>
          {env.appName}
        </div>

        <div className="relative z-10 my-12 max-w-md space-y-4">
          <p className="text-sm font-medium uppercase tracking-widest text-primary-foreground/75">
            Internal operations
          </p>
          <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            Manage curriculum, enrollments, and your SkyPrep platform.
          </h1>
          <p className="text-primary-foreground/85">
            Secure admin access for content management, scheduling, and user administration.
          </p>
        </div>

        <p className="relative z-10 text-sm text-primary-foreground/70">
          © {new Date().getFullYear()} SkyPrep Aero
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-10 lg:px-12">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
