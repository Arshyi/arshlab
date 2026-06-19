"use client"

import { type ChangeEvent, useEffect, useMemo, useState } from "react"
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Database,
  FileSearch,
  Loader2,
  PencilLine,
  ScanSearch,
  Search,
  Sparkles,
  Upload,
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { scanStructure } from "@/lib/structure-scanner/scanner-engine"
import { getStructureScannerMetrics } from "@/lib/structure-scanner/scanner-database"
import {
  formatStructureScanTimestamp,
  correctStructureScan,
  getStructureScanStats,
  isAllowedStructureImage,
  readStructureScanHistory,
  recordStructureScan,
} from "@/lib/structure-scanner/scanner-utils"
import type { StructureScanHistoryEntry, StructureScanResult } from "@/lib/structure-scanner/scanner-types"
import { StructureMatchCard } from "./StructureMatchCard"
import { StructurePreview } from "./StructurePreview"

const QUICK_HINTS = ["ethanol", "benzene", "aspirin", "acetone", "ethene", "ethanoic acid", "sodium chloride"]

export function StructureScanner() {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [moleculeName, setMoleculeName] = useState("")
  const [formula, setFormula] = useState("")
  const [functionalGroupHint, setFunctionalGroupHint] = useState("")
  const [condensedFormula, setCondensedFormula] = useState("")
  const [result, setResult] = useState<StructureScanResult | null>(null)
  const [history, setHistory] = useState<StructureScanHistoryEntry[]>([])
  const [error, setError] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null)
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)

  const metrics = useMemo(() => getStructureScannerMetrics(), [])
  const stats = useMemo(() => getStructureScanStats(history), [history])

  useEffect(() => {
    setHistory(readStructureScanHistory())
  }, [])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null
    setError(null)

    if (!selected) return
    if (!isAllowedStructureImage(selected)) {
      setError("Please upload a PNG, JPG, JPEG, or WEBP image.")
      event.target.value = ""
      return
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(selected)
    setPreviewUrl(URL.createObjectURL(selected))
    setResult(null)
    setCurrentHistoryId(null)
    setFeedbackMessage(null)
  }

  function clearFile() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(null)
    setPreviewUrl(null)
    setResult(null)
    setCurrentHistoryId(null)
    setFeedbackMessage(null)
  }

  function applyQuickHint(value: string) {
    setMoleculeName(value)
    setError(null)
  }

  function runScan() {
    if (!file) {
      setError("Upload a structure image before scanning. Live camera input is not enabled in v5.0.")
      return
    }

    setScanning(true)
    setError(null)
    setCurrentHistoryId(null)
    setFeedbackMessage(null)

    window.setTimeout(() => {
      const nextResult = scanStructure({
        moleculeName,
        formula,
        functionalGroupHint,
        condensedFormula,
        fileName: file?.name,
      })
      setResult(nextResult)
      if (nextResult.bestMatch) {
        const nextHistory = recordStructureScan(nextResult.bestMatch)
        setHistory(nextHistory)
        setCurrentHistoryId(nextHistory[0]?.id ?? null)
      }
      setScanning(false)
    }, 250)
  }

  function saveCorrection() {
    if (!currentHistoryId) return
    const nextHistory = correctStructureScan(currentHistoryId, {
      compoundName: moleculeName,
      formula,
      functionalGroupHint,
      condensedFormula,
    })
    setHistory(nextHistory)
    setFeedbackMessage("Correction saved only in this browser. The uploaded image was not stored.")
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <StructurePreview previewUrl={previewUrl} fileName={file?.name ?? null} onClear={file ? clearFile : undefined} />

          <Card className="rounded-2xl border-teal-500/20 bg-teal-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileSearch className="h-5 w-5" />
                Optional Text Extraction
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Badge variant="outline" className="rounded-full">Placeholder - no image text is transmitted</Badge>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Automated text extraction is not enabled in v5.0. ARSHLAB currently uses the local filename and the manual correction fields below.
              </p>
              {file && !moleculeName.trim() && !formula.trim() && !condensedFormula.trim() && (
                <Alert className="rounded-xl border-amber-500/30 bg-amber-500/10">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No readable formula/name detected. Add a hint to improve matching.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Upload className="h-5 w-5" />
                Upload and Manual Corrections
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="structure-image">Structure image</Label>
                <Input id="structure-image" type="file" accept="image/png,image/jpeg,image/jpg,image/webp" onChange={handleFileChange} />
                <p className="text-xs text-muted-foreground">
                  Upload-only workflow. The image remains local and matching uses deterministic database clues.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="molecule-name">Molecule name</Label>
                  <Input
                    id="molecule-name"
                    value={moleculeName}
                    onChange={(event) => setMoleculeName(event.target.value)}
                    placeholder="ethanol, benzene, aspirin"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="molecule-formula">Formula</Label>
                  <Input
                    id="molecule-formula"
                    value={formula}
                    onChange={(event) => setFormula(event.target.value)}
                    placeholder="C2H5OH, C6H6, NaCl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="condensed-formula">Condensed formula</Label>
                  <Input
                    id="condensed-formula"
                    value={condensedFormula}
                    onChange={(event) => setCondensedFormula(event.target.value)}
                    placeholder="CH3CH2OH, CH3COOH"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="functional-group-hint">Functional group hint</Label>
                  <Input
                    id="functional-group-hint"
                    value={functionalGroupHint}
                    onChange={(event) => setFunctionalGroupHint(event.target.value)}
                    placeholder="alcohol, carbonyl, ester, alkene, arene"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {QUICK_HINTS.map((hint) => (
                  <Button key={hint} type="button" variant="outline" size="sm" className="rounded-full" onClick={() => applyQuickHint(hint)}>
                    {hint}
                  </Button>
                ))}
              </div>

              {error && (
                <Alert className="rounded-xl border-amber-500/30 bg-amber-500/10">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Scanner needs one more clue</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="button" onClick={runScan} disabled={scanning || !file} className="w-full rounded-xl">
                {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanSearch className="h-4 w-4" />}
                {scanning ? "Scanning local records..." : "Scan Local Database"}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="rounded-2xl border-teal-500/20 bg-teal-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Database className="h-5 w-5" />
                Scanner Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Badge variant="outline" className="rounded-full">
                Scanner mode = local chemistry database
              </Badge>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <Metric label="Local scans" value={stats.totalScans} />
                <Metric label="Corrected scans" value={stats.correctedScans} />
                <Metric label="Compounds" value={metrics.compounds} />
                <Metric label="Functional group families" value={metrics.functionalGroups} />
                <Metric label="Visualizer links" value={metrics.visualizerLinks} />
                <Metric label="Reaction graph links" value={metrics.reactionGraphLinks} />
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                This upgrade estimates likely structure matches from local chemistry records and user-provided clues. It does not call AI, OCR, or external chemistry APIs.
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5" />
                Recent Scan History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.recent.length > 0 ? (
                <div className="space-y-3">
                  {stats.recent.map((entry) => (
                    <div key={entry.id} className="rounded-xl border border-border p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium">{entry.name}</p>
                        <div className="flex items-center gap-2">
                          {entry.corrected && <Badge className="rounded-full">Corrected</Badge>}
                          <Badge variant="secondary" className="rounded-full">{entry.confidence}%</Badge>
                        </div>
                      </div>
                      <p className="mt-1 font-mono text-sm text-muted-foreground">{entry.formula}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{formatStructureScanTimestamp(entry.timestamp)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Your local scans and corrected labels will appear here. History stays in this browser.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {result && (
        <div className="space-y-4" id="scanner-results">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Scan Results</h2>
              <p className="text-sm text-muted-foreground">{result.message}</p>
            </div>
            <Badge variant="outline" className="rounded-full">
              {result.matches.length} local matches
            </Badge>
          </div>

          {result.bestMatch && currentHistoryId && (
            <Card className="rounded-2xl border-dashed">
              <CardContent className="grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                <div>
                  <p className="flex items-center gap-2 font-semibold">
                    <PencilLine className="h-4 w-4" />
                    Help your local history stay accurate
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    Edit the manual fields above, then save your corrected label. Feedback remains in this browser and does not upload the image.
                  </p>
                  {feedbackMessage && (
                    <p className="mt-2 flex items-center gap-2 text-sm text-teal-700 dark:text-teal-300">
                      <CheckCircle2 className="h-4 w-4" />
                      {feedbackMessage}
                    </p>
                  )}
                </div>
                <Button type="button" variant="outline" className="rounded-xl" onClick={saveCorrection}>
                  <PencilLine className="h-4 w-4" />
                  I corrected this result
                </Button>
              </CardContent>
            </Card>
          )}

          {result.bestMatch ? (
            <div className="space-y-4">
              <StructureMatchCard match={result.bestMatch} primary />
              {result.matches.length > 1 && (
                <div className="grid gap-4 lg:grid-cols-2">
                  {result.matches.slice(1).map((match) => (
                    <StructureMatchCard key={match.record.id} match={match} />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <Card className="rounded-2xl border-dashed">
              <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                <Search className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="font-semibold">No local match found</p>
                  <p className="mt-1 max-w-lg text-sm text-muted-foreground">
                    Try adding a formula, common name, or functional-group hint like alcohol, carbonyl, ester, alkene, arene, or haloalkane.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Card className="rounded-2xl border-primary/20 bg-primary/5">
        <CardContent className="grid gap-4 p-5 md:grid-cols-[auto_minmax(0,1fr)]">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold">What this scanner is good for</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Use it as a study bridge: upload a structure, add any clues you recognize, confirm or correct the likely compound, then jump into visualizer views, reaction pathways, spectra, formulas, curriculum topics, and database-only practice.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-background/80 p-3">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  )
}
