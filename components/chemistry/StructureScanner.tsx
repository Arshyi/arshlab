"use client"

import { type ChangeEvent, useEffect, useMemo, useState } from "react"
import {
  AlertCircle,
  Camera,
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
import { Progress } from "@/components/ui/progress"
import { recognizeChemistryImage, type ChemistryOCRResult, type OCRProgressUpdate } from "@/lib/ocr/ocr-engine"
import { analyzeStructureImage, analyzeStructureSceneVariants } from "@/lib/structure-vision/vision-engine"
import { isolateStructureImage, selectStructureIsolationCandidate } from "@/lib/structure-vision/structure-isolation"
import type {
  IsolationCandidateEvaluation,
  StructureIsolationCandidate,
  StructureIsolationResult,
} from "@/lib/structure-vision/isolation-types"
import type { StructureVisionAnalysis } from "@/lib/structure-vision/vision-types"
import { scanStructure } from "@/lib/structure-scanner/scanner-engine"
import { getStructureScannerMetrics } from "@/lib/structure-scanner/scanner-database"
import {
  formatStructureScanTimestamp,
  correctStructureScan,
  getStructureScanStats,
  isAllowedStructureImage,
  readStructureScanHistory,
  recordStructureOCRScan,
  recordStructureScan,
} from "@/lib/structure-scanner/scanner-utils"
import type {
  StructureScanHistoryEntry,
  StructureScanResult,
  StructureScanSource,
} from "@/lib/structure-scanner/scanner-types"
import { StructureMatchCard } from "./StructureMatchCard"
import { OCRDebugPanel } from "./OCRDebugPanel"
import { StructurePreview } from "./StructurePreview"
import { VisionDebugPanel } from "./VisionDebugPanel"
import { MolecularGraphDebugPanel } from "./MolecularGraphDebugPanel"
import { VisualOverlayDebugger } from "./VisualOverlayDebugger"
import { CameraCapture } from "./CameraCapture"
import { StructureIsolationDebugPanel } from "./StructureIsolationDebugPanel"
import { EvidenceFusionDebugPanel } from "./EvidenceFusionDebugPanel"

type ScannerInputMode = "upload" | "camera"

const QUICK_HINTS = ["ethanol", "benzene", "aspirin", "acetone", "ethene", "ethanoic acid", "sodium chloride"]

function clampScore(value: number): number {
  return Math.round(Math.min(98, Math.max(0, Number.isFinite(value) ? value : 0)))
}

function buildCandidateEvaluation(
  candidate: StructureIsolationCandidate,
  variantId: string,
  ocr: ChemistryOCRResult | null,
  vision: StructureVisionAnalysis,
): IsolationCandidateEvaluation {
  const ringConfidence = Math.max(
    vision.graph.bestRingConfidence,
    ...vision.molecularGraph.rings.map((ring) => ring.confidence),
    0,
  )
  const atomLabelCount = ocr?.atomLabels.length ?? 0
  const graphConfidence = vision.molecularGraph.estimates.confidence
  const aromaticBonus = vision.molecularGraph.aromatic || vision.graph.aromaticCueScore >= 50 ? 8 : 0
  const suppressionPenalty =
    (candidate.rectangularFrameDetected ? 38 : 0) +
    (candidate.suppressionReasons.some((reason) => reason.includes("image border")) ? 10 : 0) +
    (candidate.suppressionReasons.some((reason) => reason.includes("Bond-length scale")) ? 12 : 0)
  const chemistryEvidenceScore = clampScore(
    candidate.score * 0.18 +
    Math.min(18, atomLabelCount * 4) +
    (ocr?.parsed.chemistryConfidence ?? 0) * 0.08 +
    graphConfidence * 0.38 +
    vision.visualConfidence * 0.18 +
    ringConfidence * 0.18 +
    aromaticBonus -
    suppressionPenalty,
  )
  const reasoning: string[] = []
  if (atomLabelCount > 0) reasoning.push(`High atom density: ${atomLabelCount} positioned chemistry labels`)
  if (vision.lineSegments.length > 0) reasoning.push(`${vision.lineSegments.length} bond segments survived crop isolation`)
  if (vision.parallelLinePairs > 0) reasoning.push("Parallel bond evidence detected")
  if (ringConfidence >= 45) reasoning.push(`Ring geometry present at ${Math.round(ringConfidence)}%`)
  if (vision.graph.aromaticCueScore >= 45) reasoning.push("Aromatic cues survived isolation")
  if (candidate.bondLengthRegularity >= 60) reasoning.push(`Bond-length regularity ${candidate.bondLengthRegularity}%`)
  reasoning.push(...candidate.suppressionReasons.map((reason) => `Suppressed: ${reason}`))
  return {
    candidateId: candidate.id,
    variantId,
    ocrAtomLabelCount: atomLabelCount,
    ocrConfidence: ocr?.ocrConfidence ?? 0,
    graphConfidence,
    visualConfidence: vision.visualConfidence,
    ringConfidence: Math.round(ringConfidence),
    chemistryEvidenceScore,
    selected: false,
    reasoning,
  }
}

export function StructureScanner() {
  const [file, setFile] = useState<File | null>(null)
  const [inputMode, setInputMode] = useState<ScannerInputMode>("upload")
  const [scanSource, setScanSource] = useState<ScannerInputMode>("upload")
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [processedImage, setProcessedImage] = useState<Blob | null>(null)
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
  const [ocrResult, setOCRResult] = useState<ChemistryOCRResult | null>(null)
  const [ocrProgress, setOCRProgress] = useState<OCRProgressUpdate | null>(null)
  const [ocrError, setOCRError] = useState<string | null>(null)
  const [visionAnalysis, setVisionAnalysis] = useState<StructureVisionAnalysis | null>(null)
  const [visionError, setVisionError] = useState<string | null>(null)
  const [isolationResult, setIsolationResult] = useState<StructureIsolationResult | null>(null)
  const [isolationError, setIsolationError] = useState<string | null>(null)
  const [ocrMetricsRevision, setOCRMetricsRevision] = useState(0)

  const metrics = useMemo(() => getStructureScannerMetrics(), [])
  const stats = useMemo(() => getStructureScanStats(history), [history, ocrMetricsRevision])

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
    if (!selectImageFile(selected, "upload")) event.target.value = ""
  }

  function selectImageFile(selected: File, source: ScannerInputMode): boolean {
    if (!isAllowedStructureImage(selected)) {
      setError("Please upload a PNG, JPG, JPEG, or WEBP image.")
      return false
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(selected)
    setScanSource(source)
    setPreviewUrl(URL.createObjectURL(selected))
    setResult(null)
    setProcessedImage(null)
    setOCRResult(null)
    setOCRProgress(null)
    setOCRError(null)
    setVisionAnalysis(null)
    setVisionError(null)
    setIsolationResult(null)
    setIsolationError(null)
    setCurrentHistoryId(null)
    setFeedbackMessage(null)
    return true
  }

  function clearFile() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(null)
    setScanSource("upload")
    setPreviewUrl(null)
    setProcessedImage(null)
    setResult(null)
    setOCRResult(null)
    setOCRProgress(null)
    setOCRError(null)
    setVisionAnalysis(null)
    setVisionError(null)
    setIsolationResult(null)
    setIsolationError(null)
    setCurrentHistoryId(null)
    setFeedbackMessage(null)
  }

  function applyQuickHint(value: string) {
    setMoleculeName(value)
    setError(null)
  }

  async function runScan() {
    if (!file) {
      setError("Upload an image or accept a camera snapshot before scanning.")
      return
    }

    setScanning(true)
    setError(null)
    setCurrentHistoryId(null)
    setFeedbackMessage(null)
    setOCRError(null)
    setVisionError(null)
    setIsolationError(null)
    setIsolationResult(null)
    setOCRProgress({ status: "Isolating chemistry drawing", progress: 0 })

    let scanImage: Blob = processedImage ?? file
    let nextIsolationResult: StructureIsolationResult | null = null
    try {
      nextIsolationResult = await isolateStructureImage(scanImage)
      scanImage = nextIsolationResult.isolatedBlob
    } catch (isolationFailure) {
      const message = isolationFailure instanceof Error ? isolationFailure.message : "Local structure isolation could not start."
      setIsolationError(message)
    }

    let nextOCRResult: ChemistryOCRResult | null = null
    let fallbackVision: StructureVisionAnalysis | null = null
    if (nextIsolationResult?.analysis.requiresMultiCropFallback) {
      const probes: Array<{
        evaluation: IsolationCandidateEvaluation
        ocr: ChemistryOCRResult | null
        vision: StructureVisionAnalysis
      }> = []
      const candidates = nextIsolationResult.analysis.candidates.slice(0, 3)
      for (let index = 0; index < candidates.length; index += 1) {
        const candidate = candidates[index]
        const variant = nextIsolationResult.variants.find((item) => item.candidateId === candidate.id && item.kind === "original")
        if (!variant) continue
        let candidateOCR: ChemistryOCRResult | null = null
        try {
          candidateOCR = await recognizeChemistryImage(variant.blob, (progress) => setOCRProgress({
            status: `Comparing crop ${index + 1}/${candidates.length}: ${progress.status}`,
            progress: (index + progress.progress) / Math.max(1, candidates.length),
          }))
        } catch {
          candidateOCR = null
        }
        const candidateVision = await analyzeStructureImage(variant.blob, {
          recognizedText: [
            candidateOCR?.rawText,
            moleculeName,
            formula,
            condensedFormula,
            functionalGroupHint,
            file.name,
          ].filter(Boolean).join(" "),
          atomLabels: candidateOCR?.atomLabels,
        })
        probes.push({
          evaluation: buildCandidateEvaluation(candidate, variant.id, candidateOCR, candidateVision),
          ocr: candidateOCR,
          vision: candidateVision,
        })
      }
      if (probes.length > 0) {
        nextIsolationResult = selectStructureIsolationCandidate(nextIsolationResult, probes.map((probe) => probe.evaluation))
        const selectedProbe = probes.find((probe) => probe.evaluation.candidateId === nextIsolationResult?.analysis.selectedCandidateId)
        nextOCRResult = selectedProbe?.ocr ?? null
        fallbackVision = selectedProbe?.vision ?? null
        scanImage = nextIsolationResult.isolatedBlob
      }
    }
    setIsolationResult(nextIsolationResult)

    if (!nextOCRResult) {
      setOCRProgress({ status: "Preparing local OCR", progress: 0 })
      try {
        nextOCRResult = await recognizeChemistryImage(scanImage, setOCRProgress)
      } catch (ocrFailure) {
        const message = ocrFailure instanceof Error ? ocrFailure.message : "Local OCR could not start."
        setOCRError(message)
        nextOCRResult = null
      }
    }
    setOCRResult(nextOCRResult)

    let nextVisionAnalysis: StructureVisionAnalysis | null = null
    try {
      const visionOptions = {
        recognizedText: [
          nextOCRResult?.rawText,
          moleculeName,
          formula,
          condensedFormula,
          functionalGroupHint,
          file.name,
        ].filter(Boolean).join(" "),
        atomLabels: nextOCRResult?.atomLabels,
      }
      const selectedCandidateId = nextIsolationResult?.analysis.selectedCandidateId ??
        nextIsolationResult?.analysis.candidates.find((candidate) => candidate.selected)?.id
      const selectedVariants = nextIsolationResult?.variants.filter((variant) => variant.candidateId === selectedCandidateId) ?? []
      nextVisionAnalysis = selectedVariants.length
        ? await analyzeStructureSceneVariants(selectedVariants, {
          ...visionOptions,
          primaryCandidateId: selectedCandidateId,
        })
        : fallbackVision ?? await analyzeStructureImage(scanImage, visionOptions)
      setVisionAnalysis(nextVisionAnalysis)
      if (nextIsolationResult && selectedCandidateId !== undefined) {
        const selectedCandidate = nextIsolationResult.analysis.candidates.find((candidate) => candidate.id === selectedCandidateId)
        if (selectedCandidate) {
          const selectedVariantId = nextVisionAnalysis.selectedSceneVariantId ?? nextIsolationResult.primaryVariantId
          const finalEvaluation = {
            ...buildCandidateEvaluation(selectedCandidate, selectedVariantId, nextOCRResult, nextVisionAnalysis),
            selected: true,
          }
          nextIsolationResult = {
            ...nextIsolationResult,
            candidateEvaluations: [
              ...nextIsolationResult.candidateEvaluations.filter((evaluation) => evaluation.candidateId !== selectedCandidateId),
              finalEvaluation,
            ],
          }
          setIsolationResult(nextIsolationResult)
        }
      }
    } catch (visionFailure) {
      const message = visionFailure instanceof Error ? visionFailure.message : "Local shape detection could not start."
      setVisionError(message)
      setVisionAnalysis(null)
    }

    try {
      const parsed = nextOCRResult?.parsed
      const nextResult = scanStructure({
        moleculeName: moleculeName.trim() || parsed?.detectedName || undefined,
        formula: formula.trim() || parsed?.detectedFormula || undefined,
        functionalGroupHint,
        condensedFormula: condensedFormula.trim() || parsed?.detectedCondensedFormula || undefined,
        fileName: file?.name,
        ocrCompoundIds: parsed?.matchedCompoundIds,
        ocrFormulaCompoundIds: parsed?.tokens
          .filter((token) => token.type === "molecular-formula" || token.type === "condensed-formula")
          .flatMap((token) => token.matchedCompoundIds),
        ocrNameCompoundIds: parsed?.tokens
          .filter((token) => token.type === "chemical-name")
          .flatMap((token) => token.matchedCompoundIds),
        ocrAtomLabels: parsed?.atomLabels,
        ocrText: parsed?.cleanedText,
        ocrQuality: nextOCRResult?.ocrConfidence,
        ocrChemistryConfidence: parsed?.chemistryConfidence,
        ocrNoisePenalty: parsed?.chemistryScores.noisePenalty,
        ocrFormulaCorrected: parsed?.detectedFormulaWasCorrected,
        visualAnalysis: nextVisionAnalysis ?? undefined,
        manualHints: {
          moleculeName: moleculeName.trim() || undefined,
          formula: formula.trim() || undefined,
          condensedFormula: condensedFormula.trim() || undefined,
          functionalGroupHint: functionalGroupHint.trim() || undefined,
        },
      })
      setResult(nextResult)
      let historyEntryId: string | undefined
      const ocrMatched = Boolean(
        nextResult.isConfident &&
        nextResult.bestMatch &&
        parsed?.matchedCompoundIds.includes(nextResult.bestMatch.record.id),
      )
      if (nextResult.bestMatch && nextResult.isConfident) {
        const visualMatched = nextResult.bestMatch.contributions.some((contribution) =>
          contribution.category === "visual" || contribution.category === "ring" || contribution.category === "graph",
        )
        const nextHistory = recordStructureScan(nextResult.bestMatch, {
          source: scanSource,
          visualMatched,
        })
        setHistory(nextHistory)
        historyEntryId = nextHistory[0]?.id
        setCurrentHistoryId(historyEntryId ?? null)
      }
      recordStructureOCRScan(ocrMatched ? nextResult.bestMatch : null, ocrMatched ? historyEntryId : undefined)
      setOCRMetricsRevision((revision) => revision + 1)
    } finally {
      setScanning(false)
      setOCRProgress(null)
    }
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
          <StructurePreview
            previewUrl={previewUrl}
            fileName={file?.name ?? null}
            onClear={file ? clearFile : undefined}
            onProcessedImageChange={setProcessedImage}
          />

          <StructureIsolationDebugPanel
            sourceBlob={processedImage ?? file}
            result={isolationResult}
            error={isolationError}
          />

          <Card className="rounded-2xl border-teal-500/20 bg-teal-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileSearch className="h-5 w-5" />
                Local OCR Extraction
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Badge variant="outline" className="rounded-full">Tesseract.js - browser-side OCR</Badge>
              <p className="text-sm leading-relaxed text-muted-foreground">
                OCR receives only the locally isolated drawing crop. The first scan may download OCR engine and English language assets, but your chemistry image is not uploaded.
              </p>
              {scanning && ocrProgress && (
                <div className="space-y-2 rounded-xl border border-border bg-background/80 p-4">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="capitalize">{ocrProgress.status}</span>
                    <span className="font-mono">{Math.round(ocrProgress.progress * 100)}%</span>
                  </div>
                  <Progress value={ocrProgress.progress * 100} />
                </div>
              )}
              {ocrResult && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <OCRValue label="Detected Formula" value={ocrResult.parsed.detectedFormula ?? ocrResult.parsed.detectedCondensedFormula ?? "None"} />
                  <OCRValue label="Detected Name" value={ocrResult.parsed.detectedName ?? "None"} />
                  <OCRValue label="OCR Confidence" value={`${ocrResult.ocrConfidence}%`} />
                  <OCRValue label="Chemistry Confidence" value={`${ocrResult.parsed.chemistryConfidence}%`} />
                </div>
              )}
              {ocrError && (
                <Alert className="rounded-xl border-amber-500/30 bg-amber-500/10">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Local OCR unavailable</AlertTitle>
                  <AlertDescription>{ocrError} Manual matching remains available.</AlertDescription>
                </Alert>
              )}
              {file && ocrResult && ocrResult.parsed.tokens.length === 0 && (
                <Alert className="rounded-xl border-amber-500/30 bg-amber-500/10">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No readable formula/name detected. Add a hint to improve matching.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <OCRDebugPanel
            ocrResult={ocrResult}
            match={result?.bestMatch ?? null}
            matches={result?.matches ?? []}
            error={ocrError}
          />

          <VisionDebugPanel analysis={visionAnalysis} error={visionError} />

          <MolecularGraphDebugPanel analysis={visionAnalysis} />

          <EvidenceFusionDebugPanel fusion={result?.evidenceFusion ?? null} />

          <VisualOverlayDebugger
            imageBlob={
              isolationResult?.variants.find((variant) => variant.id === visionAnalysis?.selectedSceneVariantId)?.blob ??
              isolationResult?.isolatedBlob ?? processedImage ?? file
            }
            analysis={visionAnalysis}
            result={result}
          />

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Upload className="h-5 w-5" />
                Image Input and Manual Corrections
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-4">
                <div className="inline-flex w-full rounded-xl border border-border bg-secondary/40 p-1 sm:w-auto" role="tablist" aria-label="Structure image input mode">
                  <Button
                    type="button"
                    role="tab"
                    aria-selected={inputMode === "upload"}
                    variant={inputMode === "upload" ? "default" : "ghost"}
                    className="flex-1 rounded-lg sm:flex-none"
                    onClick={() => setInputMode("upload")}
                  >
                    <Upload className="h-4 w-4" />
                    Upload Image
                  </Button>
                  <Button
                    type="button"
                    role="tab"
                    aria-selected={inputMode === "camera"}
                    variant={inputMode === "camera" ? "default" : "ghost"}
                    className="flex-1 rounded-lg sm:flex-none"
                    onClick={() => setInputMode("camera")}
                  >
                    <Camera className="h-4 w-4" />
                    Camera Capture
                  </Button>
                </div>

                {inputMode === "upload" ? (
                  <div className="space-y-2">
                    <Label htmlFor="structure-image">Structure image</Label>
                    <Input id="structure-image" type="file" accept="image/png,image/jpeg,image/jpg,image/webp" onChange={handleFileChange} />
                    <p className="text-xs text-muted-foreground">
                      Upload processing stays in this browser; the image is never stored by ARSHLAB.
                    </p>
                  </div>
                ) : (
                  <CameraCapture onSnapshotAccepted={(snapshot) => selectImageFile(snapshot, "camera")} />
                )}
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

              <Button type="button" onClick={() => void runScan()} disabled={scanning || !file} className="w-full rounded-xl">
                {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanSearch className="h-4 w-4" />}
                {scanning ? "Running local OCR..." : "Run OCR and Match"}
              </Button>

              <Alert className="rounded-xl border-amber-500/30 bg-amber-500/10">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This is an educational structure scanner. It may misidentify handwritten or blurry structures. Always verify important chemistry answers.
                </AlertDescription>
              </Alert>
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
                Scanner mode = isolation + OCR + molecular graph
              </Badge>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <Metric label="Local scans" value={stats.totalScans} />
                <Metric label="Upload scans" value={stats.uploadScans} />
                <Metric label="Camera scans" value={stats.cameraScans} />
                <Metric label="Corrected scans" value={stats.correctedScans} />
                <Metric label="OCR scans" value={stats.ocrScansPerformed} />
                <Metric label="OCR matches" value={stats.ocrMatchesFound} />
                <Metric label="Visual matches" value={stats.visualMatches} />
                <Metric label="OCR correction rate" value={`${stats.ocrCorrectionRate}%`} />
                <Metric label="Compounds" value={metrics.compounds} />
                <Metric label="Functional group families" value={metrics.functionalGroups} />
                <Metric label="Visualizer links" value={metrics.visualizerLinks} />
                <Metric label="Reaction graph links" value={metrics.reactionGraphLinks} />
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Structure isolation, OCR, shape detection, graph reconstruction, and chemistry matching run locally in this browser. No OpenRouter or external AI API is used.
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
                      <p className="mt-1 text-xs font-medium text-muted-foreground">{formatScanSource(entry.source)}</p>
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

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <OCRValue label="OCR Confidence" value={`${result.confidenceBreakdown.ocr}%`} />
            <OCRValue label="Graph Confidence" value={`${result.confidenceBreakdown.graph}%`} />
            <OCRValue label="Ring / Aromatic Confidence" value={`${result.confidenceBreakdown.ring}%`} />
            <OCRValue label="Chemistry Confidence" value={`${result.confidenceBreakdown.chemistry}%`} />
          </div>

          {!result.isConfident && (
            <Alert className="rounded-2xl border-amber-500/30 bg-amber-500/10">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{result.message}</AlertTitle>
              <AlertDescription>
                <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                  <li>- Add a formula hint</li>
                  <li>- Add a name hint</li>
                  <li>- Add a functional group hint</li>
                  <li>- Try higher contrast</li>
                  <li>- Crop closer to the structure</li>
                </ul>
              </AlertDescription>
            </Alert>
          )}

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

          {result.bestMatch && result.isConfident ? (
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
          ) : result.matches.length > 0 ? (
            <div className="space-y-3">
              <div>
                <h3 className="text-lg font-semibold">Top possible matches</h3>
                <p className="text-sm text-muted-foreground">
                  These candidates are suggestions only. Add another clue before relying on one.
                </p>
              </div>
              <div className="grid gap-4 lg:grid-cols-3">
                {result.matches.slice(0, 3).map((match) => (
                  <StructureMatchCard key={match.record.id} match={match} />
                ))}
              </div>
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
              Use it as a study bridge: upload a structure, inspect the OCR tokens, add any clues you recognize, confirm or correct the likely compound, then jump into visualizer views, reaction pathways, spectra, formulas, curriculum topics, and database-only practice.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function OCRValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-border bg-background/80 p-3">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 truncate font-mono text-sm font-semibold" title={value}>{value}</p>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border bg-background/80 p-3">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  )
}

function formatScanSource(source: StructureScanSource | undefined): string {
  if (source === "camera") return "Camera scan"
  if (source === "manual-correction") return "Manual correction"
  if (source === "upload") return "Upload scan"
  if (source === "ocr") return "Legacy OCR scan"
  return "Legacy upload scan"
}
