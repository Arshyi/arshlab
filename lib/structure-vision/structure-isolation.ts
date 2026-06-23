import type {
  IsolationCandidateEvaluation,
  IsolationBoundingBox,
  StructureIsolationAnalysis,
  StructureIsolationCandidate,
  StructureIsolationComponent,
  StructureIsolationOptions,
  StructureIsolationResult,
  PerspectiveQuadrilateral,
  StructureImageVariant,
} from "./isolation-types"
import { analyzeDarkPixelMask } from "./shape-heuristics"
import type { DarkPixelMask } from "./vision-types"

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

function quadrilateralFromPoints(points: Array<{ x: number; y: number }>, width: number, height: number): PerspectiveQuadrilateral {
  const topLeft = points.reduce((best, point) => point.x + point.y < best.x + best.y ? point : best)
  const topRight = points.reduce((best, point) => point.x - point.y > best.x - best.y ? point : best)
  const bottomRight = points.reduce((best, point) => point.x + point.y > best.x + best.y ? point : best)
  const bottomLeft = points.reduce((best, point) => point.x - point.y < best.x - best.y ? point : best)
  const topWidth = Math.hypot(topRight.x - topLeft.x, topRight.y - topLeft.y)
  const bottomWidth = Math.hypot(bottomRight.x - bottomLeft.x, bottomRight.y - bottomLeft.y)
  const leftHeight = Math.hypot(bottomLeft.x - topLeft.x, bottomLeft.y - topLeft.y)
  const rightHeight = Math.hypot(bottomRight.x - topRight.x, bottomRight.y - topRight.y)
  const areaCoverage = ((topWidth + bottomWidth) / 2) * ((leftHeight + rightHeight) / 2) / Math.max(1, width * height)
  const skew = Math.abs(topWidth - bottomWidth) / Math.max(1, Math.max(topWidth, bottomWidth)) +
    Math.abs(leftHeight - rightHeight) / Math.max(1, Math.max(leftHeight, rightHeight))
  const confidence = Math.round(clamp(areaCoverage * 120 + Math.min(25, skew * 80), 0, 92))
  return { topLeft, topRight, bottomRight, bottomLeft, confidence }
}

function boundsQuadrilateral(bounds: IsolationBoundingBox, confidence = 20): PerspectiveQuadrilateral {
  return {
    topLeft: { x: bounds.x, y: bounds.y },
    topRight: { x: bounds.x + bounds.width, y: bounds.y },
    bottomRight: { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
    bottomLeft: { x: bounds.x, y: bounds.y + bounds.height },
    confidence,
  }
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
    // A partial structure may legitimately touch an image edge. Reserve bezel/frame
    // rejection for components that span a large fraction of the whole scene.
    const borderFrame = touchesBorder && coverage > 0.45
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
      corners: {
        topLeft,
        topRight,
        bottomRight,
        bottomLeft,
        confidence: Math.round(clamp(coverage * 120 + (borderFrame ? 25 : 0), 0, 92)),
      },
    })
  }
  return components
}

