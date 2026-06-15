"use client"

import { useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowLeft, ArrowRight, CheckCircle2, FlaskConical, HelpCircle, XCircle } from "lucide-react"
import { Molecule2DRenderer } from "@/components/chemistry/Molecule2DRenderer"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { MechanismRecord } from "@/lib/chemistry/mechanism-types"
import { buildMechanismStepExercise, evaluateMechanismChoice, type MechanismChoiceFeedback } from "@/lib/mechanism-engine"

interface MechanismViewerProps {
  mechanism: MechanismRecord
}

const choiceLabels = ["A", "B", "C", "D"]

export function MechanismViewer({ mechanism }: MechanismViewerProps) {
  const [stepIndex, setStepIndex] = useState(0)
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<MechanismChoiceFeedback | null>(null)

  const step = mechanism.steps[stepIndex] ?? mechanism.steps[0]
  const exercise = useMemo(
    () => buildMechanismStepExercise(mechanism, stepIndex),
    [mechanism, stepIndex],
  )

  const displayStructure = useMemo(() => {
    if (!step) return null
    return {
      ...step.intermediateStructure,
      functionalGroupHighlights: [
        ...(step.intermediateStructure.functionalGroupHighlights ?? []),
        {
          id: "mechanism-step-highlight",
          group: "mechanism-step",
          label: "Electron-flow focus",
          atomIds: step.highlightAtoms,
          bondIds: step.highlightBonds,
          color: "#f97316",
          description: step.electronFlow,
        },
      ],
    }
  }, [step])

  function move(delta: number) {
    setStepIndex((current) => Math.max(0, Math.min(mechanism.steps.length - 1, current + delta)))
    setSelectedChoiceId(null)
    setFeedback(null)
  }

  function choose(choiceId: string) {
    setSelectedChoiceId(choiceId)
    setFeedback(evaluateMechanismChoice(mechanism.id, stepIndex, choiceId))
  }

  if (!step || !displayStructure) {
    return (
      <Card className="rounded-2xl border-dashed">
        <CardContent className="p-6 text-sm text-muted-foreground">Mechanism steps are not available.</CardContent>
      </Card>
    )
  }

  return (
    <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card className="min-w-0 overflow-hidden rounded-2xl border-teal-500/20 bg-teal-500/5">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FlaskConical className="h-5 w-5" />
                {step.title}
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
            </div>
            <div className="flex w-fit items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-1 text-sm font-semibold">
              <span className="text-muted-foreground">Step</span>
              <span>{stepIndex + 1}</span>
              <span className="text-muted-foreground">/</span>
              <span>{mechanism.steps.length}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <Molecule2DRenderer
                structure={displayStructure}
                highlightFunctionalGroup="mechanism-step"
                showAtomLabels
                className="bg-background/95"
              />
            </motion.div>
          </AnimatePresence>

          <div className="grid gap-3 md:grid-cols-3">
            <StepCard
              label="Current structure"
              body={step.description}
            />
            <StepCard
              label="Electron-flow cue"
              body={step.electronFlow}
              accent
            />
            <StepCard
              label="Why this matters"
              body={step.explanation}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Panel title="Reactants" items={mechanism.reactants} />
            <Panel title="Products" items={mechanism.products} />
          </div>

          <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-xl sm:w-auto"
              onClick={() => move(-1)}
              disabled={stepIndex === 0}
            >
              <ArrowLeft className="h-4 w-4" />
              Previous Step
            </Button>
            <Button
              type="button"
              className="w-full rounded-xl sm:w-auto"
              onClick={() => move(1)}
              disabled={stepIndex === mechanism.steps.length - 1}
            >
              Next Step
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <aside className="min-w-0 space-y-4">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <HelpCircle className="h-5 w-5" />
              Predict Next Step
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {exercise ? (
              <>
                <p className="text-sm text-muted-foreground">
                  From this mechanism step, choose the best next electron-flow action.
                </p>
                <div className="grid gap-2">
                  {exercise.choices.map((choice, index) => {
                    const selected = selectedChoiceId === choice.id
                    return (
                      <button
                        key={choice.id}
                        type="button"
                        onClick={() => choose(choice.id)}
                        className={`rounded-xl border px-3 py-3 text-left text-sm transition-colors ${
                          selected
                            ? choice.correct
                              ? "border-teal-500 bg-teal-500/10"
                              : "border-destructive bg-destructive/10"
                            : "border-border bg-secondary/20 hover:bg-secondary"
                        }`}
                      >
                        <span className="font-semibold">{choiceLabels[index]}.</span> {choice.label}
                      </button>
                    )
                  })}
                </div>
                {feedback && (
                  <div
                    className={`space-y-3 rounded-xl border p-3 text-sm ${
                      feedback.correct
                        ? "border-teal-500/30 bg-teal-500/10 text-teal-900 dark:text-teal-100"
                        : "border-destructive/30 bg-destructive/10"
                    }`}
                  >
                    <div className="mb-1 flex items-center gap-2 font-medium">
                      {feedback.correct ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                      {feedback.correct ? "Correct next step" : "Not this step"}
                    </div>
                    <div className="rounded-lg bg-background/75 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Your choice: {feedback.selectedLabel}
                      </p>
                      <p className="mt-1 leading-relaxed">{feedback.selectedExplanation}</p>
                    </div>
                    {!feedback.correct ? (
                      <div className="rounded-lg bg-background/75 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Best move: {feedback.correctLabel}
                        </p>
                        <p className="mt-1 leading-relaxed">{feedback.correctExplanation}</p>
                      </div>
                    ) : null}
                    {feedback.distractorExplanations.length > 0 ? (
                      <div className="rounded-lg bg-background/75 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Why the distractors miss
                        </p>
                        <div className="mt-2 space-y-2">
                          {feedback.distractorExplanations.map((item) => (
                            <p key={item.label} className="leading-relaxed text-muted-foreground">
                              <span className="font-medium text-foreground">{item.label}:</span> {item.explanation}
                            </p>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                This is the final step. Review the full pathway or choose another mechanism.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg">Mechanism Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Info label="Category" value={mechanism.category} />
            <Info label="Difficulty" value={mechanism.difficulty} />
            <Info label="Reagents" value={mechanism.reagents.join(", ")} />
            <Info label="Conditions" value={mechanism.conditions ?? "No special conditions listed"} />
          </CardContent>
        </Card>
      </aside>
    </div>
  )
}

function StepCard({ label, body, accent = false }: { label: string; body: string; accent?: boolean }) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        accent ? "border-orange-500/30 bg-orange-500/10" : "border-border bg-background/80"
      }`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  )
}

function Panel({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-border bg-background/80 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map((item) => (
          <Badge key={item} variant="outline" className="rounded-full">
            {item}
          </Badge>
        ))}
      </div>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/20 px-3 py-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 break-words">{value}</p>
    </div>
  )
}
