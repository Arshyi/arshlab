import Link from "next/link"
import { ArrowRight, Brain, Clock, GraduationCap, Network, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { CompoundIntelligence } from "@/lib/chemistry-intelligence/types"
import { getMechanismBridgeHref } from "@/lib/interactive-learning/mechanisms"
import {
  bridgeInputFromIntelligence,
  bridgeInputFromScannerRecord,
  getLearningBridgeLessons,
  getLearningExplanationCards,
  molecularExplorerLearningHref,
} from "@/lib/interactive-learning/learning-bridge"
import { scannerKnowledgeGraphHref } from "@/lib/knowledge-graph/knowledge-engine"
import type { StructureScanMatch } from "@/lib/structure-scanner/scanner-types"

interface ScannerLearningBridgeProps {
  match: StructureScanMatch
  intelligence: CompoundIntelligence | null
}

export function ScannerLearningBridge({ match, intelligence }: ScannerLearningBridgeProps) {
  const fallback = bridgeInputFromScannerRecord(match.record)
  const input = bridgeInputFromIntelligence(intelligence, fallback)
  const lessons = getLearningBridgeLessons(input)
  const cards = getLearningExplanationCards(input)
  const primaryLesson = lessons[0]
  const explorerHref = molecularExplorerLearningHref({ compound: input.id ?? input.name ?? match.record.id })
  const mechanismHref = getMechanismBridgeHref(input.id ?? match.record.id)
  const graphHref = scannerKnowledgeGraphHref(input.id ?? match.record.id)

  return (
    <Card className="rounded-2xl border-primary/20 bg-primary/5">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Brain className="h-5 w-5" />
              Learn why this result makes sense
            </CardTitle>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              ARSHLAB can turn the detected compound into deterministic orbital, conjugation,
              and bonding lessons without using AI.
            </p>
          </div>
          <Badge variant="outline" className="rounded-full">Scanner-to-learning bridge</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-xl border border-border bg-background/80 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">{primaryLesson.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{primaryLesson.reason}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild className="rounded-xl">
                <Link href={primaryLesson.href}>
                  Start lesson
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-xl">
                <Link href={explorerHref}>
                  Open Interactive Explorer
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-xl">
                <Link href={mechanismHref}>
                  Explore Possible Mechanisms
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-xl">
                <Link href={graphHref}>
                  Open Knowledge Graph
                  <Network className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="secondary" className="rounded-full">{primaryLesson.difficulty}</Badge>
            <Badge variant="outline" className="rounded-full">
              <Clock className="h-3 w-3" />
              {primaryLesson.estimatedTime}
            </Badge>
            {primaryLesson.outcomes.map((outcome) => (
              <Badge key={outcome} variant="outline" className="rounded-full">{outcome}</Badge>
            ))}
          </div>
        </div>

        {lessons.length > 1 && (
          <div>
            <p className="mb-2 text-sm font-medium">Next recommended lessons</p>
            <div className="grid gap-2 md:grid-cols-2">
              {lessons.slice(1).map((lesson) => (
                <Button key={lesson.id} asChild variant="outline" className="h-auto justify-between rounded-xl px-3 py-3 text-left">
                  <Link href={lesson.href}>
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{lesson.title}</span>
                      <span className="block text-xs text-muted-foreground">{lesson.estimatedTime} - {lesson.difficulty}</span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0" />
                  </Link>
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-3 lg:grid-cols-5">
          {cards.map((card) => (
            <Link
              key={card.id}
              href={card.href}
              className="rounded-xl border border-border bg-background/80 p-3 transition-colors hover:bg-secondary/60"
            >
              <p className="flex items-center gap-2 text-sm font-semibold">
                {card.id === "homo-lumo" ? <Sparkles className="h-4 w-4" /> : <GraduationCap className="h-4 w-4" />}
                {card.title}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{card.body}</p>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
