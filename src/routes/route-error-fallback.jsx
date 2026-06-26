import { isRouteErrorResponse, useRouteError } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { isChunkLoadError } from '@/lib/lazy-with-retry'

export function RouteErrorFallback() {
  const error = useRouteError()
  const chunkError = isChunkLoadError(error)

  let title = 'Something went wrong'
  let description = 'An unexpected error occurred while loading this page.'

  if (chunkError) {
    title = 'App update available'
    description =
      'This page could not load because a newer version of the admin app was deployed. Refresh to continue.'
  } else if (isRouteErrorResponse(error)) {
    description = error.statusText || description
  } else if (error instanceof Error && error.message) {
    description = error.message
  }

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" className="w-full" onClick={() => window.location.reload()}>
            Refresh page
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
