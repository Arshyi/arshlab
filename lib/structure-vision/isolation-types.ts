export interface IsolationBoundingBox {
  x: number
  y: number
  width: number
  height: number
}

export interface StructureIsolationComponent {
  id: number
  bounds: IsolationBoundingBox
  pixelCount: number
  density: number
  touchesBorder: boolean
  rejected: boolean
  rejectionReason?: string
}

export interface StructureIsolationCandidate {
  id: number
  bounds: IsolationBoundingBox
  componentIds: number[]
  pixelCount: number
  drawingCoverage: number
  chemistryPixelDensity: number
  score: number
  selected: boolean
  reason: string
}

export interface StructureIsolationAnalysis {
  width: number
  height: number
  grayscaleMean: number
  adaptiveThresholdMean: number
  components: StructureIsolationComponent[]
  candidates: StructureIsolationCandidate[]
  selectedBounds: IsolationBoundingBox | null
  cropBounds: IsolationBoundingBox
  drawingCoverage: number
  chemistryPixelDensity: number
  isolationConfidence: number
  usedFullImage: boolean
  warnings: string[]
}

export interface StructureIsolationResult {
  isolatedBlob: Blob
  analysis: StructureIsolationAnalysis
}

export interface StructureIsolationOptions {
  marginRatio?: number
  maxAnalysisDimension?: number
  minimumConfidence?: number
}
