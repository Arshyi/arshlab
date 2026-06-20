import type {
  DarkPixelMask,
  StructureVisionAnalysis,
  VisionClosedLoop,
  VisionCompoundCandidate,
  VisionFunctionalGroupCue,
  VisionLineSegment,
  VisionPoint,
  VisionRingCandidate,
} from "./vision-types"

const DEGREE_STEP = 5

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function angleDifference(left: number, right: number): number {
  const difference = Math.abs(left - right) % 180
  return Math.min(difference, 180 - difference)
}

function distance(left: VisionPoint, right: VisionPoint): number {
  return Math.hypot(left.x - right.x, left.y - right.y)
}

function darkPoints(mask: DarkPixelMask): VisionPoint[] {
  const points: VisionPoint[] = []
  for (let y = 0; y < mask.height; y += 1) {
    for (let x = 0; x < mask.width; x += 1) {
      if (mask.pixels[y * mask.width + x]) points.push({ x, y })
    }
  }
  return points
}

export function detectLineSegments(mask: DarkPixelMask): VisionLineSegment[] {
  const points = darkPoints(mask)
  const minimumLength = Math.max(8, Math.min(mask.width, mask.height) * 0.07)
  if (points.length < minimumLength) return []

  const diagonal = Math.ceil(Math.hypot(mask.width, mask.height))
  const rhoSize = diagonal * 2 + 1
  const peaks: Array<{ angle: number; rho: number; votes: number }> = []

  for (let angle = 0; angle < 180; angle += DEGREE_STEP) {
    const radians = (angle * Math.PI) / 180
    const cosine = Math.cos(radians)
    const sine = Math.sin(radians)
    const accumulator = new Uint16Array(rhoSize)

    for (const point of points) {
      const rhoIndex = Math.round(point.x * cosine + point.y * sine) + diagonal
      if (rhoIndex >= 0 && rhoIndex < rhoSize) accumulator[rhoIndex] += 1
    }

    const voteThreshold = Math.max(7, Math.round(minimumLength * 0.7))
    for (let index = 1; index < rhoSize - 1; index += 1) {
      const votes = accumulator[index]
      if (votes < voteThreshold || votes < accumulator[index - 1] || votes < accumulator[index + 1]) continue
      peaks.push({ angle, rho: index - diagonal, votes })
    }
  }

  const rawSegments = peaks
    .sort((left, right) => right.votes - left.votes)
    .slice(0, 80)
    .map((peak): VisionLineSegment | null => {
      const radians = (peak.angle * Math.PI) / 180
      const cosine = Math.cos(radians)
      const sine = Math.sin(radians)
      const projections: number[] = []

      for (const point of points) {
        const pointRho = point.x * cosine + point.y * sine
        if (Math.abs(pointRho - peak.rho) <= 1.4) projections.push(-point.x * sine + point.y * cosine)
      }

      if (projections.length < 5) return null
      projections.sort((left, right) => left - right)
      const startProjection = projections[Math.floor(projections.length * 0.03)]
      const endProjection = projections[Math.ceil(projections.length * 0.97) - 1]
      const length = endProjection - startProjection
      if (length < minimumLength) return null

      const pointAt = (projection: number): VisionPoint => ({
        x: clamp(peak.rho * cosine - projection * sine, 0, mask.width - 1),
        y: clamp(peak.rho * sine + projection * cosine, 0, mask.height - 1),
      })
      const start = pointAt(startProjection)
      const end = pointAt(endProjection)
      return {
        start,
        end,
        midpoint: { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 },
        length,
        angle: (peak.angle + 90) % 180,
        strength: peak.votes,
      }
    })
    .filter((segment): segment is VisionLineSegment => Boolean(segment))
    .sort((left, right) => right.length * right.strength - left.length * left.strength)

  const selected: VisionLineSegment[] = []
  for (const segment of rawSegments) {
    const duplicate = selected.some((existing) =>
      angleDifference(existing.angle, segment.angle) <= 7 &&
      distance(existing.midpoint, segment.midpoint) <= 2.3,
    )
    if (!duplicate) selected.push(segment)
    if (selected.length >= 28) break
  }
  return selected
}