function clusterComponents(
  components: StructureIsolationComponent[],
  width: number,
  height: number,
  imageData: ImageDataLike,
  gapScale: number,
  proposalSource: string,
): StructureIsolationCandidate[] {
  const usable = components.filter((component) => !component.rejected)
  const parents = usable.map((_, index) => index)
  const find = (index: number): number => parents[index] === index ? index : (parents[index] = find(parents[index]))
  const join = (left: number, right: number) => {
    const leftRoot = find(left)
    const rightRoot = find(right)
    if (leftRoot !== rightRoot) parents[rightRoot] = leftRoot
  }
  const clusterGap = Math.max(5, Math.min(width, height) * gapScale)
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
    const lineLikeComponents = group.filter((component) => {
      const componentAspect = component.bounds.width / Math.max(1, component.bounds.height)
      return (componentAspect >= 2.4 || componentAspect <= 0.42) && component.density <= 0.68
    }).length
    const labelLikeComponents = group.filter((component) => {
      const componentAspect = component.bounds.width / Math.max(1, component.bounds.height)
      const componentCoverage = boxArea(component.bounds) / Math.max(1, imageArea)
      return componentAspect >= 0.3 && componentAspect <= 2.4 && componentCoverage <= 0.035
    }).length
    const componentAreas = group.map((component) => boxArea(component.bounds))
    const meanArea = componentAreas.reduce((sum, area) => sum + area, 0) / Math.max(1, componentAreas.length)
    const areaDeviation = Math.sqrt(componentAreas.reduce((sum, area) => sum + (area - meanArea) ** 2, 0) / Math.max(1, componentAreas.length))
    const repeatedGeometryScore = Math.round(clamp(100 - areaDeviation / Math.max(1, meanArea) * 100, 0, 100))
    const ringGeometryScore = Math.round(clamp(
      (aspect >= 0.55 && aspect <= 1.75 ? 45 : 5) + Math.min(35, lineLikeComponents * 7) + (group.length >= 4 ? 20 : 0),
      0,
      100,
    ))
    let skinPixels = 0
    let sampledPixels = 0
    const step = Math.max(1, Math.round(Math.max(bounds.width, bounds.height) / 80))
    for (let y = bounds.y; y < bounds.y + bounds.height; y += step) {
      for (let x = bounds.x; x < bounds.x + bounds.width; x += step) {
        const offset = (Math.floor(y) * width + Math.floor(x)) * 4
        const red = imageData.data[offset]
        const green = imageData.data[offset + 1]
        const blue = imageData.data[offset + 2]
        sampledPixels += 1
        if (red > 95 && green > 40 && blue > 20 && red > green * 1.08 && red > blue * 1.15 && Math.max(red, green, blue) - Math.min(red, green, blue) > 18) skinPixels += 1
      }
    }
    const skinLikeRatio = skinPixels / Math.max(1, sampledPixels)
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
    const chemistryGeometryBoost = Math.min(24, lineLikeComponents * 3 + labelLikeComponents * 1.5 + repeatedGeometryScore * 0.05 + ringGeometryScore * 0.06)
    const objectShapePenalty = drawingCoverage > 0.07 && (aspect < 0.52 || aspect > 4.2)
      ? 28
      : drawingCoverage > 0.12 && ringGeometryScore < 30
        ? 14
        : 0
    const backgroundPenalty = Math.round(clamp(
      borderPenalty + skinLikeRatio * 48 + (chemistryPixelDensity > 0.58 ? 15 : 0) + objectShapePenalty,
      0,
      65,
    ))
    const score = Math.round(clamp(densityScore + coverageScore + componentScore + shapeScore + centerScore + chemistryGeometryBoost - backgroundPenalty, 0, 98))
    const quadrilateral = quadrilateralFromPoints(group.flatMap((component) => [
      component.corners.topLeft,
      component.corners.topRight,
      component.corners.bottomRight,
      component.corners.bottomLeft,
    ]), width, height)
    return {
      id,
      bounds,
      componentIds: group.map((component) => component.id),
      pixelCount,
      drawingCoverage,
      chemistryPixelDensity,
      score,
      selected: false,
      reason: `${group.length} stroke region${group.length === 1 ? "" : "s"}; ${lineLikeComponents} bond-like and ${labelLikeComponents} label-like components; ${(chemistryPixelDensity * 100).toFixed(1)}% density`,
      lineLikeComponents,
      labelLikeComponents,
      repeatedGeometryScore,
      ringGeometryScore,
      skinLikeRatio,
      backgroundPenalty,
      quadrilateral,
      proposalSources: [proposalSource, "connected-components", "contour-grouping"],
      bondSegmentCount: 0,
      parallelBondPairs: 0,
      ringCueCount: 0,
      aromaticCueScore: 0,
      meanBondLength: 0,
      bondLengthVariance: 0,
      bondLengthRegularity: 0,
      longEdgeCount: 0,
      rectangularFrameDetected: false,
      positiveEvidence: [],
      suppressionReasons: [],
    }
  }).sort((left, right) => right.score - left.score || right.pixelCount - left.pixelCount)
}

