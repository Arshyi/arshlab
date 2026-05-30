import { VSEPR_SHAPES, type VSEPRShapeDefinition, type VSEPRShapeId } from "./shapes"
import { VSEPR_PRESETS, type VSEPRPrediction } from "./presets"

export function getVSEPRById(id: string): VSEPRPrediction | undefined {
  return VSEPR_PRESETS.find((v) => v.id === id)
}

export function getVSEPRByFormula(formula: string): VSEPRPrediction | undefined {
  const q = formula.replace(/\s/g, "").toLowerCase()
  return VSEPR_PRESETS.find((v) => v.formula.replace(/\s/g, "").toLowerCase() === q)
}

export function getShapeDefinition(shapeId: VSEPRShapeId): VSEPRShapeDefinition | undefined {
  return VSEPR_SHAPES.find((s) => s.id === shapeId)
}

/**
 * Predict VSEPR from steric number and lone pair count.
 * Scalable rule-based engine — extend with ML later.
 */
export function predictVSEPR(
  stericNumber: number,
  lonePairs: number,
): VSEPRPrediction | null {
  const bondingPairs = stericNumber - lonePairs
  if (bondingPairs < 1 || lonePairs < 0) return null

  const shape = VSEPR_SHAPES.find(
    (s) => s.stericNumber === stericNumber && s.lonePairs === lonePairs,
  )
  if (!shape) return null

  return {
    id: `vsepr-predicted-sn${stericNumber}-lp${lonePairs}`,
    formula: "",
    name: "Predicted geometry",
    stericNumber,
    lonePairs,
    bondingPairs,
    electronGeometry: shape.electronGeometry,
    molecularGeometry: shape.molecularGeometry,
    shapeId: shape.id,
    bondAngle: shape.typicalBondAngle,
    notes: `Steric number = ${stericNumber}; ${bondingPairs} bonding pairs, ${lonePairs} lone pair(s).`,
  }
}

export function searchVSEPR(query: string): VSEPRPrediction[] {
  const q = query.toLowerCase().trim()
  return VSEPR_PRESETS.filter(
    (v) =>
      v.name.toLowerCase().includes(q) ||
      v.formula.toLowerCase().includes(q) ||
      v.molecularGeometry.toLowerCase().includes(q) ||
      v.shapeId.includes(q),
  )
}

export { VSEPR_SHAPES, VSEPR_PRESETS }
