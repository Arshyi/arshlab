import Link from "next/link"
import {
  ArrowRight,
  BookOpenCheck,
  FileQuestion,
  FlaskConical,
  GraduationCap,
  Network,
  MousePointer2,
  Route,
  Sigma,
  Target,
  Waves,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { formulaHref } from "@/lib/formula-sheet"
import {
  curriculumTopicHref,
  mechanismHref,
  molecularVisualizerHref,
  reactionExplorerHref,
  reactionHref,
} from "@/lib/deep-links"
import { spectroscopyExplorerHref } from "@/lib/spectroscopy/spectroscopy-engine"
import { synthesisExplorerHref } from "@/lib/synthesis/pathfinder"
import { molecularExplorerHref } from "@/lib/interactive-learning/molecular-explorer"
import type { StructureScanMatch } from "@/lib/structure-scanner/scanner-types"

interface StructureMatchCardProps {
  match: StructureScanMatch
  primary?: boolean
}

function practiceHref(topic: string | undefined): string {
  return `/practice-generator?topic=${encodeURIComponent(topic ?? "Functional Group Identification")}&source=database`
}

function examHref(topic: string | undefined): string {
  return `/exam-generator?topic=${encodeURIComponent(topic ?? "Functional Group Identification")}&source=database`
}

export function StructureMatchCard({ match, primary = false }: StructureMatchCardProps) {
  const { record } = match
  const visualizerId = record.visualizerLinks[0] ?? record.id
  const curriculumLinks =
    record.recommendedCurriculumTopics ??
    (record.curriculumTopicId ? [{ id: record.curriculumTopicId, label: "Recommended curriculum topic" }] : [])

  return (
    <Card className={primary ? "rounded-2xl border-teal-500/30 bg-teal-500/5" : "rounded-2xl"}>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-xl">{primary ? "Detected Compound" : "Possible Match"}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {primary ? "Best local database match" : "Alternative local database match"}
            </p>
          </div>
          <Badge variant={primary ? "default" : "secondary"} className="rounded-full">
            {match.confidence}% confidence
          </Badge>
        </div>
        <Progress value={match.confidence} />
        <p className="text-sm leading-relaxed text-muted-foreground">
          {confidenceExplanation(match.confidence)} The fusion score combines independent OCR, atom-label, bond,
          ring, molecular-graph, functional-group, filename, and manual-hint votes.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <InfoTile label="Compound" value={record.name} />
          <InfoTile label="Formula" value={record.formula} />
          <InfoTile label="Difficulty" value={record.difficulty} />
        </div>

        <div>
          <p className="text-sm font-medium">Functional Groups</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {record.functionalGroups.map((group) => (
              <Badge key={group} variant="outline" className="rounded-full capitalize">
                {group}
              </Badge>
            ))}
          </div>
        </div>

        {match.reasons.length > 0 && (
          <div className="rounded-xl border border-border bg-background/80 p-4">
            <p className="text-sm font-medium">Why ARSHLAB matched this</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {match.reasons.map((reason) => (
                <li key={reason}>- {reason}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <RelatedList
            title="Related Reactions"
            empty="No specific reaction record linked yet."
            items={
              record.relatedReactions?.map((reaction) => ({
                label: reaction.label,
                href: reactionHref(reaction.id),
              })) ?? record.reactionGraphLinks.map((label) => ({ label, href: reactionExplorerHref(undefined, label) }))
            }
          />
          <RelatedList
            title="Related Mechanisms"
            empty="No specific mechanism linked yet."
            items={(record.relatedMechanisms ?? []).map((mechanism) => ({
              label: mechanism.label,
              href: mechanismHref(mechanism.id),
            }))}
          />
        </div>

        {curriculumLinks.length > 0 && (
          <div>
            <p className="text-sm font-medium">Recommended Curriculum Topic</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {curriculumLinks.map((topic) => (
                <Button key={topic.id} asChild variant="outline" size="sm" className="rounded-full">
                  <Link href={curriculumTopicHref(topic.id)}>{topic.label}</Link>
                </Button>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="text-sm font-medium">Knowledge Graph Links</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <ActionLink href={molecularVisualizerHref(visualizerId)} icon={Network} label="Open Molecular Visualizer" />
            <ActionLink href={molecularExplorerHref({ compound: record.id })} icon={MousePointer2} label="Open Interactive Explorer" />
            <ActionLink href={reactionExplorerHref(undefined, record.name)} icon={Sigma} label="Open Reaction Explorer" />
            <ActionLink href={synthesisExplorerHref(record.id)} icon={Route} label="Explore Synthesis" />
            <ActionLink href={spectroscopyExplorerHref({ compound: record.id })} icon={Waves} label="View Spectra" />
            <ActionLink href={practiceHref(record.practiceTopic)} icon={Target} label="Practice This" />
            <ActionLink href={examHref(record.examTopic)} icon={FileQuestion} label="Generate Exam Set" />
            <ActionLink href={formulaHref(record.formulaId ?? "organic-homologous-series")} icon={BookOpenCheck} label="Open Formula Sheet" />
            <ActionLink
              href={record.curriculumTopicId ? curriculumTopicHref(record.curriculumTopicId) : "/curriculum"}
              icon={GraduationCap}
              label="Open Curriculum Topic"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function confidenceExplanation(confidence: number): string {
  if (confidence >= 85) return "High confidence: several strong local clues agree."
  if (confidence >= 65) return "Moderate confidence: at least one strong clue matches, but alternatives remain."
  return "Tentative match: only limited clues agree; add or correct a name, formula, or functional group."
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/80 p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  )
}

function RelatedList({
  title,
  items,
  empty,
}: {
  title: string
  items: Array<{ label: string; href: string }>
  empty: string
}) {
  return (
    <div className="rounded-xl border border-border bg-background/80 p-4">
      <p className="flex items-center gap-2 text-sm font-medium">
        <FlaskConical className="h-4 w-4" />
        {title}
      </p>
      {items.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {items.slice(0, 4).map((item) => (
            <Button key={`${item.href}-${item.label}`} asChild variant="outline" size="sm" className="rounded-full">
              <Link href={item.href}>{item.label}</Link>
            </Button>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">{empty}</p>
      )}
    </div>
  )
}

function ActionLink({
  href,
  icon: Icon,
  label,
}: {
  href: string
  icon: React.ElementType
  label: string
}) {
  return (
    <Button asChild variant="outline" className="h-auto justify-between gap-3 rounded-xl px-3 py-3 text-left">
      <Link href={href}>
        <span className="flex min-w-0 items-center gap-2">
          <Icon className="h-4 w-4 shrink-0" />
          <span className="min-w-0 truncate">{label}</span>
        </span>
        <ArrowRight className="h-4 w-4 shrink-0" />
      </Link>
    </Button>
  )
}
