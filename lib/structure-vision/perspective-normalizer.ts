import type { IsolationBoundingBox, PerspectiveQuadrilateral } from "./isolation-types"

type ImageDataLike = Pick<ImageData, "width" | "height" | "data">

export type PerspectiveVariantKind =
  | "original-crop"
  | "grayscale"
  | "high-contrast"
  | "thresholded"
  | "glare-reduced"
  | "inverted"

export interface PerspectiveRegionCandidate {
  id: number
  bounds: IsolationBoundingBox
  quadrilateral: PerspectiveQuadrilateral
  score: number
  selected: boolean
  brightCoverage: number
  strokeDensity: number
  atomLabelDensity: number
  bondLikeDensity: number
  ringGeometryScore: number
  glareRatio: number
  clutterRejected: number
  rectangularity: number
  reasons: string[]
  rejectionReasons: string[]
}

export interface PerspectiveVariantScore {
  id: string
  kind: PerspectiveVariantKind
  score: number
  chemicalStrokeDensity: number
  bondLikeSegmentDensity: number
  atomLabelDensity: number
  ringLikeGeometry: number
  ocrConfidence?: number
  graphConfidence?: number
  fusionConfidence?: number
  selected: boolean
}

export interface PerspectiveNormalizationAnalysis {
  width: number
  height: number
  candidates: PerspectiveRegionCandidate[]
  selectedCandidateId: number | null
  selectedQuadrilateral: PerspectiveQuadrilateral | null
  rejectedRegions: PerspectiveRegionCandidate[]
  glareMaskCoverage: number
  structureMaskCoverage: number
  confidence: number
  usedFallback: boolean
  explanation: string
}

export interface PerspectiveNormalizedVariant {
  id: string
  kind: PerspectiveVariantKind
  blob: Blob
  score: PerspectiveVariantScore
}

export interface PerspectiveNormalizationResult {
  normalizedBlob: Blob
  analysis: PerspectiveNormalizationAnalysis
  variants: PerspectiveNormalizedVariant[]
  selectedVariantId: string | null
}

export interface PerspectiveNormalizationOptions {
  maxAnalysisDimension?: number
  minimumConfidence?: number
  maximumCandidates?: number
}

interface BrightComponent {
  id: number
  bounds: IsolationBoundingBox
  pixelCount: number
  darkStrokePixels: number
  glarePixels: number
  borderPixels: number
  topLeft: { x: number; y: number }
  topRight: { x: number; y: number }
  bottomRight: { x: number; y: number }
  bottomLeft: { x: number; y: number }
}

const DEFAULT_MINIMUM_CONFIDENCE = 46

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min))
}

function luminance(red: number, green: number, blue: number): number {
  return red * 0.2126 + green * 0.7152 + blue * 0.0722
}

function saturation(red: number, green: number, blue: number): number {
  const max = Math.max(red, green, blue)
  const min = Math.min(red, green, blue)
  return max <= 0 ? 0 : (max - min) / max
}

function boxArea(bounds: IsolationBoundingBox): number {
  return Math.max(1, bounds.width * bounds.height)
}

function quadrilateralFromComponent(component: BrightComponent, width: number, height: number): PerspectiveQuadrilateral {
  const topWidth = Math.hypot(component.topRight.x - component.topLeft.x, component.topRight.y - component.topLeft.y)
  const bottomWidth = Math.hypot(component.bottomRight.x - component.bottomLeft.x, component.bottomRight.y - component.bottomLeft.y)
  const leftHeight = Math.hypot(component.bottomLeft.x - component.topLeft.x, component.bottomLeft.y - component.topLeft.y)
  const rightHeight = Math.hypot(component.bottomRight.x - component.topRight.x, component.bottomRight.y - component.topRight.y)
  const areaCoverage = ((topWidth + bottomWidth) / 2) * ((leftHeight + rightHeight) / 2) / Math.max(1, width * height)
  const skew = Math.abs(topWidth - bottomWidth) / Math.max(1, Math.max(topWidth, bottomWidth)) +
    Math.abs(leftHeight - rightHeight) / Math.max(1, Math.max(leftHeight, rightHeight))
  const confidence = Math.round(clamp(areaCoverage * 135 + Math.min(22, skew * 54), 0, 96))
  return {
    topLeft: component.topLeft,
    topRight: component.topRight,
    bottomRight: component.bottomRight,
    bottomLeft: component.bottomLeft,
    confidence,
  }
}

