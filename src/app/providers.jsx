import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthBootstrap } from '@/app/auth-bootstrap'
import { queryClient } from '@/lib/query-client'
import { router } from '@/routes/router'

export function AppProviders({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <AuthBootstrap />
      <Toaster richColors closeButton position="top-right" />
    </QueryClientProvider>
  )
}

export function AppShell() {
  return <RouterProvider router={router} />
}
