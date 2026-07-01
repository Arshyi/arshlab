import type { StructureScanInput, StructureScanResult } from "../structure-scanner/scanner-types"

export type RealWorldBenchmarkDifficulty =
  | "clean_scan"
  | "camera_photo"
  | "tablet_photo"
  | "handwritten"
  | "printed"
  | "cropped"
  | "rotated"
  | "perspective"
  | "low_light"
  | "glare"
  | "shadow"
  | "blur"
  | "low_resolution"
  | "partial_structure"
  | "multiple_structures"
  | "clutter"
  | "reaction_page"
  | "lab_notebook"
  | "whiteboard"
  | "lecture_slide"

export type RealWorldFailureCause =
  | "OCR failure"
  | "Atom-label failure"
  | "Perspective failure"
  | "Ring reconstruction failure"
  | "Graph validation failure"
  | "Compiler failure"
  | "Candidate ranking failure"
  | "Reference coverage failure"
  | "Low confidence"
  | "Unknown"

export interface RealWorldBenchmarkManifestSample {
  id: string
  image: string
  expectedName: string
  expectedFormula: string
  expectedFunctionalGroups: string[]
  expectedRingCount: number
  expectedAromaticity: boolean
  expectedAtomCounts?: Record<string, number>
  expectedBondCounts?: {
    single?: number
    double?: number
    triple?: number
    aromatic?: number
  }
  difficulty: RealWorldBenchmarkDifficulty
  tags: string[]
  notes: string
  /**
   * Optional deterministic scanner-export input for Node benchmarks.
   * Raw images are still loaded and tracked, but this harness does not invent
   * OCR/vision data from expected answers.
   */
  scannerInput?: StructureScanInput
}

export interface RealWorldBenchmarkManifest {
  version?: string
  samples: RealWorldBenchmarkManifestSample[]
}

export interface LoadedRealWorldBenchmarkSample extends RealWorldBenchmarkManifestSample {
  manifestPath: string
  sampleDirectory: string
  imagePath: string
  imageExists: boolean
  imageSizeBytes: number
  imageDataUrl?: string
  manifestIssues: string[]
}

export interface RealWorldBenchmarkResult {
  sample: LoadedRealWorldBenchmarkSample
  scannerResult: StructureScanResult | null
  topCandidateId: string | null
  topCandidateName: string | null
  topCandidates: Array<{ id: string; name: string; confidence: number }>
  confidence: number
  runtimeMs: number
  top1Correct: boolean
  top3Correct: boolean
  formulaCorrect: boolean
  functionalGroupsCorrect: boolean
  ringCountCorrect: boolean
  aromaticityCorrect: boolean
  atomCountsCorrect: boolean
  failedCompilation: boolean
  failureCauses: RealWorldFailureCause[]
  failureReasons: string[]
}

export interface RealWorldMetricSummary {
  sampleCount: number
  passCount: number
  failureCount: number
  top1Accuracy: number
  top3Accuracy: number
  formulaAccuracy: number
  functionalGroupAccuracy: number
  ringAccuracy: number
  aromaticityAccuracy: number
  atomCountAccuracy: number
  averageConfidence: number
  averageRuntimeMs: number
}

export interface RealWorldBenchmarkSummary extends RealWorldMetricSummary {
  categoryMetrics: Record<string, RealWorldMetricSummary>
  failureHistogram: Record<RealWorldFailureCause, number>
  runtimeHistogram: Record<string, number>
  confidenceHistogram: Record<string, number>
}

export interface RealWorldBenchmarkComparison {
  baselineVersion: string
  currentVersion: string
  baselineGeneratedAt: string
  currentGeneratedAt: string
  accuracyDelta: number
  confidenceDelta: number
  runtimeDelta: number
  regressionCount: number
  improvementCount: number
}

export interface RealWorldBenchmarkReport {
  version: "11.5.0"
  generatedAt: string
  datasetDirectory: string
  summary: RealWorldBenchmarkSummary
  results: RealWorldBenchmarkResult[]
  comparison?: RealWorldBenchmarkComparison
}

export interface RealWorldBenchmarkHistoryEntry {
  version: string
  generatedAt: string
  sampleCount: number
  top1Accuracy: number
  top3Accuracy: number
  averageConfidence: number
  averageRuntimeMs: number
}
