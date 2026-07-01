import type { LabChemical, SafetyProfile, VirtualLabExperiment } from "./experiment-types"

const PPE_BY_HAZARD: Record<string, string> = {
  flammable: "Flame-resistant lab coat and no open flames",
  corrosive: "Splash goggles and acid/base-resistant gloves",
  toxic: "Work in a fume hood",
  oxidizer: "Keep away from organic waste and reducing agents",
  irritant: "Gloves and eye protection",
}

export function buildSafetyProfile(chemicals: LabChemical[]): SafetyProfile {
  const hazards = Array.from(new Set(chemicals.flatMap((chemical) => chemical.hazards)))
  const ppe = Array.from(new Set(hazards.map((hazard) => PPE_BY_HAZARD[hazard]).filter(Boolean)))
  return {
    hazards,
    ppe: ppe.length ? ppe : ["Goggles, gloves, and lab coat"],
    waste: hazards.includes("oxidizer")
      ? "Collect oxidizing waste separately."
      : hazards.includes("toxic")
        ? "Collect in labeled hazardous organic waste."
        : "Dispose according to instructor-provided waste stream.",
    notes: ["Educational simulation only.", "Always follow local laboratory rules in a real lab."],
  }
}

export function safetyChecklist(experiment: VirtualLabExperiment): string[] {
  return [
    ...experiment.safety.ppe.map((item) => `PPE: ${item}`),
    ...experiment.safety.hazards.map((hazard) => `Hazard: ${hazard}`),
    `Waste: ${experiment.safety.waste}`,
  ]
}