function grayscaleValues(imageData: ImageDataLike): Uint8Array {
  const values = new Uint8Array(imageData.width * imageData.height)
  for (let index = 0; index < values.length; index += 1) {
    const offset = index * 4
    const alpha = imageData.data[offset + 3] / 255
    const value = luminance(imageData.data[offset], imageData.data[offset + 1], imageData.data[offset + 2])
    values[index] = Math.round(value * alpha + 255 * (1 - alpha))
  }
  return values
}

function findBrightComponents(imageData: ImageDataLike): BrightComponent[] {
  const { width, height, data } = imageData
  const grayscale = grayscaleValues(imageData)
  const mean = grayscale.reduce((sum, value) => sum + value, 0) / Math.max(1, grayscale.length)
  const brightThreshold = clamp(mean + 22, 150, 238)
  const brightMask = new Uint8Array(width * height)
  let glarePixels = 0
  let structurePixels = 0

  for (let index = 0; index < brightMask.length; index += 1) {
    const offset = index * 4
    const red = data[offset]
    const green = data[offset + 1]
    const blue = data[offset + 2]
    const value = grayscale[index]
    const sat = saturation(red, green, blue)
    const brightNeutral = value >= brightThreshold && sat <= 0.34
    const whiteCanvas = value >= 182 && sat <= 0.28
    if (brightNeutral || whiteCanvas) brightMask[index] = 1
    if (value >= 238 && sat <= 0.22) glarePixels += 1
    if (value < Math.max(70, mean - 42)) structurePixels += 1
  }

  const visited = new Uint8Array(brightMask.length)
  const queue = new Int32Array(brightMask.length)
  const components: BrightComponent[] = []
  const minimumArea = Math.max(120, Math.round(width * height * 0.018))

  for (let start = 0; start < brightMask.length; start += 1) {
    if (!brightMask[start] || visited[start]) continue
    let head = 0
    let tail = 0
    queue[tail++] = start
    visited[start] = 1
    let pixelCount = 0
    let darkStrokePixels = 0
    let componentGlarePixels = 0
    let borderPixels = 0
    let minimumX = width
    let maximumX = 0
    let minimumY = height
    let maximumY = 0
    let topLeft = { x: width, y: height }
    let topRight = { x: 0, y: height }
    let bottomRight = { x: 0, y: 0 }
    let bottomLeft = { x: width, y: 0 }

    while (head < tail) {
      const index = queue[head++]
      const x = index % width
      const y = Math.floor(index / width)
      pixelCount += 1
      minimumX = Math.min(minimumX, x)
      maximumX = Math.max(maximumX, x)
      minimumY = Math.min(minimumY, y)
      maximumY = Math.max(maximumY, y)
      if (x + y < topLeft.x + topLeft.y) topLeft = { x, y }
      if (x - y > topRight.x - topRight.y) topRight = { x, y }
      if (x + y > bottomRight.x + bottomRight.y) bottomRight = { x, y }
      if (x - y < bottomLeft.x - bottomLeft.y) bottomLeft = { x, y }
      const value = grayscale[index]
      if (value < Math.max(70, mean - 42)) darkStrokePixels += 1
      if (value >= 238) componentGlarePixels += 1
      if (x <= 1 || y <= 1 || x >= width - 2 || y >= height - 2) borderPixels += 1

      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          if (!offsetX && !offsetY) continue
          const nextX = x + offsetX
          const nextY = y + offsetY
          if (nextX < 0 || nextX >= width || nextY < 0 || nextY >= height) continue
          const next = nextY * width + nextX
          if (!brightMask[next] || visited[next]) continue
          visited[next] = 1
          queue[tail++] = next
        }
      }
    }

    const bounds = { x: minimumX, y: minimumY, width: maximumX - minimumX + 1, height: maximumY - minimumY + 1 }
    if (boxArea(bounds) < minimumArea) continue
    components.push({
      id: components.length,
      bounds,
      pixelCount,
      darkStrokePixels,
      glarePixels: componentGlarePixels,
      borderPixels,
      topLeft,
      topRight,
      bottomRight,
      bottomLeft,
    })
  }

  return components
}

