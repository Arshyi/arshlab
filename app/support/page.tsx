import type { Metadata } from "next"
import Link from "next/link"
import { ExternalLink, HeartHandshake, ShieldCheck } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Support ARSHLAB | ARSHLAB",
  description: "Optional creator support for the free ARSHLAB chemistry learning platform.",
}

function getSupportUrl(): string | null {
  const value = process.env.NEXT_PUBLIC_SUPPORT_URL
  if (!value) return null
  try {
    const url = new URL(value)
    if (url.protocol !== "https:" && url.protocol !== "http:") return null
    return url.toString()
  } catch {
    return null
  }
}

export default function SupportPage() {
  const supportUrl = getSupportUrl()

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <HeartHandshake className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Support ARSHLAB</h1>
            <p className="text-muted-foreground">Optional creator support for a free chemistry learning project.</p>
          </div>
        </div>

        <Card className="rounded-2xl border-teal-500/20 bg-teal-500/5">
          <CardHeader>
            <CardTitle>Free to use</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-lg leading-relaxed text-muted-foreground">
              Support is optional. Donations help cover hosting, development time, and maintenance.
              Donations do not unlock extra features, priority support, private services, or account benefits.
            </p>

            <Alert className="rounded-2xl bg-background/80">
              <ShieldCheck className="h-4 w-4" />
              <AlertTitle>No in-app payment data</AlertTitle>
              <AlertDescription>
                Payments are handled by a third-party provider. ARSHLAB does not process or store
                card, PayPal, bank, or payment-provider account details.
              </AlertDescription>
            </Alert>

            <div className="flex flex-wrap gap-3">
              {supportUrl ? (
                <Button asChild className="rounded-xl">
                  <a href={supportUrl} target="_blank" rel="noopener noreferrer">
                    Support via PayPal
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              ) : (
                <p className="rounded-xl border border-dashed border-border bg-background/80 px-4 py-3 text-sm text-muted-foreground">
                  Support link is not configured yet.
                </p>
              )}
              <Button asChild variant="outline" className="rounded-xl">
                <Link href="/chemistry-hub">Keep learning</Link>
              </Button>
            </div>

            <p className="text-sm leading-relaxed text-muted-foreground">
              Supporting the creator is never required to access ARSHLAB chemistry tools, learning
              paths, scanner pages, practice, exams, virtual labs, or saved-account features.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