function candidateMask(source: Uint8Array, imageWidth: number, bounds: IsolationBoundingBox): DarkPixelMask {
  const pixels = new Uint8Array(bounds.width * bounds.height)
  let darkPixelCount = 0
  for (let y = 0; y < bounds.height; y += 1) {
    for (let x = 0; x < bounds.width; x += 1) {
      const value = source[(bounds.y + y) * imageWidth + bounds.x + x]
      pixels[y * bounds.width + x] = value
      darkPixelCount += value
    }
  }
  return { width: bounds.width, height: bounds.height, pixels, darkPixelCount, threshold: 1 }
}

function variance(values: number[], mean: number): number {
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length
}

function enrichChemistryRegion(
  candidate: StructureIsolationCandidate,
  mask: Uint8Array,
  imageWidth: number,
  imageHeight: number,
): StructureIsolationCandidate {
  const local = analyzeDarkPixelMask(candidateMask(mask, imageWidth, candidate.bounds), "")
  const lengths = local.lineSegments.map((segment) => segment.length).filter((length) => length >= 3)
  const meanBondLength = lengths.reduce((sum, length) => sum + length, 0) / Math.max(1, lengths.length)
  const bondLengthVariance = variance(lengths, meanBondLength)
  const coefficientOfVariation = Math.sqrt(bondLengthVariance) / Math.max(1, meanBondLength)
  const bondLengthRegularity = Math.round(clamp(100 - coefficientOfVariation * 115, 0, 100))
  const regionScale = Math.max(candidate.bounds.width, candidate.bounds.height)
  const longEdgeCount = lengths.filter((length) => length >= regionScale * 0.72).length
  const chemistryRings = local.ringCandidates.filter((ring) => ring.sidesEstimate >= 5 && ring.sidesEstimate <= 7)
  const aromaticCueScore = Math.max(local.graph.aromaticCueScore, ...chemistryRings.map((ring) => ring.aromaticCueScore), 0)
  const touchesImageBorder = candidate.bounds.x <= 1 || candidate.bounds.y <= 1 ||
    candidate.bounds.x + candidate.bounds.width >= imageWidth - 1 ||
    candidate.bounds.y + candidate.bounds.height >= imageHeight - 1
  const aspect = candidate.bounds.width / Math.max(1, candidate.bounds.height)
  const largeSceneEdgeRegion = candidate.drawingCoverage >= 0.2 || touchesImageBorder
  const rectangularFrameDetected = longEdgeCount >= 3 && candidate.drawingCoverage >= 0.25 &&
    aspect >= 0.5 && aspect <= 2.5 && chemistryRings.length === 0
  const positiveEvidence: string[] = []
  if (local.lineSegments.length >= 2) positiveEvidence.push(`${local.lineSegments.length} bond-like segments detected`)
  if (local.parallelLinePairs > 0) positiveEvidence.push(`${local.parallelLinePairs} parallel bond pair${local.parallelLinePairs === 1 ? "" : "s"}`)
  if (chemistryRings.length > 0) positiveEvidence.push(`${chemistryRings.length} five-to-seven member ring cue${chemistryRings.length === 1 ? "" : "s"}`)
  if (aromaticCueScore >= 45) positiveEvidence.push("Aromatic stroke evidence detected")
  if (bondLengthRegularity >= 62 && lengths.length >= 3) positiveEvidence.push("Bond lengths are chemically regular")
  if (candidate.labelLikeComponents > 0) positiveEvidence.push(`${candidate.labelLikeComponents} atom-label-sized component${candidate.labelLikeComponents === 1 ? "" : "s"}`)

  const suppressionReasons: string[] = []
  if (touchesImageBorder) suppressionReasons.push("Touches image border")
  if (rectangularFrameDetected) suppressionReasons.push("Detected as rectangular device or paper frame")
  if (longEdgeCount > 0 && largeSceneEdgeRegion) suppressionReasons.push(`${longEdgeCount} extremely long scene edge${longEdgeCount === 1 ? "" : "s"}`)
  if (candidate.chemistryPixelDensity < 0.012) suppressionReasons.push("Low chemistry stroke density")
  if (local.lineSegments.length < 2 && chemistryRings.length === 0) suppressionReasons.push("Isolated background clutter with no molecular geometry")
  if (lengths.length >= 3 && bondLengthRegularity < 35) suppressionReasons.push("Bond-length scale inconsistent with molecular graph")

  const chemistryBoost = Math.min(54,
    Math.min(16, local.lineSegments.length * 2) +
    Math.min(10, local.parallelLinePairs * 4) +
    Math.min(18, chemistryRings.length * 14) +
    (aromaticCueScore >= 45 ? 8 : 0) +
    (bondLengthRegularity >= 62 && lengths.length >= 3 ? 8 : 0),
  )
  const suppressionPenalty =
    (touchesImageBorder ? 12 : 0) +
    (rectangularFrameDetected ? 38 : 0) +
    (largeSceneEdgeRegion ? Math.min(28, longEdgeCount * 8) : 0) +
    (candidate.chemistryPixelDensity < 0.012 ? 12 : 0) +
    (lengths.length >= 3 && bondLengthRegularity < 35 ? 14 : 0) +
    (local.lineSegments.length < 2 && chemistryRings.length === 0 ? 12 : 0)
  const score = Math.round(clamp(candidate.score * 0.48 + chemistryBoost - suppressionPenalty, 0, 98))
  return {
    ...candidate,
    score,
    reason: `${candidate.reason}; chemistry geometry ${chemistryBoost.toFixed(0)}; suppression ${suppressionPenalty}`,
    proposalSources: Array.from(new Set([
      ...candidate.proposalSources,
      "dark-pixel-clustering",
      ...(local.lineSegments.length ? ["bond-line-density"] : []),
      ...(chemistryRings.length ? ["ring-geometry"] : []),
    ])),
    bondSegmentCount: local.lineSegments.length,
    parallelBondPairs: local.parallelLinePairs,
    ringCueCount: chemistryRings.length,
    aromaticCueScore: Math.round(aromaticCueScore),
    meanBondLength: Math.round(meanBondLength * 10) / 10,
    bondLengthVariance: Math.round(bondLengthVariance * 10) / 10,
    bondLengthRegularity,
    longEdgeCount,
    rectangularFrameDetected,
    positiveEvidence,
    suppressionReasons,
    backgroundPenalty: Math.min(100, candidate.backgroundPenalty + suppressionPenalty),
  }
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
  const candidatePool = [0.025, 0.045, 0.075, 0.11].flatMap((gapScale) =>
    clusterComponents(components, width, height, imageData, gapScale, `component-gap-${gapScale}`),
  ).sort((left, right) => right.score - left.score || right.pixelCount - left.pixelCount)
  const candidates: StructureIsolationCandidate[] = []
  candidatePool.forEach((candidate) => {
    const duplicate = candidates.some((existing) => {
      const intersectionWidth = Math.max(0, Math.min(existing.bounds.x + existing.bounds.width, candidate.bounds.x + candidate.bounds.width) - Math.max(existing.bounds.x, candidate.bounds.x))
      const intersectionHeight = Math.max(0, Math.min(existing.bounds.y + existing.bounds.height, candidate.bounds.y + candidate.bounds.height) - Math.max(existing.bounds.y, candidate.bounds.y))
      const intersection = intersectionWidth * intersectionHeight
      const smallerArea = Math.min(boxArea(existing.bounds), boxArea(candidate.bounds))
      const largerArea = Math.max(boxArea(existing.bounds), boxArea(candidate.bounds))
      return intersection / Math.max(1, smallerArea) >= 0.82 && smallerArea / Math.max(1, largerArea) >= 0.55
    })
    if (!duplicate) candidates.push({ ...candidate, id: candidates.length })
  })
  const chemistryCandidates = candidates
    .map((candidate) => enrichChemistryRegion(candidate, mask, width, height))
    .sort((left, right) => right.score - left.score || right.ringCueCount - left.ringCueCount || right.pixelCount - left.pixelCount)
    .map((candidate, id) => ({ ...candidate, id, selected: false }))
  const minimumConfidence = options.minimumConfidence ?? DEFAULT_MINIMUM_CONFIDENCE
  const selected = chemistryCandidates.find((candidate) => candidate.score >= minimumConfidence) ?? null
  if (selected) selected.selected = true
  const planarComponent = components
    .filter((component) => {
      const coverage = boxArea(component.bounds) / Math.max(1, width * height)
      const aspect = component.bounds.width / Math.max(1, component.bounds.height)
      return coverage > 0.16 && aspect >= 0.5 && aspect <= 2.4 &&
        (component.rejected || component.touchesBorder || component.corners.confidence >= 45)
    })
    .sort((left, right) => boxArea(right.bounds) - boxArea(left.bounds))[0]
  const perspectiveBoundary = planarComponent
    ? { ...planarComponent.corners, confidence: Math.max(55, planarComponent.corners.confidence) }
    : selected?.quadrilateral.confidence && selected.quadrilateral.confidence >= 55
      ? selected.quadrilateral
      : null
  const fullBounds = { x: 0, y: 0, width, height }
  const cropBounds = selected
    ? expandBounds(selected.bounds, width, height, options.marginRatio ?? DEFAULT_MARGIN_RATIO)
    : fullBounds
  const warnings: string[] = []
  if (!selected) warnings.push("No isolated drawing region was confident enough; the full preview was retained.")
  if (selected && selected.drawingCoverage > 0.75) warnings.push("The selected drawing occupies most of the image; manual cropping may still help.")
  if (selected && selected.chemistryPixelDensity < 0.012) warnings.push("The selected region has sparse strokes; increase contrast if recognition is weak.")
  const candidateScoreMargin = Math.max(0, (chemistryCandidates[0]?.score ?? 0) - (chemistryCandidates[1]?.score ?? 0))
  const requiresMultiCropFallback = Boolean(
    !selected || selected.score < 70 || candidateScoreMargin < 10 || selected.rectangularFrameDetected || selected.suppressionReasons.length >= 2,
  )
  if (requiresMultiCropFallback) warnings.push("Isolation confidence is ambiguous; downstream chemistry probes should compare the top candidate crops.")
  return {
    width,
    height,
    grayscaleMean: Math.round(grayscaleMean),
    adaptiveThresholdMean: Math.round(thresholdMean),
    components,
    candidates: chemistryCandidates,
    selectedBounds: selected?.bounds ?? null,
    cropBounds,
    drawingCoverage: Math.round((selected?.drawingCoverage ?? 1) * 1000) / 10,
    chemistryPixelDensity: Math.round((selected?.chemistryPixelDensity ?? 0) * 1000) / 10,
    isolationConfidence: selected?.score ?? 0,
    usedFullImage: !selected,
    perspectiveBoundary,
    regionProposalCount: chemistryCandidates.length,
    selectedCandidateId: selected?.id ?? null,
    candidateScoreMargin,
    requiresMultiCropFallback,
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

function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("A scene variant could not be encoded.")), "image/png")
  })
}

