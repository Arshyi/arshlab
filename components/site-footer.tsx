import Link from "next/link"

const disclaimer =
  "ARSHLAB is an independent educational project and is not affiliated with or endorsed by the International Baccalaureate Organization, College Board, Cambridge Assessment International Education, the University of British Columbia, or any other examination board or institution."

export function SiteFooter() {
  return (
    <footer className="border-t border-border/50 bg-background/90">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 text-sm text-muted-foreground sm:px-6 lg:px-8">
        <div className="flex flex-wrap gap-4">
          <Link href="/chemistry-hub" className="font-medium text-foreground hover:underline">
            Chemistry Hub
          </Link>
          <Link href="/roadmap" className="font-medium text-foreground hover:underline">
            Roadmap
          </Link>
          <Link href="/patch-notes" className="font-medium text-foreground hover:underline">
            Patch Notes
          </Link>
          <Link href="/privacy" className="font-medium text-foreground hover:underline">
            Privacy Policy
          </Link>
          <Link href="/terms" className="font-medium text-foreground hover:underline">
            Terms of Service
          </Link>
        </div>
        <p className="max-w-5xl text-xs leading-relaxed">{disclaimer}</p>
      </div>
    </footer>
  )
}
