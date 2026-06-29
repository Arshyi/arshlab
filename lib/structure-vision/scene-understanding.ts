import type { IsolationBoundingBox } from "./isolation-types"
import { detectReactionArrows, type ReactionArrowCandidate } from "./reaction-arrow-detector"
import type {
  SceneComponent,
  SceneConfidenceBreakdown,
  SceneGraph,
  SceneGraphEdge,
  SceneGraphNode,
  SceneMoleculeCrop,
  SceneReactionLayout,
  SceneRegionType,
  SceneUnderstandingAnalysis,
  SceneUnderstandingResult,
} from "./scene-graph"

type ImageDataLike = Pick<ImageData, "width" | "height" | "data">

export interface SceneUnderstandingOptions {
  maxAnalysisDimension?: number
  cropMarginRatio?: number
  minimumMoleculeConfidence?: number
}

interface ComponentGroup {
  id: number
  components: SceneComponent[]
  bounds: IsolationBoundingBox
}

interface PixelMaskSummary {
  strokeMask: Uint8Array
  reflectionMask: Uint8Array
  humanMask: Uint8Array
  grayscaleMean: number
  strokePixels: number
  reflectionPixels: number
  humanPixels: number
}

const DEFAULT_MAX_ANALYSIS_DIMENSION = 520
const DEFAULT_CROP_MARGIN_RATIO = 0.18
const DEFAULT_MINIMUM_MOLECULE_CONFIDENCE = 34

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

function center(bounds: IsolationBoundingBox) {
  return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }
}

function unionBounds(bounds: IsolationBoundingBox[]): IsolationBoundingBox {
  const minimumX = Math.min(...bounds.map((box) => box.x))
  const minimumY = Math.min(...bounds.map((box) => box.y))
  const maximumX = Math.max(...bounds.map((box) => box.x + box.width))
  const maximumY = Math.max(...bounds.map((box) => box.y + box.height))
  return { x: minimumX, y: minimumY, width: maximumX - minimumX, height: maximumY - minimumY }
}

function expandBounds(bounds: IsolationBoundingBox, width: number, height: number, ratio: number): IsolationBoundingBox {
  const marginX = Math.max(8, Math.round(bounds.width * ratio))
  const marginY = Math.max(8, Math.round(bounds.height * ratio))
  const x = Math.max(0, bounds.x - marginX)
  const y = Math.max(0, bounds.y - marginY)
  const right = Math.min(width, bounds.x + bounds.width + marginX)
  const bottom = Math.min(height, bounds.y + bounds.height + marginY)
  return { x, y, width: right - x, height: bottom - y }
}

function boxGap(left: IsolationBoundingBox, right: IsolationBoundingBox): number {
  const horizontal = Math.max(0, Math.max(left.x, right.x) - Math.min(left.x + left.width, right.x + right.width))
  const vertical = Math.max(0, Math.max(left.y, right.y) - Math.min(left.y + left.height, right.y + right.height))
  return Math.hypot(horizontal, vertical)
}

function overlapRatio(left: IsolationBoundingBox, right: IsolationBoundingBox): number {
  const x = Math.max(0, Math.min(left.x + left.width, right.x + right.width) - Math.max(left.x, right.x))
  const y = Math.max(0, Math.min(left.y + left.height, right.y + right.height) - Math.max(left.y, right.y))
  return x * y / Math.max(1, Math.min(boxArea(left), boxArea(right)))
}

function buildMasks(imageData: ImageDataLike): PixelMaskSummary {
  const pixels = imageData.width * imageData.height
  const grayscale = new Uint8Array(pixels)
  let mean = 0
  for (let pixel = 0; pixel < pixels; pixel += 1) {
    const offset = pixel * 4
    const alpha = imageData.data[offset + 3] / 255
    const value = luminance(imageData.data[offset], imageData.data[offset + 1], imageData.data[offset + 2])
    grayscale[pixel] = Math.round(value * alpha + 255 * (1 - alpha))
    mean += grayscale[pixel]
  }
  mean /= Math.max(1, pixels)
  const strokeThreshold = clamp(mean - 38, 48, 205)
  const strokeMask = new Uint8Array(pixels)
  const reflectionMask = new Uint8Array(pixels)
  const humanMask = new Uint8Array(pixels)
  let strokePixels = 0
  let reflectionPixels = 0
  let humanPixels = 0
  for (let pixel = 0; pixel < pixels; pixel += 1) {
    const offset = pixel * 4
    const red = imageData.data[offset]
    const green = imageData.data[offset + 1]
    const blue = imageData.data[offset + 2]
    const value = grayscale[pixel]
    const sat = saturation(red, green, blue)
    if ((value <= strokeThreshold && value < 165) || value < 55) {
      strokeMask[pixel] = 1
      strokePixels += 1
    }
    if (value >= 236 && sat <= 0.16 && value - mean >= 18) {
      reflectionMask[pixel] = 1
      reflectionPixels += 1
    }
    const skinLike = red > 92 && green > 45 && blue > 28 && red > green * 1.05 && red > blue * 1.22 && sat >= 0.12 && sat <= 0.58
    if (skinLike) {
      humanMask[pixel] = 1
      humanPixels += 1
    }
  }
  return { strokeMask, reflectionMask, humanMask, grayscaleMean: mean, strokePixels, reflectionPixels, humanPixels }
}

