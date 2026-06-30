import type { VisionPoint } from "./vision-types"
import type { AtomCenterEstimate, PrimitiveBond } from "./vision-reconstruction-report"

function orientation(a: VisionPoint, b: VisionPoint, c: VisionPoint): number {
  return (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y)
}

function segmentsIntersect(a: VisionPoint, b: VisionPoint, c: VisionPoint, d: VisionPoint): boolean {
  return orientation(a, b, c) * orientation(a, b, d) < 0 && orientation(c, d, a) * orientation(c, d, b) < 0
}

function endpointFor(atoms: AtomCenterEstimate[], id: number): VisionPoint {
  return atoms.find((atom) => atom.id === id)?.point ?? { x: 0, y: 0 }
}

function sharesAtom(left: PrimitiveBond, right: PrimitiveBond): boolean {
  return [left.startAtomId, left.endAtomId].some((atomId) => atomId === right.startAtomId || atomId === right.endAtomId)
}

export function filterCrossingBonds(
  bonds: PrimitiveBond[],
  atomCenters: AtomCenterEstimate[],
): { accepted: PrimitiveBond[]; rejected: PrimitiveBond[] } {
  const accepted = bonds.map((bond) => ({ ...bond }))
  const rejected: PrimitiveBond[] = []

  for (let leftIndex = 0; leftIndex < accepted.length; leftIndex += 1) {
    const left = accepted[leftIndex]
    if (left.rejected) continue
    const leftStart = endpointFor(atomCenters, left.startAtomId)
    const leftEnd = endpointFor(atomCenters, left.endAtomId)
    for (let rightIndex = leftIndex + 1; rightIndex < accepted.length; rightIndex += 1) {
      const right = accepted[rightIndex]
      if (right.rejected || sharesAtom(left, right)) continue
      const rightStart = endpointFor(atomCenters, right.startAtomId)
      const rightEnd = endpointFor(atomCenters, right.endAtomId)
      if (!segmentsIntersect(leftStart, leftEnd, rightStart, rightEnd)) continue
      const weaker = left.confidence <= right.confidence ? left : right
      weaker.rejected = true
      weaker.rejectionReason = "Rejected as an X-crossing bond rather than a chemical junction."
    }
  }

  return {
    accepted: accepted.filter((bond) => !bond.rejected).map((bond, id) => ({ ...bond, id })),
    rejected: [
      ...rejected,
      ...accepted.filter((bond) => bond.rejected).map((bond, id) => ({ ...bond, id })),
    ],
  }
}