function scoreComponent(component: BrightComponent, imageData: ImageDataLike): PerspectiveRegionCandidate {
  const { width, height, data } = imageData
  const bounds = component.bounds
  const imageArea = width * height
  const area = boxArea(bounds)
  const brightCoverage = area / Math.max(1, imageArea)
  const aspect = bounds.width / Math.max(1, bounds.height)
  const rectangularity = clamp(component.pixelCount / area * 100, 0, 100)
  const glareRatio = component.glarePixels / Math.max(1, component.pixelCount)
  const borderRatio = component.borderPixels / Math.max(1, component.pixelCount)
  const quadrilateral = quadrilateralFromComponent(component, width, height)

  let darkInside = 0
  let labelLike = 0
  let lineLike = 0
  let edgeTransitions = 0
  let sampled = 0
  const step = Math.max(1, Math.round(Math.max(bounds.width, bounds.height) / 120))
  let previousDark = false
  for (let y = bounds.y; y < bounds.y + bounds.height; y += step) {
    previousDark = false
    for (let x = bounds.x; x < bounds.x + bounds.width; x += step) {
      const offset = (Math.floor(y) * width + Math.floor(x)) * 4
      const value = luminance(data[offset], data[offset + 1], data[offset + 2])
      const dark = value < 132
      if (dark) darkInside += 1
      if (dark && previousDark !== dark) edgeTransitions += 1
      previousDark = dark
      sampled += 1
    }
  }
  const strokeDensity = darkInside / Math.max(1, sampled)
  const bondLikeDensity = clamp(edgeTransitions / Math.max(1, sampled) * 8, 0, 1)
  labelLike = Math.round(clamp(strokeDensity * 26 + bondLikeDensity * 8, 0, 12))
  lineLike = Math.round(clamp(bondLikeDensity * 22 + strokeDensity * 12, 0, 24))
  const ringGeometryScore = Math.round(clamp(
    (aspect >= 0.55 && aspect <= 1.95 ? 22 : 5) +
    Math.min(28, lineLike * 2) +
    (strokeDensity >= 0.01 && strokeDensity <= 0.28 ? 18 : 2),
    0,
    100,
  ))
  const canvasSizeScore = brightCoverage >= 0.07 && brightCoverage <= 0.92
    ? clamp(18 + Math.sqrt(brightCoverage) * 34, 16, 46)
    : brightCoverage < 0.07 ? 8 : 16
  const shapeScore = aspect >= 0.45 && aspect <= 2.8 ? 18 : 4
  const strokeScore = strokeDensity >= 0.004 && strokeDensity <= 0.34 ? clamp(12 + strokeDensity * 100, 12, 34) : 4
  const geometryScore = clamp(ringGeometryScore * 0.25 + lineLike * 0.6 + labelLike * 0.5, 0, 30)
  const clutterRejected = Math.round(clamp((1 - brightCoverage) * 28 + borderRatio * 22, 0, 55))
  const rejectionReasons: string[] = []
  if (brightCoverage < 0.035) rejectionReasons.push("Too small to be a main paper/screen region")
  if (aspect < 0.35 || aspect > 3.3) rejectionReasons.push("Aspect ratio does not resemble a screen, paper, or whiteboard")
  if (strokeDensity < 0.003) rejectionReasons.push("Bright region contains almost no chemistry strokes")
  if (borderRatio > 0.32 && strokeDensity < 0.015) rejectionReasons.push("Likely image border or wall region")
  if (glareRatio > 0.72 && strokeDensity < 0.02) rejectionReasons.push("Mostly glare with weak structure evidence")
  const penalty = rejectionReasons.length * 14 + (glareRatio > 0.45 ? 8 : 0)
  const score = Math.round(clamp(canvasSizeScore + shapeScore + strokeScore + geometryScore + clutterRejected * 0.22 - penalty, 0, 98))
  const reasons = [
    `${Math.round(brightCoverage * 100)}% bright canvas coverage`,
    `${Math.round(strokeDensity * 1000) / 10}% chemical stroke density`,
    `${lineLike} bond-like and ${labelLike} atom-label-like cues`,
    `${Math.round(clutterRejected)}% surrounding clutter rejected`,
  ]
  return {
    id: component.id,
    bounds,
    quadrilateral,
    score,
    selected: false,
    brightCoverage,
    strokeDensity,
    atomLabelDensity: labelLike / Math.max(1, area / 1000),
    bondLikeDensity,
    ringGeometryScore,
    glareRatio,
    clutterRejected,
    rectangularity,
    reasons,
    rejectionReasons,
  }
}

