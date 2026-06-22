import { analyzeDarkPixelMask } from "./shape-heuristics"
import type { DarkPixelMask, StructureVisionAnalysis, StructureVisionOptions } from "./vision-types"
import type { StructureImageVariant } from "./isolation-types"

function luminance(red: number, green: number, blue: number): number {
  return red * 0.2126 + green * 0.7152 + blue * 0.0722
}

export function createDarkPixelMask(imageData: ImageData): DarkPixelMask {
  const values: number[] = []
  for (let index = 0; index < imageData.data.length; index += 4) {
    if (imageData.data[index + 3] < 40) continue
    values.push(luminance(imageData.data[index], imageData.data[index + 1], imageData.data[index + 2]))
  }
  const mean = values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length)
  const threshold = Math.round(Math.min(190, Math.max(70, mean - 38)))
  const pixels = new Uint8Array(imageData.width * imageData.height)
  let darkPixelCount = 0

  for (let pixelIndex = 0; pixelIndex < pixels.length; pixelIndex += 1) {
    const dataIndex = pixelIndex * 4
    const alpha = imageData.data[dataIndex + 3]
    const value = luminance(imageData.data[dataIndex], imageData.data[dataIndex + 1], imageData.data[dataIndex + 2])
    if (alpha >= 40 && value <= threshold) {
      pixels[pixelIndex] = 1
      darkPixelCount += 1
    }
  }

  return { width: imageData.width, height: imageData.height, pixels, darkPixelCount, threshold }
}

async function loadImage(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob)
  try {
    return await new Promise((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error("The processed preview could not be decoded for local shape detection."))
      image.src = url
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function analyzeStructureImage(
  blob: Blob,
  options: StructureVisionOptions = {},
): Promise<StructureVisionAnalysis> {
  if (typeof document === "undefined") throw new Error("Structure vision is available only in the browser.")
  const image = await loadImage(blob)
  const maxDimension = options.maxDimension ?? 240
  const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight))
  const width = Math.max(48, Math.round(image.naturalWidth * scale))
  const height = Math.max(48, Math.round(image.naturalHeight * scale))
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext("2d", { willReadFrequently: true })
  if (!context) throw new Error("Your browser could not create a local image-analysis canvas.")

  context.fillStyle = "#ffffff"
  context.fillRect(0, 0, width, height)
  context.drawImage(image, 0, 0, width, height)
  const imageData = context.getImageData(0, 0, width, height)
  const atomLabels = (options.atomLabels ?? []).map((label, id) => ({
    id,
    label: label.label,
    bounds: {
      x: label.bounds.x * scale,
      y: label.bounds.y * scale,
      width: label.bounds.width * scale,
      height: label.bounds.height * scale,
    },
    centroid: { x: label.centroid.x * scale, y: label.centroid.y * scale },
    confidence: label.confidence,
  }))
  return analyzeDarkPixelMask(createDarkPixelMask(imageData), options.recognizedText, atomLabels)
}

function sceneAnalysisScore(analysis: StructureVisionAnalysis): number {
  const graph = analysis.molecularGraph
  return Math.round(Math.min(100,
    graph.estimates.confidence * 0.48 +
    (graph.atomCentered ? 16 : 0) +
    Math.min(14, graph.bonds.length * 2) +
    Math.min(12, graph.rings.length * 8) +
    (graph.aromatic ? 14 : 0) +
    analysis.visualConfidence * 0.16 -
    analysis.warnings.length * 3,
  ))
}

export async function analyzeStructureSceneVariants(
  variants: StructureImageVariant[],
  options: StructureVisionOptions & { primaryCandidateId?: number } = {},
): Promise<StructureVisionAnalysis> {
  if (!variants.length) throw new Error("No isolated scene variants were available for graph analysis.")
  const evaluations: Array<{ variant: StructureImageVariant; analysis: StructureVisionAnalysis; score: number }> = []
  for (const variant of variants) {
    const canUsePositionedLabels = variant.candidateId === options.primaryCandidateId && variant.kind !== "perspective"
    const analysis = await analyzeStructureImage(variant.blob, {
      ...options,
      atomLabels: canUsePositionedLabels ? options.atomLabels : [],
    })
    evaluations.push({ variant, analysis, score: sceneAnalysisScore(analysis) })
  }
  evaluations.sort((left, right) => right.score - left.score || Number(right.variant.primary) - Number(left.variant.primary))
  const selected = evaluations[0]
  const sceneVariants = evaluations.map((evaluation) => ({
    id: evaluation.variant.id,
    candidateId: evaluation.variant.candidateId,
    kind: evaluation.variant.kind,
    score: evaluation.score,
    graphConfidence: evaluation.analysis.molecularGraph.estimates.confidence,
    chemistryConfidence: evaluation.analysis.visualConfidence,
    selected: evaluation.variant.id === selected.variant.id,
    perspectiveCorrected: evaluation.variant.perspectiveCorrected,
  }))
  return {
    ...selected.analysis,
    sceneVariants,
    selectedSceneVariantId: selected.variant.id,
  }
}
