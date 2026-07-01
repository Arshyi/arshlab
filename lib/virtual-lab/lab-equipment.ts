import type { LabEquipment } from "./experiment-types"

export const LAB_EQUIPMENT: LabEquipment[] = [
  { id: "beaker", name: "Beaker", category: "glassware", svgKind: "beaker", controls: ["fill", "pour", "stir"], purpose: "Hold, mix, and heat solutions." },
  { id: "erlenmeyer-flask", name: "Erlenmeyer flask", category: "glassware", svgKind: "erlenmeyer", controls: ["swirl", "heat"], purpose: "Mix solutions with reduced splash risk." },
  { id: "round-bottom-flask", name: "Round-bottom flask", category: "glassware", svgKind: "round-bottom", controls: ["heat", "stir", "reflux"], purpose: "Run heated organic reactions." },
  { id: "separatory-funnel", name: "Separatory funnel", category: "glassware", svgKind: "separatory", controls: ["shake", "vent", "drain"], purpose: "Separate immiscible liquid layers." },
  { id: "graduated-cylinder", name: "Graduated cylinder", category: "glassware", svgKind: "cylinder", controls: ["read-meniscus"], purpose: "Measure liquid volume." },
  { id: "pipette", name: "Pipette", category: "glassware", svgKind: "pipette", controls: ["draw", "dispense"], purpose: "Transfer accurate liquid volumes." },
  { id: "burette", name: "Burette", category: "glassware", svgKind: "burette", controls: ["titrate", "read-meniscus"], purpose: "Deliver measured titrant volumes." },
  { id: "condenser", name: "Condenser", category: "glassware", svgKind: "condenser", controls: ["water-on", "reflux"], purpose: "Condense vapors during reflux or distillation." },
  { id: "funnel", name: "Funnel", category: "glassware", svgKind: "funnel", controls: ["pour", "filter"], purpose: "Guide liquid and support filtration." },
  { id: "filter-paper", name: "Filter paper", category: "support", svgKind: "filter-paper", controls: ["fold", "wet"], purpose: "Trap solid impurities or crystals." },
  { id: "watch-glass", name: "Watch glass", category: "glassware", svgKind: "watch-glass", controls: ["cover", "evaporate"], purpose: "Cover vessels or evaporate small samples." },
  { id: "test-tube", name: "Test tube", category: "glassware", svgKind: "test-tube", controls: ["heat", "observe"], purpose: "Small-scale observations and reactions." },
  { id: "support-stand", name: "Support stand", category: "support", svgKind: "stand", controls: ["clamp"], purpose: "Hold glassware safely." },
  { id: "hot-plate", name: "Hot plate", category: "heating", svgKind: "hot-plate", controls: ["temperature", "stir-rate"], purpose: "Heat and stir reaction mixtures." },
  { id: "magnetic-stirrer", name: "Magnetic stirrer", category: "heating", svgKind: "stirrer", controls: ["stir-rate"], purpose: "Mix solutions consistently." },
  { id: "heating-mantle", name: "Heating mantle", category: "heating", svgKind: "mantle", controls: ["temperature"], purpose: "Heat round-bottom flasks evenly." },
  { id: "ice-bath", name: "Ice bath", category: "heating", svgKind: "ice-bath", controls: ["cool"], purpose: "Cool reactions or promote crystallization." },
  { id: "vacuum-filtration", name: "Vacuum filtration", category: "instrument", svgKind: "vacuum", controls: ["vacuum-on"], purpose: "Collect crystals quickly." },
  { id: "rotary-evaporator", name: "Rotary evaporator", category: "instrument", svgKind: "rotovap", controls: ["rotate", "vacuum", "bath-temp"], purpose: "Remove solvent gently." },
  { id: "balance", name: "Balance", category: "instrument", svgKind: "balance", controls: ["tare", "weigh"], purpose: "Measure mass." },
  { id: "thermometer", name: "Thermometer", category: "instrument", svgKind: "thermometer", controls: ["read"], purpose: "Monitor temperature." },
  { id: "ph-meter", name: "pH meter", category: "instrument", svgKind: "meter", controls: ["calibrate", "read"], purpose: "Measure acidity." },
  { id: "uv-lamp", name: "UV lamp", category: "analysis", svgKind: "uv-lamp", controls: ["254 nm", "365 nm"], purpose: "Visualize TLC spots." },
  { id: "ir-spectrometer", name: "IR spectrometer", category: "analysis", svgKind: "spectrometer", controls: ["scan"], purpose: "Measure bond vibrations." },
  { id: "nmr-spectrometer", name: "NMR spectrometer", category: "analysis", svgKind: "spectrometer", controls: ["acquire"], purpose: "Measure nuclear environments." },
  { id: "mass-spectrometer", name: "Mass spectrometer", category: "analysis", svgKind: "spectrometer", controls: ["ionize"], purpose: "Measure molecular ions and fragments." },
  { id: "gas-chromatograph", name: "Gas chromatograph", category: "analysis", svgKind: "gc", controls: ["inject", "temperature-program"], purpose: "Separate volatile components." },
]