function transformedCanvas(source: HTMLCanvasElement, kind: StructureImageVariant["kind"]): HTMLCanvasElement {
  const canvas = document.createElement("canvas")
  canvas.width = source.width
  canvas.height = source.height
  const context = canvas.getContext("2d", { willReadFrequently: true })
  if (!context) return canvas
  context.drawImage(source, 0, 0)
  if (kind === "original") return canvas
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
  const grayscale = grayscaleValues(imageData)
  const adaptive = kind === "adaptive-threshold" ? adaptiveStrokeMask(grayscale, canvas.width, canvas.height).mask : null
  const mean = grayscale.reduce((sum, value) => sum + value, 0) / Math.max(1, grayscale.length)
  for (let index = 0; index < grayscale.length; index += 1) {
    const offset = index * 4
    let value = grayscale[index]
    if (kind === "adaptive-threshold") value = adaptive?.[index] ? 0 : 255
    else if (kind === "high-contrast") value = value < mean - 8 ? Math.max(0, value * 0.35) : Math.min(255, 210 + value * 0.18)
    else if (kind === "inverted") value = 255 - value
    imageData.data[offset] = value
    imageData.data[offset + 1] = value
    imageData.data[offset + 2] = value
    imageData.data[offset + 3] = 255
  }
  context.putImageData(imageData, 0, 0)
  return canvas
}

