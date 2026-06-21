import type {
  IsolationBoundingBox,
  StructureIsolationAnalysis,
  StructureIsolationCandidate,
  StructureIsolationComponent,
  StructureIsolationOptions,
  StructureIsolationResult,
} from "./isolation-types"

type ImageDataLike = Pick<ImageData, "width" | "height" | "data">

const DEFAULT_MARGIN_RATIO = 0.14
const DEFAULT_MINIMUM_CONFIDENCE = 38

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min))
}

function boxArea(bounds: IsolationBoundingBox): number {
  return Math.max(1, bounds.width * bounds.height)
}

function unionBounds(bounds: IsolationBoundingBox[]): IsolationBoundingBox {
  const minimumX = Math.min(...bounds.map((box) => box.x))
  const minimumY = Math.min(...bounds.map((box) => box.y))
  const maximumX = Math.max(...bounds.map((box) => box.x + box.width))
  const maximumY = Math.max(...bounds.map((box) => box.y + box.height))
  return { x: minimumX, y: minimumY, width: maximumX - minimumX, height: maximumY - minimumY }
}

function boxGap(left: IsolationBoundingBox, right: IsolationBoundingBox): number {
  const horizontal = Math.max(0, Math.max(left.x, right.x) - Math.min(left.x + left.width, right.x + right.width))
  const vertical = Math.max(0, Math.max(left.y, right.y) - Math.min(left.y + left.height, right.y + right.height))
  return Math.hypot(horizontal, vertical)
}

function expandBounds(
  bounds: IsolationBoundingBox,
  width: number,
  height: number,
  marginRatio: number,
): IsolationBoundingBox {
  const marginX = Math.max(6, Math.round(bounds.width * marginRatio))
  const marginY = Math.max(6, Math.round(bounds.height * marginRatio))
  const x = Math.max(0, bounds.x - marginX)
  const y = Math.max(0, bounds.y - marginY)
  const maximumX = Math.min(width, bounds.x + bounds.width + marginX)
  const maximumY = Math.min(height, bounds.y + bounds.height + marginY)
  return { x, y, width: maximumX - x, height: maximumY - y }
}

function grayscaleValues(imageData: ImageDataLike): Uint8Array {
  const grayscale = new Uint8Array(imageData.width * imageData.height)
  for (let index = 0; index < grayscale.length; index += 1) {
    const offset = index * 4
    const alpha = imageData.data[offset + 3] / 255
    const luminance = imageData.data[offset] * 0.2126 + imageData.data[offset + 1] * 0.7152 + imageData.data[offset + 2] * 0.0722
    grayscale[index] = Math.round(luminance * alpha + 255 * (1 - alpha))
  }
  return grayscale
}

function buildIntegral(values: Uint8Array, width: number, height: number): Float64Array {
  const stride = width + 1
  const integral = new Float64Array((width + 1) * (height + 1))
  for (let y = 0; y < height; y += 1) {
    let rowSum = 0
    for (let x = 0; x < width; x += 1) {
      rowSum += values[y * width + x]
      integral[(y + 1) * stride + x + 1] = integral[y * stride + x + 1] + rowSum
    }
  }
  return integral
}

function regionMean(
  integral: Float64Array,
  width: number,
  height: number,
  x: number,
  y: number,
  radius: number,
): number {
  const stride = width + 1
  const left = Math.max(0, x - radius)
  const top = Math.max(0, y - radius)
  const right = Math.min(width - 1, x + radius)
  const bottom = Math.min(height - 1, y + radius)
  const sum = integral[(bottom + 1) * stride + right + 1] - integral[top * stride + right + 1] -
    integral[(bottom + 1) * stride + left] + integral[top * stride + left]
  return sum / Math.max(1, (right - left + 1) * (bottom - top + 1))
}

function adaptiveStrokeMask(grayscale: Uint8Array, width: number, height: number) {
  const integral = buildIntegral(grayscale, width, height)
  const radius = Math.max(5, Math.round(Math.min(width, height) * 0.035))
  const contrastOffset = 16
  const mask = new Uint8Array(width * height)
  let thresholdSum = 0
  let strokePixels = 0
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x
      const localMean = regionMean(integral, width, height, x, y, radius)
      const threshold = clamp(localMean - contrastOffset, 45, 205)
      thresholdSum += threshold
      const value = grayscale[index]
      if ((value < threshold && value < 205) || value < 55) {
        mask[index] = 1
        strokePixels += 1
      }
    }
  }
  return { mask, thresholdMean: thresholdSum / Math.max(1, width * height), strokePixels }
}

