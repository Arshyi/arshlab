import { ShieldCheck } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const sections = [
  {
    title: "Independent Educational Project",
    body: "ARSHLAB is an independent educational project built to help students explore chemistry concepts. It is not official IB, AP, A-Level, UBC, exam-board, or university content.",
  },
  {
    title: "Accounts And Authentication",
    body: "Accounts use Supabase Auth. ARSHLAB may collect your email address, Supabase user ID, and login/session data needed to keep you signed in.",
  },
  {
    title: "Guest And Saved History",
    body: "Guest history is stored locally in your browser sessionStorage. Logged-in users may have molecule and reaction search history saved to Supabase so it can be viewed across devices.",
  },
  {
    title: "Clearing Saved History",
    body: "Logged-in users can delete individual history entries, clear saved molecule history, clear saved reaction history, or clear all saved history from the History page. Guest history remains temporary browser sessionStorage and can also be cleared from the History page.",
  },
  {
    title: "Exporting History",
    body: "Users can export currently visible history from the History page as JSON or CSV for their own educational records.",
  },
  {
    title: "AI Assistant, Practice Generator, Exam Generator, Study Mode, Recovery Mode, and Diagnostic Alpha",
    body: "When the AI Assistant, Practice Generator, Exam Generator, Study Mode, Recovery Mode, or Diagnostic Assessment is enabled, AI questions may be sent to the configured free AI provider through ARSHLAB's server route. AI conversations, generated practice questions, generated study sessions, generated recovery sessions, generated diagnostics, and generated exams are not saved in this alpha. Signed-in practice progress may save topic, subtopic, difficulty, question type, whether the user marked an answer correct, and timestamp.",
  },
  {
    title: "Study Progress Data",
    body: "Signed-in users may save XP, daily goal preference, selected curriculum, completed study sessions, completed exams, completed diagnostics, last and best diagnostic accuracy, achievement progress, topic mastery, concept mastery, curriculum unit progress, and mistake analytics derived from practice_progress rows. ARSHLAB uses this data to show adaptive recommendations, recovery sessions, placement summaries, curriculum dashboards, and progress dashboards.",
  },
  {
    title: "Structure Scanner Images",
    body: "The v6.1.0 Structure Scanner processes uploaded images and accepted camera snapshots locally in the browser. Perspective-normalized canvas detection, selected quadrilaterals, deskewed crops, glare-reduced variants, candidate-region generation, border suppression, bond-length scoring, multi-crop fallback, image variants, OCR, global shape reconstruction, reconstructed strokes, polygon hypotheses, candidate graph generation, global graph optimization, canonical graph hashes, ring-closure recovery, chemical graph validation, edge pruning, valence diagnostics, molecular graphs, evidence fusion, overlays, and optional overlay PNG export remain local. Original images, rejected crops, selected crops, normalized crops, OCR text, atom positions, reconstructed stroke data, graph hypotheses, optimizer moves, ring polygons, bridge events, graph geometry, rejected-bond diagnostics, and engine votes are not uploaded to ARSHLAB servers, Supabase, OpenRouter, or an external AI API. Images are not permanently stored or included in local scan history. Local history stores only match labels, source labels, confidence, functional-group labels, timestamps, and corrections.",
  },
  {
    title: "Optional Camera Capture",
    body: "Camera permission is optional and requested only after the user selects Camera Capture and presses the permission button. The camera is used only to preview and capture a single snapshot; ARSHLAB does not run live frame-by-frame recognition. Camera frames and accepted snapshots are processed locally in the browser, no live video or image is transmitted to ARSHLAB servers, and no snapshot is permanently stored unless the user explicitly exports an overlay PNG to their own device. Camera tracks are stopped when requested, after snapshot acceptance, when switching away, or when leaving the scanner.",
  },
  {
    title: "Curriculum Labels",
    body: "Curriculum labels describe study style and topic alignment. ARSHLAB does not claim official syllabus coverage, official placement, official exam prediction, or endorsement by any examination board or institution.",
  },
  {
    title: "Personal Data",
    body: "ARSHLAB does not sell personal data and does not knowingly collect sensitive personal information. Users may request deletion of their account or data by contacting the project owner.",
  },
  {
    title: "Third-Party Services",
    body: "Third-party services may include Supabase for authentication and Vercel for hosting, analytics, deployment, and infrastructure.",
  },
  {
    title: "Educational Content",
    body: "Educational content is provided as-is and may contain simplifications, approximations, or errors. Students should verify important answers independently.",
  },
]

export default function PrivacyPage() {
  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Privacy Policy</h1>
            <p className="text-muted-foreground">How ARSHLAB handles account and usage data.</p>
          </div>
        </div>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>ARSHLAB Privacy Policy</CardTitle>
            <p className="text-sm text-muted-foreground">Last updated: June 19, 2026</p>
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
                To request account or data deletion, contact the ARSHLAB project owner using the contact method
                provided on the creator page or project repository.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