function perspectiveCanvas(
  source: HTMLCanvasElement,
  quadrilateral: PerspectiveQuadrilateral,
  analysisScale: number,
): HTMLCanvasElement {
  const scalePoint = (point: { x: number; y: number }) => ({ x: point.x / analysisScale, y: point.y / analysisScale })
  const topLeft = scalePoint(quadrilateral.topLeft)
  const topRight = scalePoint(quadrilateral.topRight)
  const bottomRight = scalePoint(quadrilateral.bottomRight)
  const bottomLeft = scalePoint(quadrilateral.bottomLeft)
  const outputWidth = Math.max(24, Math.round(Math.max(
    Math.hypot(topRight.x - topLeft.x, topRight.y - topLeft.y),
    Math.hypot(bottomRight.x - bottomLeft.x, bottomRight.y - bottomLeft.y),
  )))
  const outputHeight = Math.max(24, Math.round(Math.max(
    Math.hypot(bottomLeft.x - topLeft.x, bottomLeft.y - topLeft.y),
    Math.hypot(bottomRight.x - topRight.x, bottomRight.y - topRight.y),
  )))
  const sourceContext = source.getContext("2d", { willReadFrequently: true })
  const canvas = document.createElement("canvas")
  canvas.width = Math.min(1200, outputWidth)
  canvas.height = Math.min(1200, outputHeight)
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
  const fullSourceCanvas = document.createElement("canvas")
  fullSourceCanvas.width = image.naturalWidth
  fullSourceCanvas.height = image.naturalHeight
  const fullSourceContext = fullSourceCanvas.getContext("2d")
  if (!fullSourceContext) throw new Error("Your browser could not create the scene source canvas.")
  fullSourceContext.drawImage(image, 0, 0)
  const maximumCandidates = options.maximumCandidates ?? 3
  const selectedCandidates = analysis.candidates.slice(0, maximumCandidates)
  if (!selectedCandidates.length) {
    selectedCandidates.push({
      id: 0,
      bounds: { x: 0, y: 0, width, height },
      componentIds: [], pixelCount: 0, drawingCoverage: 1, chemistryPixelDensity: 0, score: 0,
      selected: true, reason: "Full-image fallback", lineLikeComponents: 0, labelLikeComponents: 0,
      repeatedGeometryScore: 0, ringGeometryScore: 0, skinLikeRatio: 0, backgroundPenalty: 0,
      quadrilateral: boundsQuadrilateral({ x: 0, y: 0, width, height }),
      proposalSources: ["full-image-fallback"], bondSegmentCount: 0, parallelBondPairs: 0,
      ringCueCount: 0, aromaticCueScore: 0, meanBondLength: 0, bondLengthVariance: 0,
      bondLengthRegularity: 0, longEdgeCount: 0, rectangularFrameDetected: false,
      positiveEvidence: [], suppressionReasons: ["No candidate exceeded the isolation threshold"],
    })
  }
  const variants: StructureImageVariant[] = []
  for (const candidate of selectedCandidates) {
    const expanded = expandBounds(candidate.bounds, width, height, options.marginRatio ?? DEFAULT_MARGIN_RATIO)
    const sourceX = expanded.x / analysisScale
    const sourceY = expanded.y / analysisScale
    const sourceWidth = expanded.width / analysisScale
    const sourceHeight = expanded.height / analysisScale
    const outputScale = Math.min(1, 1200 / Math.max(sourceWidth, sourceHeight))
    const cropCanvas = document.createElement("canvas")
    cropCanvas.width = Math.max(1, Math.round(sourceWidth * outputScale))
    cropCanvas.height = Math.max(1, Math.round(sourceHeight * outputScale))
    const cropContext = cropCanvas.getContext("2d")
    if (!cropContext) continue
    cropContext.fillStyle = "#ffffff"
    cropContext.fillRect(0, 0, cropCanvas.width, cropCanvas.height)
    cropContext.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, cropCanvas.width, cropCanvas.height)
    for (const kind of ["original", "grayscale", "adaptive-threshold", "high-contrast", "inverted"] as const) {
      const variantCanvas = transformedCanvas(cropCanvas, kind)
      variants.push({
        id: `candidate-${candidate.id}-${kind}`,
        candidateId: candidate.id,
        kind,
        blob: await canvasBlob(variantCanvas),
        primary: candidate.selected && kind === "original",
        perspectiveCorrected: false,
      })
    }
    if (candidate.selected && analysis.perspectiveBoundary && candidate.quadrilateral.confidence >= 45) {
      const perspective = perspectiveCanvas(fullSourceCanvas, candidate.quadrilateral, analysisScale)
      variants.push({
        id: `candidate-${candidate.id}-perspective`,
        candidateId: candidate.id,
        kind: "perspective",
        blob: await canvasBlob(perspective),
        primary: false,
        perspectiveCorrected: true,
      })
    }
  }
  const primaryVariant = variants.find((variant) => variant.primary) ?? variants[0]
  if (!primaryVariant) throw new Error("No chemistry scene variant could be generated.")
  return {
    isolatedBlob: primaryVariant.blob,
    analysis,
    variants,
    primaryVariantId: primaryVariant.id,
    candidateEvaluations: [],
    multiCropFallbackUsed: false,
  }
}