function findComponents(mask: Uint8Array, width: number, height: number): StructureIsolationComponent[] {
  const visited = new Uint8Array(mask.length)
  const queue = new Int32Array(mask.length)
  const components: StructureIsolationComponent[] = []
  const minimumPixels = Math.max(3, Math.round(width * height * 0.000015))

  for (let start = 0; start < mask.length; start += 1) {
    if (!mask[start] || visited[start]) continue
    let head = 0
    let tail = 0
    queue[tail++] = start
    visited[start] = 1
    let pixelCount = 0
    let minimumX = width
    let maximumX = 0
    let minimumY = height
    let maximumY = 0

    while (head < tail) {
      const index = queue[head++]
      const x = index % width
      const y = Math.floor(index / width)
      pixelCount += 1
      minimumX = Math.min(minimumX, x)
      maximumX = Math.max(maximumX, x)
      minimumY = Math.min(minimumY, y)
      maximumY = Math.max(maximumY, y)
      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          if (!offsetX && !offsetY) continue
          const nextX = x + offsetX
          const nextY = y + offsetY
          if (nextX < 0 || nextX >= width || nextY < 0 || nextY >= height) continue
          const next = nextY * width + nextX
          if (!mask[next] || visited[next]) continue
          visited[next] = 1
          queue[tail++] = next
        }
      }
    }

    if (pixelCount < minimumPixels) continue
    const bounds = { x: minimumX, y: minimumY, width: maximumX - minimumX + 1, height: maximumY - minimumY + 1 }
    const density = pixelCount / boxArea(bounds)
    const coverage = boxArea(bounds) / Math.max(1, width * height)
    const touchesBorder = minimumX <= 1 || minimumY <= 1 || maximumX >= width - 2 || maximumY >= height - 2
    const solidBackground = density > 0.62 && coverage > 0.025
    const borderFrame = touchesBorder && coverage > 0.16
    const oversizedShadow = coverage > 0.72
    const rejected = solidBackground || borderFrame || oversizedShadow
    components.push({
      id: components.length,
      bounds,
      pixelCount,
      density,
      touchesBorder,
      rejected,
      rejectionReason: solidBackground
        ? "Dense non-stroke region"
        : borderFrame
          ? "Border or bezel-like region"
          : oversizedShadow
            ? "Oversized background or shadow region"
            : undefined,
    })
  }
  return components
}

function clusterComponents(
  components: StructureIsolationComponent[],
  width: number,
  height: number,
): StructureIsolationCandidate[] {
  const usable = components.filter((component) => !component.rejected)
  const parents = usable.map((_, index) => index)
  const find = (index: number): number => parents[index] === index ? index : (parents[index] = find(parents[index]))
  const join = (left: number, right: number) => {
    const leftRoot = find(left)
    const rightRoot = find(right)
    if (leftRoot !== rightRoot) parents[rightRoot] = leftRoot
  }
  const clusterGap = Math.max(7, Math.min(width, height) * 0.045)
  for (let left = 0; left < usable.length; left += 1) {
    for (let right = left + 1; right < usable.length; right += 1) {
      if (boxGap(usable[left].bounds, usable[right].bounds) <= clusterGap) join(left, right)
    }
  }
  const groups = new Map<number, StructureIsolationComponent[]>()
  usable.forEach((component, index) => {
    const root = find(index)
    groups.set(root, [...(groups.get(root) ?? []), component])
  })
  const imageArea = width * height
  return Array.from(groups.values()).map((group, id): StructureIsolationCandidate => {
    const bounds = unionBounds(group.map((component) => component.bounds))
    const pixelCount = group.reduce((sum, component) => sum + component.pixelCount, 0)
    const drawingCoverage = boxArea(bounds) / Math.max(1, imageArea)
    const chemistryPixelDensity = pixelCount / boxArea(bounds)
    const aspect = bounds.width / Math.max(1, bounds.height)
    const balancedShape = aspect >= 0.18 && aspect <= 5.5
    const densityScore = chemistryPixelDensity >= 0.012 && chemistryPixelDensity <= 0.42
      ? clamp(18 + chemistryPixelDensity * 95, 18, 35)
      : chemistryPixelDensity < 0.012 ? 5 : 8
    const coverageScore = drawingCoverage >= 0.008 && drawingCoverage <= 0.78
      ? clamp(12 + Math.sqrt(drawingCoverage) * 32, 12, 30)
      : 4
    const componentScore = clamp(8 + Math.log2(group.length + 1) * 6, 8, 22)
    const shapeScore = balancedShape ? 12 : 3
    const centerX = bounds.x + bounds.width / 2
    const centerY = bounds.y + bounds.height / 2
    const centerDistance = Math.hypot(centerX - width / 2, centerY - height / 2) / Math.max(1, Math.hypot(width, height) / 2)
    const centerScore = clamp(10 - centerDistance * 7, 2, 10)
    const borderPenalty = bounds.x <= 1 || bounds.y <= 1 || bounds.x + bounds.width >= width - 1 || bounds.y + bounds.height >= height - 1 ? 18 : 0
    const score = Math.round(clamp(densityScore + coverageScore + componentScore + shapeScore + centerScore - borderPenalty, 0, 96))
    return {
      id,
      bounds,
      componentIds: group.map((component) => component.id),
      pixelCount,
      drawingCoverage,
      chemistryPixelDensity,
      score,
      selected: false,
      reason: `${group.length} connected stroke region${group.length === 1 ? "" : "s"}; ${(chemistryPixelDensity * 100).toFixed(1)}% dark-stroke density`,
    }
  }).sort((left, right) => right.score - left.score || right.pixelCount - left.pixelCount)
}