export function analyzePerspectiveNormalization(
  imageData: ImageDataLike,
  options: PerspectiveNormalizationOptions = {},
): PerspectiveNormalizationAnalysis {
  const components = findBrightComponents(imageData)
  const candidates = components
    .map((component) => scoreComponent(component, imageData))
    .sort((left, right) => right.score - left.score || right.brightCoverage - left.brightCoverage)
    .slice(0, options.maximumCandidates ?? 6)
    .map((candidate, id) => ({ ...candidate, id }))
  const minimumConfidence = options.minimumConfidence ?? DEFAULT_MINIMUM_CONFIDENCE
  const selected = candidates.find((candidate) => candidate.score >= minimumConfidence) ?? null
  if (selected) selected.selected = true
  const rejectedRegions = candidates.filter((candidate) => !candidate.selected)
  const glareMaskCoverage = candidates.reduce((max, candidate) => Math.max(max, candidate.glareRatio), 0)
  const structureMaskCoverage = selected?.strokeDensity ?? Math.max(0, ...candidates.map((candidate) => candidate.strokeDensity))
  return {
    width: imageData.width,
    height: imageData.height,
    candidates,
    selectedCandidateId: selected?.id ?? null,
    selectedQuadrilateral: selected?.quadrilateral ?? null,
    rejectedRegions,
    glareMaskCoverage: Math.round(glareMaskCoverage * 1000) / 10,
    structureMaskCoverage: Math.round(structureMaskCoverage * 1000) / 10,
    confidence: selected?.score ?? 0,
    usedFallback: !selected,
    explanation: selected
      ? `Selected a perspective canvas at ${selected.score}% from bright-region, stroke-density, and clutter-rejection evidence.`
      : "No confident paper/screen/whiteboard canvas was found; scanner should use the existing structure isolation fallback.",
  }
}

async function loadImage(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob)
  try {
    return await new Promise((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error("The image could not be decoded for perspective normalization."))
      image.src = url
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("A normalized perspective crop could not be encoded.")), "image/png")
  })
}

function scaledPoint(point: { x: number; y: number }, scale: number) {
  return { x: point.x / scale, y: point.y / scale }
}