export function detectClosedLoops(mask: DarkPixelMask): VisionClosedLoop[] {
  const { width, height, pixels } = mask
  const size = width * height
  const external = new Uint8Array(size)
  const queue = new Int32Array(size)
  let head = 0
  let tail = 0

  const enqueue = (index: number) => {
    if (index < 0 || index >= size || pixels[index] || external[index]) return
    external[index] = 1
    queue[tail++] = index
  }

  for (let x = 0; x < width; x += 1) {
    enqueue(x)
    enqueue((height - 1) * width + x)
  }
  for (let y = 0; y < height; y += 1) {
    enqueue(y * width)
    enqueue(y * width + width - 1)
  }

  while (head < tail) {
    const index = queue[head++]
    const x = index % width
    const y = Math.floor(index / width)
    if (x > 0) enqueue(index - 1)
    if (x < width - 1) enqueue(index + 1)
    if (y > 0) enqueue(index - width)
    if (y < height - 1) enqueue(index + width)
  }

  const visited = new Uint8Array(size)
  const loops: VisionClosedLoop[] = []
  const minimumHoleArea = Math.max(12, size * 0.0015)

  for (let start = 0; start < size; start += 1) {
    if (pixels[start] || external[start] || visited[start]) continue
    head = 0
    tail = 0
    queue[tail++] = start
    visited[start] = 1
    let area = 0
    let minX = width
    let maxX = 0
    let minY = height
    let maxY = 0

    while (head < tail) {
      const index = queue[head++]
      const x = index % width
      const y = Math.floor(index / width)
      area += 1
      minX = Math.min(minX, x)
      maxX = Math.max(maxX, x)
      minY = Math.min(minY, y)
      maxY = Math.max(maxY, y)

      const neighbors = [index - 1, index + 1, index - width, index + width]
      for (const neighbor of neighbors) {
        if (neighbor < 0 || neighbor >= size || pixels[neighbor] || external[neighbor] || visited[neighbor]) continue
        const neighborX = neighbor % width
        if (Math.abs(neighborX - x) > 1) continue
        visited[neighbor] = 1
        queue[tail++] = neighbor
      }
    }

    const loopWidth = maxX - minX + 1
    const loopHeight = maxY - minY + 1
    if (area < minimumHoleArea || loopWidth < 6 || loopHeight < 6) continue
    loops.push({
      bounds: { x: minX, y: minY, width: loopWidth, height: loopHeight },
      center: { x: minX + loopWidth / 2, y: minY + loopHeight / 2 },
      holeArea: area,
      aspectRatio: loopWidth / loopHeight,
    })
  }

  return loops.sort((left, right) => right.holeArea - left.holeArea).slice(0, 8)
}

function segmentNearLoop(segment: VisionLineSegment, loop: VisionClosedLoop): boolean {
  const padding = Math.max(loop.bounds.width, loop.bounds.height) * 0.35
  return segment.midpoint.x >= loop.bounds.x - padding &&
    segment.midpoint.x <= loop.bounds.x + loop.bounds.width + padding &&
    segment.midpoint.y >= loop.bounds.y - padding &&
    segment.midpoint.y <= loop.bounds.y + loop.bounds.height + padding
}

