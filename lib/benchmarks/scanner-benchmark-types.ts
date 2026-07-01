import type { StructureScanInput, StructureScanResult } from "../structure-scanner/scanner-types"

export type ScannerBenchmarkDifficulty =
  | "clean"
  | "handwritten"
  | "camera"
  | "clutter"
  | "low-light"
  | "perspective"

export interface ScannerBenchmarkBondCounts {
  single: number
  double: number
  triple: number
  aromatic?: number
}

export interface ScannerBenchmarkFixture {
  id: string
  compoundId: string
  expectedName: string
  expectedFormula: string
  expectedFunctionalGroups: string[]
  expectedRingCount: number
  expectedAromaticity: boolean
  expectedAtomCounts: Record<string, number>
  expectedBondCounts: ScannerBenchmarkBondCounts
  difficulty: ScannerBenchmarkDifficulty
  notes: string
  input: StructureScanInput
}

export interface ScannerBenchmarkFixtureResult {
  fixture: ScannerBenchmarkFixture
  result: StructureScanResult
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
  falseAromatic: boolean
  falseRing: boolean
  failedCompilation: boolean
  validationFailureReasons: string[]
}

export interface ScannerBenchmarkSummary {
  fixtureCount: number
  top1Accuracy: number
  top3Accuracy: number
  formulaAccuracy: number
  functionalGroupAccuracy: number
  ringCountAccuracy: number
  aromaticityAccuracy: number
  atomCountAccuracy: number
  averageConfidence: number
  falseAromaticRate: number
  falseRingRate: number
  averageRuntimeMs: number
  failedCompilationRate: number
  validationFailureReasons: Record<string, number>
}

export interface ScannerBenchmarkReport {
  version: "11.3.0"
  generatedAt: string
  summary: ScannerBenchmarkSummary
  results: ScannerBenchmarkFixtureResult[]
}