export function selectStructureIsolationCandidate(
  result: StructureIsolationResult,
  evaluations: IsolationCandidateEvaluation[],
): StructureIsolationResult {
  if (!evaluations.length) return result
  const ranked = [...evaluations].sort((left, right) =>
    right.chemistryEvidenceScore - left.chemistryEvidenceScore ||
    right.graphConfidence - left.graphConfidence ||
    right.ocrAtomLabelCount - left.ocrAtomLabelCount,
  )
  const winner = ranked[0]
  const candidate = result.analysis.candidates.find((item) => item.id === winner.candidateId)
  const variant = result.variants.find((item) => item.id === winner.variantId) ??
    result.variants.find((item) => item.candidateId === winner.candidateId && item.kind === "original")
  if (!candidate || !variant) return result
  const candidates = result.analysis.candidates.map((item) => ({
    ...item,
    selected: item.id === candidate.id,
    positiveEvidence: item.id === candidate.id
      ? Array.from(new Set([...item.positiveEvidence, ...winner.reasoning]))
      : item.positiveEvidence,
  }))
  const isolationConfidence = Math.round(clamp(candidate.score * 0.45 + winner.chemistryEvidenceScore * 0.55, 0, 98))
  return {
    ...result,
    isolatedBlob: variant.blob,
    primaryVariantId: variant.id,
    candidateEvaluations: ranked.map((evaluation) => ({ ...evaluation, selected: evaluation.candidateId === winner.candidateId })),
    multiCropFallbackUsed: true,
    analysis: {
      ...result.analysis,
      candidates,
      selectedCandidateId: candidate.id,
      selectedBounds: candidate.bounds,
      cropBounds: expandBounds(candidate.bounds, result.analysis.width, result.analysis.height, DEFAULT_MARGIN_RATIO),
      drawingCoverage: Math.round(candidate.drawingCoverage * 1000) / 10,
      chemistryPixelDensity: Math.round(candidate.chemistryPixelDensity * 1000) / 10,
      isolationConfidence,
      usedFullImage: false,
      requiresMultiCropFallback: false,
      warnings: result.analysis.warnings.filter((warning) => !warning.startsWith("Isolation confidence is ambiguous")),
    },
  }
}