export function detectRingCandidates(
  mask: DarkPixelMask,
  loops: VisionClosedLoop[],
  segments: VisionLineSegment[],
): VisionRingCandidate[] {
  const minimumRingSize = Math.min(mask.width, mask.height) * 0.13
  return loops
    .filter((loop) => loop.bounds.width >= minimumRingSize && loop.bounds.height >= minimumRingSize)
    .map((loop) => {
      const nearbySegments = segments.filter((segment) => segmentNearLoop(segment, loop))
      const directions: number[] = []
      for (const segment of nearbySegments) {
        if (!directions.some((direction) => angleDifference(direction, segment.angle) < 12)) directions.push(segment.angle)
      }
      const balanced = loop.aspectRatio >= 0.68 && loop.aspectRatio <= 1.45
      const benzeneLike = balanced && nearbySegments.length >= 5 && directions.length >= 3
      const sidesEstimate = benzeneLike ? 6 : clamp(Math.round(nearbySegments.length / 2), 3, 8)
      const confidence = clamp(
        35 + Math.min(30, nearbySegments.length * 4) + (balanced ? 12 : 0) + (directions.length >= 3 ? 10 : 0),
        0,
        96,
      )
      return {
        center: loop.center,
        width: loop.bounds.width,
        height: loop.bounds.height,
        sidesEstimate,
        confidence,
        benzeneLike,
      }
    })
    .sort((left, right) => right.confidence - left.confidence)
}

function projectedOverlap(left: VisionLineSegment, right: VisionLineSegment): number {
  const radians = (left.angle * Math.PI) / 180
  const direction = { x: Math.cos(radians), y: Math.sin(radians) }
  const project = (point: VisionPoint) => point.x * direction.x + point.y * direction.y
  const leftRange = [project(left.start), project(left.end)].sort((a, b) => a - b)
  const rightRange = [project(right.start), project(right.end)].sort((a, b) => a - b)
  return Math.max(0, Math.min(leftRange[1], rightRange[1]) - Math.max(leftRange[0], rightRange[0]))
}

export function countParallelLinePairs(segments: VisionLineSegment[], mask: DarkPixelMask): number {
  let pairs = 0
  const maximumSeparation = Math.max(4, Math.min(mask.width, mask.height) * 0.055)
  for (let leftIndex = 0; leftIndex < segments.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < segments.length; rightIndex += 1) {
      const left = segments[leftIndex]
      const right = segments[rightIndex]
      if (angleDifference(left.angle, right.angle) > 7) continue
      const separation = distance(left.midpoint, right.midpoint)
      if (separation < 2 || separation > maximumSeparation) continue
      if (projectedOverlap(left, right) < Math.min(left.length, right.length) * 0.42) continue
      pairs += 1
    }
  }
  return Math.min(pairs, 8)
}

export function estimateSimpleChainLength(segments: VisionLineSegment[], mask: DarkPixelMask): number {
  if (!segments.length) return 0
  const minimumBondLength = Math.min(mask.width, mask.height) * 0.07
  const candidates = segments.filter((segment) => segment.length >= minimumBondLength)
  const bonds: VisionLineSegment[] = []
  const mergeDistance = Math.max(5, Math.min(mask.width, mask.height) * 0.065)
  for (const candidate of candidates) {
    const duplicateBond = bonds.some((bond) =>
      angleDifference(bond.angle, candidate.angle) <= 10 &&
      distance(bond.midpoint, candidate.midpoint) <= Math.max(bond.length, candidate.length) &&
      projectedOverlap(bond, candidate) >= Math.min(bond.length, candidate.length) * 0.48 &&
      Math.abs(
        (candidate.midpoint.x - bond.midpoint.x) * -Math.sin((bond.angle * Math.PI) / 180) +
        (candidate.midpoint.y - bond.midpoint.y) * Math.cos((bond.angle * Math.PI) / 180),
      ) <= mergeDistance,
    )
    if (!duplicateBond) bonds.push(candidate)
    if (bonds.length >= 14) break
  }
  const nodes: VisionPoint[] = []
  const edges: Array<[number, number]> = []
  const snapDistance = Math.max(4, Math.min(mask.width, mask.height) * 0.045)

  const nodeIndex = (point: VisionPoint) => {
    const existing = nodes.findIndex((node) => distance(node, point) <= snapDistance)
    if (existing >= 0) return existing
    nodes.push(point)
    return nodes.length - 1
  }

  for (const bond of bonds) {
    const start = nodeIndex(bond.start)
    const end = nodeIndex(bond.end)
    if (start !== end && !edges.some(([left, right]) => (left === start && right === end) || (left === end && right === start))) {
      edges.push([start, end])
    }
  }

  const adjacency = nodes.map(() => [] as number[])
  for (const [left, right] of edges) {
    adjacency[left].push(right)
    adjacency[right].push(left)
  }

  let longestEdges = 0
  const visit = (node: number, seen: Set<number>, depth: number) => {
    longestEdges = Math.max(longestEdges, depth)
    for (const neighbor of adjacency[node]) {
      if (seen.has(neighbor)) continue
      const nextSeen = new Set(seen)
      nextSeen.add(neighbor)
      visit(neighbor, nextSeen, depth + 1)
    }
  }
  nodes.forEach((_, index) => visit(index, new Set([index]), 0))
  return longestEdges > 0 ? Math.min(10, longestEdges + 1) : 0
}

