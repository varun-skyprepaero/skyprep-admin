import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { exchangeImpersonate } from '@/features/auth/api/auth-api'
import { toAuthSession } from '@/features/auth/lib/to-auth-session'
import { handleApiError } from '@/lib/http/api-error'
import { useAuthStore } from '@/stores/auth-store'

export default function StaffLoginPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const hasHydrated = useAuthStore((s) => s._hasHydrated)
  const logout = useAuthStore((s) => s.logout)
  const setSession = useAuthStore((s) => s.setSession)
  const [error, setError] = useState(/** @type {string | null} */ (null))

  useEffect(() => {
    if (!hasHydrated) return

    const token = searchParams.get('token')?.trim()
    if (!token) {
      setError('Missing sign-in link. Open Admin from Users → impersonate.')
      return
    }

    let cancelled = false

    ;(async () => {
      logout()

      try {
        const response = await exchangeImpersonate(token)
        if (cancelled) return
        setSession(toAuthSession(response.data))
        navigate('/', { replace: true })
      } catch (err) {
        if (cancelled) return
        const { message } = handleApiError(err, 'Could not sign in')
        setError(message || 'Could not sign in')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [hasHydrated, searchParams, navigate, logout, setSession])

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Could not sign in</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button type="button" variant="outline" className="w-full" asChild>
              <a href="/login">Go to admin sign in</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-muted/30 text-muted-foreground">
      <Spinner label="Signing in" />
      <p className="text-sm">Signing in to Admin…</p>
    </div>
  )
}