function findComponents(mask: Uint8Array, width: number, height: number, imageData: ImageDataLike): SceneComponent[] {
  const visited = new Uint8Array(mask.length)
  const queue = new Int32Array(mask.length)
  const components: SceneComponent[] = []
  const minimumPixels = Math.max(3, Math.round(width * height * 0.000012))
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
    let luminanceSum = 0
    while (head < tail) {
      const index = queue[head++]
      const x = index % width
      const y = Math.floor(index / width)
      const offset = index * 4
      pixelCount += 1
      luminanceSum += luminance(imageData.data[offset], imageData.data[offset + 1], imageData.data[offset + 2])
      minimumX = Math.min(minimumX, x)
      maximumX = Math.max(maximumX, x)
      minimumY = Math.min(minimumY, y)
      maximumY = Math.max(maximumY, y)
      for (let yOffset = -1; yOffset <= 1; yOffset += 1) {
        for (let xOffset = -1; xOffset <= 1; xOffset += 1) {
          if (!xOffset && !yOffset) continue
          const nextX = x + xOffset
          const nextY = y + yOffset
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
    const aspectRatio = bounds.width / Math.max(1, bounds.height)
    const density = pixelCount / boxArea(bounds)
    components.push({
      id: components.length,
      bounds,
      pixelCount,
      density,
      aspectRatio,
      touchesBorder: bounds.x <= 1 || bounds.y <= 1 || bounds.x + bounds.width >= width - 2 || bounds.y + bounds.height >= height - 2,
      lineLike: aspectRatio >= 2.7 || aspectRatio <= 0.37,
      labelLike: bounds.width <= Math.max(14, width * 0.045) && bounds.height <= Math.max(14, height * 0.055) && density >= 0.16,
      meanLuminance: luminanceSum / Math.max(1, pixelCount),
    })
  }
  return components.sort((left, right) => right.pixelCount - left.pixelCount)
}

function componentNode(component: SceneComponent, type: SceneRegionType, confidence: number, label: string, reasons: string[] = [], rejections: string[] = []): SceneGraphNode {
  return {
    id: `${type}-${component.id}`,
    type,
    label,
    bounds: component.bounds,
    confidence: Math.round(clamp(confidence)),
    selected: false,
    componentIds: [component.id],
    evidence: reasons,
    rejectionReasons: rejections,
  }
}

function isBorderComponent(component: SceneComponent, width: number, height: number): SceneRegionType | null {
  const boundsCoverage = boxArea(component.bounds) / Math.max(1, width * height)
  const pixelCoverage = component.pixelCount / Math.max(1, width * height)
  const spansWide = component.bounds.width >= width * 0.76 && component.bounds.height <= Math.max(10, height * 0.08)
  const spansTall = component.bounds.height >= height * 0.76 && component.bounds.width <= Math.max(10, width * 0.08)
  const nearBorder = component.touchesBorder ||
    component.bounds.x <= width * 0.045 ||
    component.bounds.y <= height * 0.045 ||
    component.bounds.x + component.bounds.width >= width * 0.955 ||
    component.bounds.y + component.bounds.height >= height * 0.955
  const frameLike = nearBorder && (spansWide || spansTall || boundsCoverage > 0.36)
  if (!frameLike) return null
  const nearFull = component.bounds.width >= width * 0.82 || component.bounds.height >= height * 0.82
  if (nearFull && pixelCoverage > 0.01 && pixelCoverage < 0.28) return "tablet-border"
  if (component.bounds.width < width * 0.22 || component.bounds.height < height * 0.22) return "phone-border"
  return "page-border"
}

function groupComponents(components: SceneComponent[], excludedIds: Set<number>, width: number, height: number): ComponentGroup[] {
  const available = components.filter((component) => !excludedIds.has(component.id))
  const parent = new Map(available.map((component) => [component.id, component.id]))
  const find = (id: number): number => {
    const current = parent.get(id) ?? id
    if (current === id) return current
    const root = find(current)
    parent.set(id, root)
    return root
  }
  const join = (left: number, right: number) => {
    const leftRoot = find(left)
    const rightRoot = find(right)
    if (leftRoot !== rightRoot) parent.set(rightRoot, leftRoot)
  }
  const gapLimit = Math.max(14, Math.min(width, height) * 0.075)
  for (let leftIndex = 0; leftIndex < available.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < available.length; rightIndex += 1) {
      const left = available[leftIndex]
      const right = available[rightIndex]
      const near = boxGap(left.bounds, right.bounds) <= gapLimit
      const sameTextLine = Math.abs(center(left.bounds).y - center(right.bounds).y) <= Math.max(left.bounds.height, right.bounds.height) * 1.35 &&
        boxGap(left.bounds, right.bounds) <= gapLimit * 1.8 &&
        left.labelLike && right.labelLike
      if (near || sameTextLine) join(left.id, right.id)
    }
  }
  const groups = new Map<number, SceneComponent[]>()
  available.forEach((component) => {
    const root = find(component.id)
    groups.set(root, [...(groups.get(root) ?? []), component])
  })
  return Array.from(groups.values()).map((items, id) => ({
    id,
    components: items,
    bounds: unionBounds(items.map((component) => component.bounds)),
  })).sort((left, right) => boxArea(right.bounds) - boxArea(left.bounds))
}

function estimateRingScore(group: ComponentGroup): number {
  const lineLike = group.components.filter((component) => component.lineLike).length
  const bounds = group.bounds
  const squarish = Math.abs(bounds.width - bounds.height) / Math.max(1, Math.max(bounds.width, bounds.height))
  const hollowComponent = group.components.some((component) =>
    component.density >= 0.035 &&
    component.density <= 0.38 &&
    component.bounds.width >= 18 &&
    component.bounds.height >= 18 &&
    component.aspectRatio >= 0.45 &&
    component.aspectRatio <= 2.2
  )
  return Math.round(clamp(
    lineLike * 12 +
    Math.max(0, 1 - squarish) * 32 +
    (group.components.length >= 5 ? 18 : 0) +
    (hollowComponent ? 48 : 0),
    0,
    96,
  ))
}

function classifyGroup(group: ComponentGroup, arrows: ReactionArrowCandidate[], width: number, height: number): SceneGraphNode {
  const lineLike = group.components.filter((component) => component.lineLike).length
  const labelLike = group.components.filter((component) => component.labelLike).length
  const area = boxArea(group.bounds)
  const coverage = area / Math.max(1, width * height)
  const ringScore = estimateRingScore(group)
  const arrowOverlap = arrows.some((arrow) => overlapRatio(arrow.bounds, group.bounds) >= 0.4)
  const textScore = labelLike * 18 + (lineLike <= 1 ? 18 : 0) + (group.bounds.width / Math.max(1, group.bounds.height) >= 2.2 ? 10 : 0)
  const moleculeScore = lineLike * 16 + ringScore * 0.72 + Math.min(20, group.components.length * 5) - (coverage > 0.38 ? 22 : 0) - (arrowOverlap ? 26 : 0)
  const selectedEvidence = [
    `${lineLike} line-like component${lineLike === 1 ? "" : "s"}`,
    `${labelLike} label/text-like component${labelLike === 1 ? "" : "s"}`,
    `${ringScore}% ring-geometry cue`,
  ]
  if (moleculeScore >= Math.max(36, textScore + 8)) {
    const multiple = group.components.length >= 18 && group.bounds.width > Math.min(width, height) * 0.42
    return {
      id: `molecule-${group.id}`,
      type: multiple ? "multiple-molecule-region" : "molecule",
      label: multiple ? "Multiple molecule region" : "Molecule region",
      bounds: group.bounds,
      confidence: Math.round(clamp(moleculeScore, 0, 96)),
      selected: false,
      componentIds: group.components.map((component) => component.id),
      evidence: selectedEvidence,
      rejectionReasons: [],
    }
  }
  if (textScore >= 28) {
    return {
      id: `text-${group.id}`,
      type: group.bounds.y < height * 0.38 && arrows.length ? "reaction-conditions" : "chemical-text",
      label: group.bounds.y < height * 0.38 && arrows.length ? "Reaction conditions/text" : "Chemical text region",
      bounds: group.bounds,
      confidence: Math.round(clamp(textScore, 0, 88)),
      selected: false,
      componentIds: group.components.map((component) => component.id),
      evidence: selectedEvidence,
      rejectionReasons: [],
      role: group.bounds.y < height * 0.38 && arrows.length ? "condition" : "context",
    }
  }
  return {
    id: `noise-${group.id}`,
    type: "noise",
    label: "Rejected noise/background strokes",
    bounds: group.bounds,
    confidence: Math.round(clamp(36 - moleculeScore * 0.2, 0, 72)),
    selected: false,
    componentIds: group.components.map((component) => component.id),
    evidence: [],
    rejectionReasons: ["Region did not contain enough molecule, arrow, or text structure."],
  }
}

function buildReactionLayouts(nodes: SceneGraphNode[], arrows: ReactionArrowCandidate[]): { edges: SceneGraphEdge[]; reactions: SceneReactionLayout[] } {
  const edges: SceneGraphEdge[] = []
  const reactions: SceneReactionLayout[] = []
  const moleculeNodes = nodes.filter((node) => node.type === "molecule" || node.type === "multiple-molecule-region")
  const conditionNodes = nodes.filter((node) => node.type === "reaction-conditions" || node.type === "chemical-text")
  arrows.forEach((arrow, index) => {
    const arrowNodeId = `arrow-${arrow.id}`
    const arrowCenter = center(arrow.bounds)
    const reactants = moleculeNodes.filter((node) => {
      const nodeCenter = center(node.bounds)
      if (arrow.direction === "down") return nodeCenter.y < arrowCenter.y
      if (arrow.direction === "up") return nodeCenter.y > arrowCenter.y
      if (arrow.direction === "left") return nodeCenter.x > arrowCenter.x
      return nodeCenter.x < arrowCenter.x
    }).sort((left, right) => boxGap(left.bounds, arrow.bounds) - boxGap(right.bounds, arrow.bounds)).slice(0, 3)
    const products = moleculeNodes.filter((node) => {
      const nodeCenter = center(node.bounds)
      if (arrow.direction === "down") return nodeCenter.y > arrowCenter.y
      if (arrow.direction === "up") return nodeCenter.y < arrowCenter.y
      if (arrow.direction === "left") return nodeCenter.x < arrowCenter.x
      return nodeCenter.x > arrowCenter.x
    }).sort((left, right) => boxGap(left.bounds, arrow.bounds) - boxGap(right.bounds, arrow.bounds)).slice(0, 3)
    const conditions = conditionNodes.filter((node) => {
      const nodeCenter = center(node.bounds)
      return Math.abs(nodeCenter.x - arrowCenter.x) <= arrow.bounds.width * 0.9 + 30 &&
        nodeCenter.y < arrow.bounds.y + arrow.bounds.height * 0.5 &&
        boxGap(node.bounds, arrow.bounds) <= Math.max(40, arrow.bounds.width * 0.7)
    }).slice(0, 3)
    reactants.forEach((node) => edges.push({
      id: `reactant-${node.id}-${arrowNodeId}`,
      fromNodeId: node.id,
      toNodeId: arrowNodeId,
      type: "reactant-to-arrow",
      confidence: arrow.confidence,
      reason: "Molecule lies on the reactant side of the detected reaction arrow.",
    }))
    products.forEach((node) => edges.push({
      id: `product-${arrowNodeId}-${node.id}`,
      fromNodeId: arrowNodeId,
      toNodeId: node.id,
      type: "arrow-to-product",
      confidence: arrow.confidence,
      reason: "Molecule lies on the product side of the detected reaction arrow.",
    }))
    conditions.forEach((node) => edges.push({
      id: `condition-${node.id}-${arrowNodeId}`,
      fromNodeId: node.id,
      toNodeId: arrowNodeId,
      type: "condition-for-arrow",
      confidence: Math.min(arrow.confidence, node.confidence),
      reason: "Text is positioned like a reagent/catalyst/condition label near the reaction arrow.",
    }))
    if (reactants.length || products.length) {
      reactions.push({
        id: `reaction-${index + 1}`,
        arrowNodeId,
        reactantNodeIds: reactants.map((node) => node.id),
        productNodeIds: products.map((node) => node.id),
        conditionNodeIds: conditions.map((node) => node.id),
        confidence: Math.round(clamp(arrow.confidence * 0.62 + (reactants.length ? 16 : 0) + (products.length ? 16 : 0) + Math.min(8, conditions.length * 4), 0, 96)),
        explanation: `Detected ${reactants.length} reactant region${reactants.length === 1 ? "" : "s"} and ${products.length} product region${products.length === 1 ? "" : "s"} around a ${arrow.direction} arrow.`,
      })
    }
  })
  return { edges, reactions }
}

function buildMoleculeCrops(nodes: SceneGraphNode[], width: number, height: number, marginRatio: number): SceneMoleculeCrop[] {
  const moleculeNodes = nodes
    .filter((node) => node.type === "molecule" || node.type === "multiple-molecule-region")
    .sort((left, right) => right.confidence - left.confidence || boxArea(right.bounds) - boxArea(left.bounds))
  return moleculeNodes.map((node, index) => ({
    nodeId: node.id,
    bounds: node.bounds,
    cropBounds: expandBounds(node.bounds, width, height, marginRatio),
    confidence: node.confidence,
    selected: index === 0,
  }))
}

function confidence(nodes: SceneGraphNode[], arrows: ReactionArrowCandidate[], moleculeCrops: SceneMoleculeCrop[], masks: PixelMaskSummary, width: number, height: number): SceneConfidenceBreakdown {
  const moleculeScore = moleculeCrops[0]?.confidence ?? 0
  const segmentation = Math.round(clamp(moleculeScore * 0.72 + Math.min(24, moleculeCrops.length * 8) + (arrows.length ? 8 : 0)))
  const sceneUnderstanding = Math.round(clamp(segmentation * 0.52 + Math.min(18, nodes.length * 2.2) + Math.min(14, arrows.length * 6) - masks.humanPixels / Math.max(1, width * height) * 12))
  const graph = Math.round(clamp(moleculeScore * 0.72 + Math.min(18, nodes.filter((node) => node.type === "molecule").length * 6)))
  const chemistry = Math.round(clamp(moleculeScore * 0.66 + Math.min(18, arrows.length * 6) + (nodes.some((node) => node.type === "chemical-text" || node.type === "reaction-conditions") ? 8 : 0)))
  const ocr = Math.round(clamp(nodes.filter((node) => node.type === "chemical-text" || node.type === "reaction-conditions" || node.type === "atom-labels").reduce((sum, node) => sum + node.confidence, 0) / Math.max(1, nodes.filter((node) => node.type === "chemical-text" || node.type === "reaction-conditions" || node.type === "atom-labels").length)))
  const overall = Math.round(clamp(sceneUnderstanding * 0.22 + segmentation * 0.22 + graph * 0.24 + chemistry * 0.22 + ocr * 0.1))
  return { sceneUnderstanding, segmentation, graph, chemistry, ocr, overall }
}

export function analyzeSceneImageData(imageData: ImageDataLike, options: SceneUnderstandingOptions = {}): SceneUnderstandingAnalysis {
  const { width, height } = imageData
  const masks = buildMasks(imageData)
  const components = findComponents(masks.strokeMask, width, height, imageData)
  const nodes: SceneGraphNode[] = []
  const borderIds = new Set<number>()
  const lowContrastBackgroundIds = new Set<number>()
  const borderNodes: SceneGraphNode[] = []
  components.forEach((component) => {
    const border = isBorderComponent(component, width, height)
    if (!border) return
    borderIds.add(component.id)
    borderNodes.push(componentNode(component, border, 82, border.replace("-", " "), ["Large frame-like component touching image edge"], ["Excluded before molecule reconstruction"]))
  })
  components.forEach((component) => {
    if (borderIds.has(component.id)) return
    const pageRuling = component.meanLuminance >= 135 &&
      component.lineLike &&
      (component.bounds.width >= width * 0.45 || component.bounds.height >= height * 0.45)
    if (!pageRuling) return
    lowContrastBackgroundIds.add(component.id)
    nodes.push(componentNode(
      component,
      "background",
      72,
      "Low-contrast page/slide ruling",
      ["Pale long line is treated as notebook, slide, or background structure"],
      ["Excluded before molecule reconstruction"],
    ))
  })

  const arrows = detectReactionArrows(components.filter((component) => !borderIds.has(component.id) && !lowContrastBackgroundIds.has(component.id)), width, height)
  const arrowIds = new Set(arrows.flatMap((arrow) => arrow.componentIds))
  arrows.forEach((arrow) => nodes.push({
    id: `arrow-${arrow.id}`,
    type: arrow.type === "curved-mechanism" ? "curved-mechanism-arrow" : "reaction-arrow",
    label: arrow.type === "curved-mechanism" ? "Curved mechanism arrow" : "Reaction arrow",
    bounds: arrow.bounds,
    confidence: arrow.confidence,
    selected: false,
    componentIds: arrow.componentIds,
    evidence: arrow.reasons,
    rejectionReasons: ["Excluded from molecular bond reconstruction"],
  }))
  nodes.push(...borderNodes)

  const reflectionCoverage = masks.reflectionPixels / Math.max(1, width * height)
  if (reflectionCoverage > 0.008) {
    nodes.push({
      id: "reflection-mask",
      type: "reflection",
      label: "Reflection/glare mask",
      bounds: { x: 0, y: 0, width, height },
      confidence: Math.round(clamp(reflectionCoverage * 650, 18, 88)),
      selected: false,
      componentIds: [],
      evidence: [`${Math.round(reflectionCoverage * 1000) / 10}% bright low-saturation pixels`],
      rejectionReasons: ["Specular highlights are masked before graph reconstruction"],
    })
  }
  const humanCoverage = masks.humanPixels / Math.max(1, width * height)
  if (humanCoverage > 0.01) {
    nodes.push({
      id: "human-mask",
      type: humanCoverage > 0.06 ? "hand" : "finger",
      label: humanCoverage > 0.06 ? "Hand/sleeve-like region" : "Finger/skin-like region",
      bounds: { x: 0, y: 0, width, height },
      confidence: Math.round(clamp(humanCoverage * 760, 18, 92)),
      selected: false,
      componentIds: [],
      evidence: [`${Math.round(humanCoverage * 1000) / 10}% skin-like pixels`],
      rejectionReasons: ["Human-object mask is excluded from chemistry reconstruction"],
    })
  }

  const excludedIds = new Set([...borderIds, ...lowContrastBackgroundIds, ...arrowIds])
  const groups = groupComponents(components, excludedIds, width, height)
  groups.forEach((group) => {
    const node = classifyGroup(group, arrows, width, height)
    nodes.push(node)
  })

  const minimumConfidence = options.minimumMoleculeConfidence ?? DEFAULT_MINIMUM_MOLECULE_CONFIDENCE
  const moleculeCrops = buildMoleculeCrops(nodes.filter((node) => node.confidence >= minimumConfidence || node.type !== "molecule"), width, height, options.cropMarginRatio ?? DEFAULT_CROP_MARGIN_RATIO)
  const selectedMoleculeNodeId = moleculeCrops[0]?.nodeId ?? null
  const finalNodes = nodes.map((node) => ({
    ...node,
    selected: node.id === selectedMoleculeNodeId,
    role: node.id === selectedMoleculeNodeId ? "selected-molecule" as const : node.role,
  }))
  const { edges, reactions } = buildReactionLayouts(finalNodes, arrows)
  const rejectedNodeIds = finalNodes.filter((node) => ["noise", "background", "reflection", "shadow", "watermark", "page-border", "tablet-border", "phone-border", "hand", "finger"].includes(node.type)).map((node) => node.id)
  const textNodeIds = finalNodes.filter((node) => ["chemical-text", "reaction-conditions", "atom-labels", "charges"].includes(node.type)).map((node) => node.id)
  const sceneGraph: SceneGraph = {
    width,
    height,
    nodes: finalNodes,
    edges,
    reactions,
    moleculeNodeIds: finalNodes.filter((node) => node.type === "molecule" || node.type === "multiple-molecule-region").map((node) => node.id),
    arrowNodeIds: finalNodes.filter((node) => node.type === "reaction-arrow" || node.type === "curved-mechanism-arrow").map((node) => node.id),
    textNodeIds,
    rejectedNodeIds,
    selectedMoleculeNodeId,
    summary: selectedMoleculeNodeId
      ? `Detected ${moleculeCrops.length} molecule region${moleculeCrops.length === 1 ? "" : "s"}, ${arrows.length} arrow${arrows.length === 1 ? "" : "s"}, and ${textNodeIds.length} text/condition region${textNodeIds.length === 1 ? "" : "s"}.`
      : `No confident molecule region found; ${arrows.length} arrow${arrows.length === 1 ? "" : "s"} and ${textNodeIds.length} text/condition region${textNodeIds.length === 1 ? "" : "s"} were identified.`,
  }
  const confidenceBreakdown = confidence(finalNodes, arrows, moleculeCrops, masks, width, height)
  const warnings: string[] = []
  if (!selectedMoleculeNodeId) warnings.push("No molecule region was confident enough for scene-level cropping; scanner should use the existing full-image fallback.")
  if (moleculeCrops.length > 1) warnings.push("Multiple molecule regions were detected. The highest-confidence molecule is scanned first.")
  if (arrows.length) warnings.push("Reaction arrows were separated so they do not become molecular bonds.")
  if (reflectionCoverage > 0.02) warnings.push("Strong reflection/glare was detected and should be masked before graph reconstruction.")
  if (humanCoverage > 0.02) warnings.push("Skin-like human-object regions were detected and suppressed.")

  return {
    width,
    height,
    components,
    sceneGraph,
    moleculeCrops,
    selectedMoleculeNodeId,
    selectedMoleculeBounds: moleculeCrops[0]?.bounds ?? null,
    confidence: confidenceBreakdown,
    arrowCount: arrows.length,
    moleculeCount: moleculeCrops.length,
    textRegionCount: textNodeIds.length,
    suppressedRegionCount: rejectedNodeIds.length,
    reflectionMaskCoverage: Math.round(reflectionCoverage * 1000) / 10,
    humanMaskCoverage: Math.round(humanCoverage * 1000) / 10,
    borderSuppressionCount: borderNodes.length,
    warnings,
    explanation: sceneGraph.summary,
  }
}

async function loadImage(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob)
  try {
    return await new Promise((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error("The image could not be decoded for scene understanding."))
      image.src = url
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("The browser could not export the scene crop.")), "image/png")
  })
}