function perspectiveCanvas(source: HTMLCanvasElement, quadrilateral: PerspectiveQuadrilateral, analysisScale: number): HTMLCanvasElement {
  const topLeft = scaledPoint(quadrilateral.topLeft, analysisScale)
  const topRight = scaledPoint(quadrilateral.topRight, analysisScale)
  const bottomRight = scaledPoint(quadrilateral.bottomRight, analysisScale)
  const bottomLeft = scaledPoint(quadrilateral.bottomLeft, analysisScale)
  const outputWidth = Math.max(48, Math.round(Math.max(
    Math.hypot(topRight.x - topLeft.x, topRight.y - topLeft.y),
    Math.hypot(bottomRight.x - bottomLeft.x, bottomRight.y - bottomLeft.y),
  )))
  const outputHeight = Math.max(48, Math.round(Math.max(
    Math.hypot(bottomLeft.x - topLeft.x, bottomLeft.y - topLeft.y),
    Math.hypot(bottomRight.x - topRight.x, bottomRight.y - topRight.y),
  )))
  const canvas = document.createElement("canvas")
  canvas.width = Math.min(1400, outputWidth)
  canvas.height = Math.min(1400, outputHeight)
  const sourceContext = source.getContext("2d", { willReadFrequently: true })
  const context = canvas.getContext("2d")
  if (!sourceContext || !context) return canvas
  const sourceData = sourceContext.getImageData(0, 0, source.width, source.height)
  const outputData = context.createImageData(canvas.width, canvas.height)
  for (let y = 0; y < canvas.height; y += 1) {
    const vertical = y / Math.max(1, canvas.height - 1)
    for (let x = 0; x < canvas.width; x += 1) {
      const horizontal = x / Math.max(1, canvas.width - 1)
      const sourceX = (1 - horizontal) * (1 - vertical) * topLeft.x + horizontal * (1 - vertical) * topRight.x +
        horizontal * vertical * bottomRight.x + (1 - horizontal) * vertical * bottomLeft.x
      const sourceY = (1 - horizontal) * (1 - vertical) * topLeft.y + horizontal * (1 - vertical) * topRight.y +
        horizontal * vertical * bottomRight.y + (1 - horizontal) * vertical * bottomLeft.y
      const sourceOffset = (clamp(Math.round(sourceY), 0, source.height - 1) * source.width + clamp(Math.round(sourceX), 0, source.width - 1)) * 4
      const outputOffset = (y * canvas.width + x) * 4
      outputData.data[outputOffset] = sourceData.data[sourceOffset]
      outputData.data[outputOffset + 1] = sourceData.data[sourceOffset + 1]
      outputData.data[outputOffset + 2] = sourceData.data[sourceOffset + 2]
      outputData.data[outputOffset + 3] = 255
    }
  }
  context.putImageData(outputData, 0, 0)
  return canvas
}

function variantCanvas(source: HTMLCanvasElement, kind: PerspectiveVariantKind): HTMLCanvasElement {
  const canvas = document.createElement("canvas")
  canvas.width = source.width
  canvas.height = source.height
  const context = canvas.getContext("2d", { willReadFrequently: true })
  if (!context) return canvas
  context.drawImage(source, 0, 0)
  if (kind === "original-crop") return canvas
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
  const gray = grayscaleValues(imageData)
  const mean = gray.reduce((sum, value) => sum + value, 0) / Math.max(1, gray.length)
  for (let index = 0; index < gray.length; index += 1) {
    const offset = index * 4
    let value = gray[index]
    if (kind === "thresholded") value = value < mean - 24 ? 0 : 255
    else if (kind === "high-contrast") value = value < mean - 10 ? Math.max(0, value * 0.38) : Math.min(255, 224 + value * 0.12)
    else if (kind === "glare-reduced") value = value > 235 ? 226 : value < mean - 12 ? Math.max(0, value * 0.52) : value
    else if (kind === "inverted") value = 255 - value
    imageData.data[offset] = value
    imageData.data[offset + 1] = value
    imageData.data[offset + 2] = value
    imageData.data[offset + 3] = 255
  }
  context.putImageData(imageData, 0, 0)
  return canvas
}

