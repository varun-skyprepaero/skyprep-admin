import { useEffect, useState } from 'react'
import { ExternalLink, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClassroomImpersonateLink } from '@/features/users/api/users-api'
import { handleApiError } from '@/lib/http/api-error'
import { notifyError, notifySuccess } from '@/lib/notifications'

/**
 * @param {{
 *   target: { uuid: string, email: string, name: string } | null,
 *   onClose: () => void,
 * }} props
 */
export function ClassroomImpersonateDialog({ target, onClose }) {
  const open = Boolean(target)
  const [signInUrl, setSignInUrl] = useState(/** @type {string | null} */ (null))
  const [targetApp, setTargetApp] = useState(/** @type {'classroom' | 'admin' | null} */ (null))
  const [error, setError] = useState(/** @type {string | null} */ (null))
  const [loading, setLoading] = useState(false)

  const appLabel = targetApp === 'admin' ? 'Admin' : 'Classroom'

  useEffect(() => {
    if (!target) {
      setSignInUrl(null)
      setTargetApp(null)
      setError(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    setSignInUrl(null)
    setTargetApp(null)

    createClassroomImpersonateLink(target.uuid)
      .then((payload) => {
        if (cancelled) return
        setSignInUrl(payload.signInUrl)
        setTargetApp(payload.targetApp === 'admin' ? 'admin' : 'classroom')
      })
      .catch((err) => {
        if (cancelled) return
        const { message } = handleApiError(err, 'Could not create sign-in link')
        setError(message || 'Could not create sign-in link')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [target])

  function handleClose() {
    if (loading) return
    onClose()
  }

  async function copyLink() {
    if (!signInUrl) return
    try {
      await navigator.clipboard.writeText(signInUrl)
      notifySuccess('Link copied to clipboard')
    } catch {
      notifyError('Could not copy link')
    }
  }

  if (!open || !target) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 p-4 backdrop-blur-sm sm:items-center"
      role="presentation"
      onClick={handleClose}
    >
      <Card
        className="relative z-10 max-h-[min(92vh,100dvh-2rem)] w-full max-w-md overflow-y-auto overscroll-contain shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="classroom-impersonate-title"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle id="classroom-impersonate-title">Open {appLabel}</CardTitle>
              <CardDescription>
                Sign in as <span className="font-medium text-foreground">{target.name}</span>
                {target.email ? (
                  <span>
                    {' '}
                    (<span className="text-foreground">{target.email}</span>)
                  </span>
                ) : null}
                . The link expires in about 10 minutes.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={handleClose}
              disabled={loading}
              aria-label="Close"
            >
              <X className="size-4" aria-hidden />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Preparing secure sign-in link…
            </div>
          ) : null}
          {error ? (
            <p
              className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              role="alert"
            >
              {error}
            </p>
          ) : null}
          {signInUrl && !loading ? (
            <p className="text-sm text-muted-foreground">
              Click Open in new tab below. This works even when the browser blocks popups. You can
              also copy the link and paste it into a new tab.
            </p>
          ) : null}
        </CardContent>
        <div className="flex flex-col gap-2 border-t p-6 pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void copyLink()}
            disabled={loading || !signInUrl}
          >
            Copy link
          </Button>
          {signInUrl ? (
            <Button type="button" className="gap-2" asChild>
              <a
                href={signInUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onClose}
              >
                <ExternalLink className="size-4" aria-hidden />
                Open in new tab
              </a>
            </Button>
          ) : (
            <Button type="button" className="gap-2" disabled>
              <ExternalLink className="size-4" aria-hidden />
              Open in new tab
            </Button>
          )}
        </div>
      </Card>
    </div>
  )
}