async function cropBlob(source: HTMLImageElement, scale: number, crop: IsolationBoundingBox): Promise<Blob> {
  const canvas = document.createElement("canvas")
  const sourceX = Math.max(0, crop.x / scale)
  const sourceY = Math.max(0, crop.y / scale)
  const sourceWidth = Math.min(source.naturalWidth - sourceX, crop.width / scale)
  const sourceHeight = Math.min(source.naturalHeight - sourceY, crop.height / scale)
  canvas.width = Math.max(24, Math.round(sourceWidth))
  canvas.height = Math.max(24, Math.round(sourceHeight))
  const context = canvas.getContext("2d")
  if (!context) throw new Error("Your browser could not create a local scene crop canvas.")
  context.fillStyle = "#ffffff"
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(source, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height)
  return canvasToBlob(canvas)
}

export async function understandStructureScene(
  blob: Blob,
  options: SceneUnderstandingOptions = {},
): Promise<SceneUnderstandingResult> {
  if (typeof document === "undefined") throw new Error("Scene understanding is available only in the browser.")
  const image = await loadImage(blob)
  const maxDimension = options.maxAnalysisDimension ?? DEFAULT_MAX_ANALYSIS_DIMENSION
  const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight))
  const width = Math.max(48, Math.round(image.naturalWidth * scale))
  const height = Math.max(48, Math.round(image.naturalHeight * scale))
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext("2d", { willReadFrequently: true })
  if (!context) throw new Error("Your browser could not create a local scene-understanding canvas.")
  context.fillStyle = "#ffffff"
  context.fillRect(0, 0, width, height)
  context.drawImage(image, 0, 0, width, height)
  const analysis = analyzeSceneImageData(context.getImageData(0, 0, width, height), options)
  const moleculeBlobs = await Promise.all(analysis.moleculeCrops.slice(0, 6).map(async (crop) => ({
    ...crop,
    blob: await cropBlob(image, scale, crop.cropBounds),
  })))
  const selectedMoleculeBlob = moleculeBlobs.find((crop) => crop.selected)?.blob ?? null
  return {
    analysis,
    selectedMoleculeBlob,
    moleculeBlobs,
    usedSceneCrop: Boolean(selectedMoleculeBlob && analysis.confidence.segmentation >= (options.minimumMoleculeConfidence ?? DEFAULT_MINIMUM_MOLECULE_CONFIDENCE)),
  }
}