function scoreVariant(canvas: HTMLCanvasElement, kind: PerspectiveVariantKind): PerspectiveVariantScore {
  const context = canvas.getContext("2d", { willReadFrequently: true })
  if (!context) {
    return { id: kind, kind, score: 0, chemicalStrokeDensity: 0, bondLikeSegmentDensity: 0, atomLabelDensity: 0, ringLikeGeometry: 0, selected: false }
  }
  const data = context.getImageData(0, 0, canvas.width, canvas.height)
  const gray = grayscaleValues(data)
  const mean = gray.reduce((sum, value) => sum + value, 0) / Math.max(1, gray.length)
  let dark = 0
  let transitions = 0
  for (let y = 0; y < canvas.height; y += 1) {
    let wasDark = false
    for (let x = 0; x < canvas.width; x += 1) {
      const currentDark = gray[y * canvas.width + x] < mean - 34 || gray[y * canvas.width + x] < 92
      if (currentDark) dark += 1
      if (x > 0 && currentDark !== wasDark) transitions += 1
      wasDark = currentDark
    }
  }
  const strokeDensity = dark / Math.max(1, canvas.width * canvas.height)
  const transitionDensity = transitions / Math.max(1, canvas.width * canvas.height)
  const ringLikeGeometry = clamp((strokeDensity >= 0.006 && strokeDensity <= 0.32 ? 42 : 8) + Math.min(36, transitionDensity * 850), 0, 100)
  const score = Math.round(clamp(
    (strokeDensity >= 0.006 && strokeDensity <= 0.35 ? 40 : 12) +
    Math.min(26, transitionDensity * 700) +
    ringLikeGeometry * 0.24 +
    (kind === "high-contrast" || kind === "glare-reduced" ? 6 : 0) -
    (kind === "inverted" ? 8 : 0),
    0,
    98,
  ))
  return {
    id: kind,
    kind,
    score,
    chemicalStrokeDensity: Math.round(strokeDensity * 1000) / 10,
    bondLikeSegmentDensity: Math.round(transitionDensity * 1000) / 10,
    atomLabelDensity: Math.round(clamp(strokeDensity * 30, 0, 100)),
    ringLikeGeometry: Math.round(ringLikeGeometry),
    selected: false,
  }
}

export async function normalizePerspectiveImage(
  blob: Blob,
  options: PerspectiveNormalizationOptions = {},
): Promise<PerspectiveNormalizationResult> {
  if (typeof document === "undefined") throw new Error("Perspective normalization is available only in the browser.")
  const image = await loadImage(blob)
  const maxDimension = options.maxAnalysisDimension ?? 820
  const analysisScale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight))
  const width = Math.max(48, Math.round(image.naturalWidth * analysisScale))
  const height = Math.max(48, Math.round(image.naturalHeight * analysisScale))
  const analysisCanvas = document.createElement("canvas")
  analysisCanvas.width = width
  analysisCanvas.height = height
  const analysisContext = analysisCanvas.getContext("2d", { willReadFrequently: true })
  if (!analysisContext) throw new Error("Your browser could not create the local perspective-analysis canvas.")
  analysisContext.fillStyle = "#ffffff"
  analysisContext.fillRect(0, 0, width, height)
  analysisContext.drawImage(image, 0, 0, width, height)
  const analysis = analyzePerspectiveNormalization(analysisContext.getImageData(0, 0, width, height), options)

  if (!analysis.selectedQuadrilateral || analysis.confidence < (options.minimumConfidence ?? DEFAULT_MINIMUM_CONFIDENCE)) {
    return { normalizedBlob: blob, analysis, variants: [], selectedVariantId: null }
  }

  const sourceCanvas = document.createElement("canvas")
  sourceCanvas.width = image.naturalWidth
  sourceCanvas.height = image.naturalHeight
  const sourceContext = sourceCanvas.getContext("2d")
  if (!sourceContext) throw new Error("Your browser could not create the local perspective source canvas.")
  sourceContext.drawImage(image, 0, 0)
  const normalizedCanvas = perspectiveCanvas(sourceCanvas, analysis.selectedQuadrilateral, analysisScale)
  const variants: PerspectiveNormalizedVariant[] = []
  for (const kind of ["original-crop", "grayscale", "high-contrast", "thresholded", "glare-reduced", "inverted"] as const) {
    const canvas = variantCanvas(normalizedCanvas, kind)
    const score = scoreVariant(canvas, kind)
    variants.push({
      id: `perspective-${kind}`,
      kind,
      blob: await canvasBlob(canvas),
      score,
    })
  }
  variants.sort((left, right) => right.score.score - left.score.score || left.kind.localeCompare(right.kind))
  const selected = variants[0]
  selected.score.selected = true
  return {
    normalizedBlob: selected.blob,
    analysis: {
      ...analysis,
      explanation: `${analysis.explanation} Selected ${selected.kind.replace("-", " ")} variant for downstream OCR and graph reconstruction.`,
    },
    variants,
    selectedVariantId: selected.id,
  }
}
