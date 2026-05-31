"use client"

import { motion } from "framer-motion"
import { FileText, Download, Video, AlertCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useState, useMemo } from "react"
import { cn } from "@/lib/utils"
import {
  PAST_PAPERS,
  PAST_PAPER_SUBJECTS,
  PAST_PAPER_DIFFICULTIES,
  PAST_PAPER_LEVELS,
  filterPastPapers,
  type PaperSubject,
  type PaperDifficulty,
  type EducationalLevel,
} from "@/data/pastPapers"

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
      )}
    >
      {children}
    </button>
  )
}

const difficultyColors: Record<PaperDifficulty, string> = {
  Introductory: "bg-green-500/10 text-green-600 border-green-500/20",
  Intermediate: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  Advanced: "bg-red-500/10 text-red-600 border-red-500/20",
}

export default function PastPapersPage() {
  const [subject, setSubject] = useState<PaperSubject | "All">("All")
  const [difficulty, setDifficulty] = useState<PaperDifficulty | "All">("All")
  const [level, setLevel] = useState<EducationalLevel | "All">("All")

  const filtered = useMemo(
    () => filterPastPapers({ subject, difficulty, level }),
    [subject, difficulty, level]
  )

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Practice Papers</h1>
              <p className="text-muted-foreground">
                Original educational resources designed to promote understanding rather than
                memorization.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Important Notice */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Card className="rounded-2xl mb-6 border-accent/30 bg-accent/5">
            <CardContent className="flex items-start gap-3 p-5">
              <AlertCircle className="h-5 w-5 text-accent shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground leading-relaxed">
                Practice materials hosted here are independently created educational resources and
                are not official examination papers.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="rounded-2xl mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Subject</p>
                <div className="flex flex-wrap gap-2">
                  <FilterButton active={subject === "All"} onClick={() => setSubject("All")}>
                    All
                  </FilterButton>
                  {PAST_PAPER_SUBJECTS.map((s) => (
                    <FilterButton key={s} active={subject === s} onClick={() => setSubject(s)}>
                      {s}
                    </FilterButton>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Difficulty</p>
                <div className="flex flex-wrap gap-2">
                  <FilterButton
                    active={difficulty === "All"}
                    onClick={() => setDifficulty("All")}
                  >
                    All
                  </FilterButton>
                  {PAST_PAPER_DIFFICULTIES.map((d) => (
                    <FilterButton
                      key={d}
                      active={difficulty === d}
                      onClick={() => setDifficulty(d)}
                    >
                      {d}
                    </FilterButton>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Educational Level</p>
                <div className="flex flex-wrap gap-2">
                  <FilterButton active={level === "All"} onClick={() => setLevel("All")}>
                    All
                  </FilterButton>
                  {PAST_PAPER_LEVELS.map((l) => (
                    <FilterButton key={l} active={level === l} onClick={() => setLevel(l)}>
                      {l}
                    </FilterButton>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Paper Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {filtered.map((paper, i) => (
            <motion.div
              key={paper.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
            >
              <Card className="h-full rounded-2xl border-border/50 bg-card/80 backdrop-blur-sm transition-all hover:shadow-lg hover:border-accent/30">
                <CardContent className="p-5 flex flex-col h-full">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="font-semibold text-foreground leading-snug">{paper.title}</h3>
                    {paper.videoSolutionAvailable && (
                      <Badge variant="outline" className="shrink-0 gap-1 text-xs">
                        <Video className="h-3 w-3" />
                        Video
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge variant="secondary">{paper.subject}</Badge>
                    <Badge variant="outline" className={difficultyColors[paper.difficulty]}>
                      {paper.difficulty}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-4 flex-1">
                    {paper.topics.map((topic) => (
                      <span
                        key={topic}
                        className="text-xs rounded-md bg-secondary/50 px-2 py-0.5 text-muted-foreground"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-border">
                    <span className="text-xs text-muted-foreground">{paper.date}</span>
                    <Button size="sm" variant="outline" className="rounded-lg gap-1.5" disabled>
                      <Download className="h-3.5 w-3.5" />
                      Download PDF
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-12">
            No practice papers match the selected filters.
          </p>
        )}

        <p className="text-center text-xs text-muted-foreground mt-8">
          {PAST_PAPERS.length} practice sets catalogued · PDF uploads coming soon
        </p>
      </div>
    </div>
  )
}