function buildCues(
  rings: VisionRingCandidate[],
  parallelLinePairs: number,
  chainLength: number,
  recognizedText: string,
): VisionFunctionalGroupCue[] {
  const text = recognizedText.toLowerCase().replace(/\s+/g, " ")
  const compact = text.replace(/[^a-z0-9=#-]/g, "")
  const cues: VisionFunctionalGroupCue[] = []
  const add = (cue: VisionFunctionalGroupCue) => {
    if (!cues.some((existing) => existing.kind === cue.kind)) cues.push(cue)
  }

  if (rings.some((ring) => ring.benzeneLike)) {
    add({ kind: "aromatic", label: "Six-membered aromatic ring", confidence: parallelLinePairs >= 2 ? 91 : 76, evidence: "Closed balanced loop with approximately six bond edges" })
  }
  if (parallelLinePairs > 0) {
    add({ kind: "double-bond", label: "Parallel bond strokes", confidence: clamp(55 + parallelLinePairs * 8, 0, 90), evidence: `${parallelLinePairs} close parallel line pair${parallelLinePairs === 1 ? "" : "s"}` })
  }
  if (/c=o|carbonyl|h2co|hcho|ch3cho|coch/.test(compact) && parallelLinePairs > 0) {
    add({ kind: "carbonyl", label: "Carbonyl-like C=O", confidence: 88, evidence: "Parallel bond strokes occur with a C/O text cue" })
  }
  if (/cooh|carbox/.test(compact)) {
    add({ kind: "carboxyl", label: "Carboxyl-like COOH", confidence: parallelLinePairs > 0 ? 92 : 76, evidence: "COOH text cue with nearby bond strokes" })
  }
  if (/o-h|oh|hydroxyl|alcohol/.test(compact)) {
    add({ kind: "hydroxyl", label: "Hydroxyl-like O-H", confidence: 82, evidence: "O-H or OH text cue detected in the drawing" })
  }
  if (chainLength >= 2 && !rings.some((ring) => ring.benzeneLike)) {
    add({ kind: "simple-chain", label: `${chainLength}-atom simple chain`, confidence: clamp(45 + chainLength * 5, 0, 82), evidence: "Connected line-segment endpoint path" })
  }
  return cues
}

function buildCandidates(
  cues: VisionFunctionalGroupCue[],
  rings: VisionRingCandidate[],
  parallelLinePairs: number,
  chainLength: number,
  recognizedText: string,
): VisionCompoundCandidate[] {
  const text = recognizedText.toLowerCase().replace(/[^a-z0-9=#-]/g, "")
  const hasCue = (kind: VisionFunctionalGroupCue["kind"]) => cues.some((cue) => cue.kind === kind)
  const candidates: VisionCompoundCandidate[] = []
  const add = (compoundId: string, label: string, score: number, reasons: string[]) => {
    candidates.push({ compoundId, label, score: clamp(Math.round(score), 0, 58), reasons })
  }

  const benzeneRing = rings.some((ring) => ring.benzeneLike)
  if (benzeneRing) {
    const reasons = ["Six-membered closed ring candidate"]
    let score = 38
    if (parallelLinePairs >= 2) {
      score += 12
      reasons.push("Alternating double-bond-like parallel strokes")
    }
    if (/benzene|aromatic|c6h6|phenyl|hexagon|ring/.test(text)) {
      score += 10
      reasons.push("Aromatic OCR cue")
    }
    add("benzene", "Benzene", score, reasons)
  }

  if (hasCue("carbonyl")) {
    const methanalReasons = ["Carbonyl-like double bond and C/O cue"]
    let methanalScore = 38
    const explicitMethanal = /h2c=?o|hcho|och2|formaldehyde|methanal/.test(text)
    if (explicitMethanal) {
      methanalScore += 16
      methanalReasons.push("H2C=O / HCHO text arrangement")
    } else if (chainLength > 0 && chainLength <= 2) {
      methanalScore += 7
      methanalReasons.push("Small carbonyl skeleton")
    }
    add("methanal", "Methanal", methanalScore, methanalReasons)

    if (!explicitMethanal && (chainLength >= 3 || /ch3coch3|propanone|acetone/.test(text))) {
      add("acetone", "Acetone", 36 + Math.min(16, chainLength * 3), ["Carbonyl cue within a longer carbon chain"])
    }
  }

  if (hasCue("carboxyl")) {
    add("ethanoic-acid", "Ethanoic acid", chainLength >= 2 ? 54 : 47, ["COOH-like visual cue", "Carbon chain attached to carboxyl group"])
  }

  if (hasCue("hydroxyl") && chainLength >= 2) {
    const formulaCue = /ch3ch2oh|c2h5oh|cco-h|ccoh/.test(text)
    add("ethanol", "Ethanol", 38 + Math.min(10, chainLength * 3) + (formulaCue ? 10 : 0), [
      "Hydroxyl cue at a simple chain",
      formulaCue ? "C-C-O-H text sequence" : "Connected chain with terminal O-H cue",
    ])
  }

  if (parallelLinePairs > 0 && chainLength === 2 && !hasCue("carbonyl")) {
    add("ethene", "Ethene", 34, ["Two-atom chain with a double-bond-like line pair"])
  }

  return candidates.sort((left, right) => right.score - left.score || left.label.localeCompare(right.label)).slice(0, 5)
}

export function analyzeDarkPixelMask(mask: DarkPixelMask, recognizedText = ""): StructureVisionAnalysis {
  const lineSegments = detectLineSegments(mask)
  const closedLoops = detectClosedLoops(mask)
  const ringCandidates = detectRingCandidates(mask, closedLoops, lineSegments)
  const parallelLinePairs = countParallelLinePairs(lineSegments, mask)
  const simpleChainLength = estimateSimpleChainLength(lineSegments, mask)
  const functionalGroupCues = buildCues(ringCandidates, parallelLinePairs, simpleChainLength, recognizedText)
  const candidates = buildCandidates(functionalGroupCues, ringCandidates, parallelLinePairs, simpleChainLength, recognizedText)
  const visualConfidence = candidates[0]?.score ?? 0
  const darkPixelRatio = mask.darkPixelCount / Math.max(1, mask.width * mask.height)
  const warnings: string[] = []
  if (darkPixelRatio < 0.003) warnings.push("Very few dark strokes were detected. Increase contrast or crop closer.")
  if (darkPixelRatio > 0.42) warnings.push("The preview is unusually dark. Reduce contrast or use a cleaner crop.")
  if (!lineSegments.length) warnings.push("No stable bond-like line segments were detected.")

  return {
    width: mask.width,
    height: mask.height,
    darkPixelCount: mask.darkPixelCount,
    darkPixelRatio,
    threshold: mask.threshold,
    lineSegments,
    closedLoops,
    ringCandidates,
    parallelLinePairs,
    simpleChainLength,
    functionalGroupCues,
    candidates,
    visualConfidence,
    isUncertain: visualConfidence < 45,
    warnings,
  }
}
