import { FileText } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const sections = [
  {
    title: "Independent Tool",
    body: "ARSHLAB is an independent educational tool. It is not affiliated with or endorsed by the International Baccalaureate Organization, College Board, Cambridge Assessment International Education, the University of British Columbia, or any other examination board or institution.",
  },
  {
    title: "No Guarantee Of Correctness",
    body: "Chemistry explanations, calculations, practice material, visualizations, and generated outputs may contain mistakes or simplifications. Users should verify answers independently.",
  },
  {
    title: "Not Official Material",
    body: "ARSHLAB is not official exam-board or university material. Practice papers and videos are independently created unless otherwise stated.",
  },
  {
    title: "Acceptable Use",
    body: "Do not misuse, scrape, overload, abuse, reverse engineer, or attempt to attack the service. User accounts may be removed for abuse or behavior that harms the project or other users.",
  },
  {
    title: "Saved History",
    body: "Saved history is provided for educational convenience. Users should not store sensitive personal information in molecule, reaction, or search fields. ARSHLAB may remove abusive accounts or data.",
  },
  {
    title: "No Professional Advice",
    body: "ARSHLAB does not provide professional, legal, medical, financial, safety, or regulatory advice. It is an educational chemistry learning platform.",
  },
  {
    title: "Service Changes",
    body: "The service may change, break, be limited, or be discontinued at any time. Features may be added, removed, renamed, or revised as ARSHLAB develops.",
  },
]

export default function TermsPage() {
  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Terms of Service</h1>
            <p className="text-muted-foreground">Rules and limitations for using ARSHLAB.</p>
          </div>
        </div>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>ARSHLAB Terms of Service</CardTitle>
            <p className="text-sm text-muted-foreground">Last updated: June 10, 2026</p>
          </CardHeader>
          <CardContent className="space-y-5">
            {sections.map((section) => (
              <section key={section.title} className="space-y-2">
                <h2 className="text-lg font-semibold">{section.title}</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">{section.body}</p>
              </section>
            ))}
            <section className="rounded-xl border border-dashed border-border bg-secondary/20 p-4">
              <h2 className="font-semibold">Contact Placeholder</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                For questions about these terms, contact the ARSHLAB project owner using the contact method
                provided on the creator page or project repository.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
