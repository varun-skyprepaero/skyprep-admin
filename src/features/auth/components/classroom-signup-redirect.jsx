import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { classroomInviteSignupUrl } from '@/features/auth/lib/is-classroom-signup-invite'

/**
 * @param {{ classroomAppUrl: string, inviteToken: string, roleName?: string | null }} props
 */
export function ClassroomSignupRedirect({ classroomAppUrl, inviteToken, roleName }) {
  const signupUrl = classroomInviteSignupUrl(classroomAppUrl, inviteToken)

  useEffect(() => {
    window.location.replace(signupUrl)
  }, [signupUrl])

  return (
    <Card className="border-border/60 shadow-lg">
      <CardHeader>
        <CardTitle>Use SkyPrep Classroom</CardTitle>
        <CardDescription>
          {roleName ? (
            <>
              This invitation is for a <strong>{roleName}</strong> account. Redirecting you to
              complete signup in the classroom app…
            </>
          ) : (
            <>Redirecting you to complete signup in the classroom app…</>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button type="button" asChild className="w-full">
          <a href={signupUrl}>Continue to Classroom signup</a>
        </Button>
      </CardContent>
    </Card>
  )
}