export function getLabEquipment(id: string): LabEquipment | undefined {
  return LAB_EQUIPMENT.find((item) => item.id === id)
}

export function listEquipmentByCategory(category: LabEquipment["category"]): LabEquipment[] {
  return LAB_EQUIPMENT.filter((item) => item.category === category)
}

export function equipmentSvgPath(svgKind: string): string {
  const paths: Record<string, string> = {
    beaker: "M30 20 L38 118 Q80 132 122 118 L130 20 M42 42 H118 M46 74 H114",
    erlenmeyer: "M72 18 H88 L92 55 L128 122 Q80 138 32 122 L68 55 Z",
    "round-bottom": "M70 15 H90 L90 45 Q124 64 124 100 Q124 132 80 132 Q36 132 36 100 Q36 64 70 45 Z",
    separatory: "M80 16 Q125 42 108 88 L88 118 L72 118 L52 88 Q35 42 80 16 Z M70 118 H90 L84 138 H76 Z",
    cylinder: "M58 18 Q80 10 102 18 L102 126 Q80 138 58 126 Z M62 42 H94 M62 66 H94 M62 90 H94",
    pipette: "M78 14 Q92 26 80 42 L82 126 L76 126 L78 42 Q64 26 78 14 Z",
    burette: "M76 10 H86 L84 126 L78 126 Z M68 126 H94 M74 138 H88",
    condenser: "M28 48 H132 M36 34 H124 V62 H36 Z M52 34 L108 62 M108 34 L52 62",
    funnel: "M36 22 H124 L90 70 L84 126 H76 L70 70 Z",
    "filter-paper": "M80 20 L124 92 Q80 126 36 92 Z M80 20 L80 116",
    "watch-glass": "M30 82 Q80 46 130 82 Q80 112 30 82 Z",
    "test-tube": "M58 16 H102 L96 112 Q80 136 64 112 Z",
    stand: "M44 134 H126 M82 18 V134 M82 38 H130 M124 32 V64",
    "hot-plate": "M34 78 H126 V124 H34 Z M54 64 Q80 44 106 64 M54 104 H76 M88 104 H108",
    stirrer: "M34 78 H126 V124 H34 Z M60 98 Q80 84 100 98",
    mantle: "M34 98 Q80 44 126 98 V124 H34 Z",
    "ice-bath": "M30 72 H130 L118 126 H42 Z M52 82 L62 92 M76 82 L86 92 M100 82 L110 92",
    vacuum: "M42 54 H118 L102 120 H58 Z M72 28 H88 V54 M112 92 H136",
    rotovap: "M30 88 Q54 62 78 88 Q54 118 30 88 M80 86 L126 54 M118 46 L136 64",
    balance: "M34 108 H126 M80 28 V108 M52 54 H108 M44 54 L34 88 H64 Z M116 54 L96 88 H126 Z",
    thermometer: "M74 18 H86 V92 Q104 108 80 132 Q56 108 74 92 Z",
    meter: "M36 52 H124 V120 H36 Z M58 76 H102 M72 98 H88",
    "uv-lamp": "M38 60 H122 V94 H38 Z M52 46 H108 M56 108 H104",
    spectrometer: "M30 58 H130 V124 H30 Z M48 76 H92 M48 94 H116 M104 48 L124 58",
    gc: "M34 34 H126 V130 H34 Z M52 54 H106 M52 76 H106 M52 110 H82",
  }
  return paths[svgKind] ?? paths.beaker
}