export function analyzeStructureIsolation(
  imageData: ImageDataLike,
  options: StructureIsolationOptions = {},
): StructureIsolationAnalysis {
  const { width, height } = imageData
  const grayscale = grayscaleValues(imageData)
  const grayscaleMean = grayscale.reduce((sum, value) => sum + value, 0) / Math.max(1, grayscale.length)
  const { mask, thresholdMean } = adaptiveStrokeMask(grayscale, width, height)
  const components = findComponents(mask, width, height)
  const candidates = clusterComponents(components, width, height)
  const minimumConfidence = options.minimumConfidence ?? DEFAULT_MINIMUM_CONFIDENCE
  const selected = candidates.find((candidate) => candidate.score >= minimumConfidence) ?? null
  if (selected) selected.selected = true
  const fullBounds = { x: 0, y: 0, width, height }
  const cropBounds = selected
    ? expandBounds(selected.bounds, width, height, options.marginRatio ?? DEFAULT_MARGIN_RATIO)
    : fullBounds
  const warnings: string[] = []
  if (!selected) warnings.push("No isolated drawing region was confident enough; the full preview was retained.")
  if (selected && selected.drawingCoverage > 0.75) warnings.push("The selected drawing occupies most of the image; manual cropping may still help.")
  if (selected && selected.chemistryPixelDensity < 0.012) warnings.push("The selected region has sparse strokes; increase contrast if recognition is weak.")
  return {
    width,
    height,
    grayscaleMean: Math.round(grayscaleMean),
    adaptiveThresholdMean: Math.round(thresholdMean),
    components,
    candidates,
    selectedBounds: selected?.bounds ?? null,
    cropBounds,
    drawingCoverage: Math.round((selected?.drawingCoverage ?? 1) * 1000) / 10,
    chemistryPixelDensity: Math.round((selected?.chemistryPixelDensity ?? 0) * 1000) / 10,
    isolationConfidence: selected?.score ?? 0,
    usedFullImage: !selected,
    warnings,
  }
}

async function loadImage(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob)
  try {
    return await new Promise((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error("The preview could not be decoded for structure isolation."))
      image.src = url
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function isolateStructureImage(
  blob: Blob,
  options: StructureIsolationOptions = {},
): Promise<StructureIsolationResult> {
  if (typeof document === "undefined") throw new Error("Structure isolation is available only in the browser.")
  const image = await loadImage(blob)
  const maxDimension = options.maxAnalysisDimension ?? 720
  const analysisScale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight))
  const width = Math.max(32, Math.round(image.naturalWidth * analysisScale))
  const height = Math.max(32, Math.round(image.naturalHeight * analysisScale))
  const analysisCanvas = document.createElement("canvas")
  analysisCanvas.width = width
  analysisCanvas.height = height
  const analysisContext = analysisCanvas.getContext("2d", { willReadFrequently: true })
  if (!analysisContext) throw new Error("Your browser could not create the local isolation canvas.")
  analysisContext.fillStyle = "#ffffff"
  analysisContext.fillRect(0, 0, width, height)
  analysisContext.drawImage(image, 0, 0, width, height)
  const analysis = analyzeStructureIsolation(analysisContext.getImageData(0, 0, width, height), options)

  const sourceX = analysis.cropBounds.x / analysisScale
  const sourceY = analysis.cropBounds.y / analysisScale
  const sourceWidth = analysis.cropBounds.width / analysisScale
  const sourceHeight = analysis.cropBounds.height / analysisScale
  const outputScale = Math.min(1, 1600 / Math.max(sourceWidth, sourceHeight))
  const cropCanvas = document.createElement("canvas")
  cropCanvas.width = Math.max(1, Math.round(sourceWidth * outputScale))
  cropCanvas.height = Math.max(1, Math.round(sourceHeight * outputScale))
  const cropContext = cropCanvas.getContext("2d")
  if (!cropContext) throw new Error("Your browser could not create the isolated structure crop.")
  cropContext.fillStyle = "#ffffff"
  cropContext.fillRect(0, 0, cropCanvas.width, cropCanvas.height)
  cropContext.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    cropCanvas.width,
    cropCanvas.height,
  )
  const isolatedBlob = await new Promise<Blob>((resolve, reject) => {
    cropCanvas.toBlob((result) => result ? resolve(result) : reject(new Error("The isolated crop could not be encoded.")), "image/png")
  })
  return { isolatedBlob, analysis }
}
