import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthBootstrap } from '@/app/auth-bootstrap'
import { ThemeProvider } from '@/app/theme-provider'
import { queryClient } from '@/lib/query-client'
import { router } from '@/routes/router'

export function AppProviders({ children }) {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        {children}
        <AuthBootstrap />
        <Toaster richColors closeButton position="top-right" />
      </QueryClientProvider>
    </ThemeProvider>
  )
}

export function AppShell() {
  return <RouterProvider router={router} />
}
