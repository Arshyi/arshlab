import { ALL_ELEMENTS } from "@/lib/chemistry/database/periodic-table"
import { REACTION_RECORDS, parseEquation } from "@/lib/chemistry/reactions"
import type {
  EmpiricalFormulaInput,
  SolverModuleId,
  SolverModuleMeta,
  SolverPracticeExample,
  SolverResult,
  SolverStep,
  StoichiometryInput,
} from "./types"

const R_IDEAL_GAS = 0.08206

export const SOLVER_MODULES: SolverModuleMeta[] = [
  {
    id: "molarity",
    title: "Molarity Solver",
    formula: "M = n / V",
    difficulty: "Introductory",
    topic: "Chemistry Calculations",
    commonMistakes: ["Using mL instead of L", "Putting volume over moles", "Rounding too early"],
    unitReminders: ["Moles use mol", "Volume must be in L", "Molarity uses mol/L or M"],
  },
  {
    id: "dilution",
    title: "Dilution Solver",
    formula: "M1V1 = M2V2",
    difficulty: "Introductory",
    topic: "Chemistry Calculations",
    commonMistakes: ["Mixing mL and L in the same equation", "Solving the wrong variable", "Assuming moles change during dilution"],
    unitReminders: ["V1 and V2 can both be mL or both be L", "M1 and M2 use the same concentration unit", "Dilution conserves solute moles"],
  },
  {
    id: "percent-yield",
    title: "Percent Yield",
    formula: "percent yield = (actual / theoretical) x 100",
    difficulty: "Introductory",
    topic: "Chemistry Calculations",
    commonMistakes: ["Reversing actual and theoretical yield", "Forgetting to multiply by 100", "Mixing grams and moles"],
    unitReminders: ["Actual and theoretical yield need matching units", "Percent yield is reported as %", "Values over 100% usually signal experimental or calculation error"],
  },
  {
    id: "empirical-formula",
    title: "Empirical Formula",
    formula: "mass -> moles -> mole ratio -> whole-number formula",
    difficulty: "Intermediate",
    topic: "Chemistry Calculations",
    commonMistakes: ["Dividing masses directly instead of converting to moles", "Rounding ratios too early", "Forgetting to multiply fractional ratios"],
    unitReminders: ["Mass is in g", "Moles = mass / atomic mass", "Empirical formulas use whole-number atom ratios"],
  },
  {
    id: "ideal-gas-law",
    title: "Ideal Gas Law",
    formula: "PV = nRT",
    difficulty: "Intermediate",
    topic: "Chemistry Calculations",
    commonMistakes: ["Using Celsius instead of Kelvin", "Using the wrong R value for the units", "Leaving more than one variable unknown"],
    unitReminders: ["P in atm", "V in L", "n in mol", "T in K", "R = 0.08206 L atm mol^-1 K^-1"],
  },
  {
    id: "calorimetry",
    title: "Calorimetry",
    formula: "q = mc delta T",
    difficulty: "Introductory",
    topic: "Chemistry Calculations",
    commonMistakes: ["Using final temperature instead of delta T", "Forgetting the sign of temperature change", "Mixing J and kJ"],
    unitReminders: ["m in g", "c in J/g C", "delta T in C", "q in J"],
  },
  {
    id: "ph",
    title: "pH Calculator",
    formula: "pH = -log10([H+])",
    difficulty: "Introductory",
    topic: "Chemistry Calculations",
    commonMistakes: ["Using natural log instead of log base 10", "Entering pH instead of [H+]", "Forgetting pH + pOH = 14 at 25 C"],
    unitReminders: ["[H+] is in mol/L", "pH and pOH are unitless", "pOH assumes 25 C water conditions"],
  },
  {
    id: "stoichiometry",
    title: "Stoichiometry Solver",
    formula: "balanced mole ratio from coefficients",
    difficulty: "Intermediate",
    topic: "Chemistry Calculations",
    commonMistakes: ["Using an unbalanced equation", "Using formula subscripts as mole ratios", "Skipping the coefficient ratio"],
    unitReminders: ["Amounts are in mol for this alpha", "Coefficients give mole ratios", "Final product amount is in mol"],
  },
]

export const SOLVER_PRACTICE_EXAMPLES: SolverPracticeExample[] = [
  {
    id: "molarity-1",
    moduleId: "molarity",
    question: "A solution contains 0.250 mol solute in 0.500 L solution. What is the molarity?",
    correctAnswer: "0.500 M",
    explanation: "M = n / V = 0.250 mol / 0.500 L = 0.500 mol/L.",
    distractors: ["2.00 M", "0.125 M", "0.750 M"],
  },
  {
    id: "dilution-1",
    moduleId: "dilution",
    question: "What final volume is needed to dilute 2.0 M, 0.100 L stock to 0.500 M?",
    correctAnswer: "0.400 L",
    explanation: "M1V1 = M2V2, so V2 = (2.0 M x 0.100 L) / 0.500 M = 0.400 L.",
    distractors: ["0.025 L", "0.200 L", "1.00 L"],
  },
  {
    id: "percent-yield-1",
    moduleId: "percent-yield",
    question: "A reaction gives 8.0 g product when 10.0 g was expected. What is the percent yield?",
    correctAnswer: "80.0%",
    explanation: "Percent yield = (actual / theoretical) x 100 = (8.0 / 10.0) x 100 = 80.0%.",
    distractors: ["125%", "18.0%", "20.0%"],
  },
  {
    id: "empirical-formula-1",
    moduleId: "empirical-formula",
    question: "A sample contains 12.0 g C and 3.0 g H. What is the empirical formula?",
    correctAnswer: "CH3",
    explanation: "C: 12.0/12.011 = 0.999 mol. H: 3.0/1.008 = 2.976 mol. Ratio is about 1:3, so CH3.",
    distractors: ["C3H", "CH", "C2H6"],
  },
  {
    id: "ideal-gas-1",
    moduleId: "ideal-gas-law",
    question: "What volume does 1.00 mol gas occupy at 1.00 atm and 273 K using R = 0.08206?",
    correctAnswer: "22.4 L",
    explanation: "V = nRT / P = (1.00 x 0.08206 x 273) / 1.00 = 22.4 L.",
    distractors: ["0.0446 L", "11.2 L", "273 L"],
  },
  {
    id: "calorimetry-1",
    moduleId: "calorimetry",
    question: "Find q for 50.0 g water, c = 4.184 J/g C, and delta T = 10.0 C.",
    correctAnswer: "2090 J",
    explanation: "q = mc delta T = 50.0 x 4.184 x 10.0 = 2092 J, about 2090 J.",
    distractors: ["20.9 J", "502 J", "418 J"],
  },
  {
    id: "ph-1",
    moduleId: "ph",
    question: "What is the pH of a solution with [H+] = 1.0 x 10^-3 M?",
    correctAnswer: "3.00",
    explanation: "pH = -log10(1.0 x 10^-3) = 3.00.",
    distractors: ["11.00", "-3.00", "1.00"],
  },
  {
    id: "stoichiometry-1",
    moduleId: "stoichiometry",
    question: "For 2H2 + O2 -> 2H2O, how many mol H2O form from 2.0 mol H2?",
    correctAnswer: "2.00 mol H2O",
    explanation: "The H2:H2O coefficient ratio is 2:2, so 2.0 mol H2 produces 2.0 mol H2O.",
    distractors: ["1.00 mol H2O", "4.00 mol H2O", "0.500 mol H2O"],
  },
]

function metaFor(moduleId: SolverModuleId): SolverModuleMeta {
  const meta = SOLVER_MODULES.find((module) => module.id === moduleId)
  if (!meta) throw new Error(`Unknown solver module: ${moduleId}`)
  return meta
}

function formatNumber(value: number, digits = 3): string {
  if (!Number.isFinite(value)) return "unavailable"
  if (Math.abs(value) >= 1000 || (Math.abs(value) > 0 && Math.abs(value) < 0.001)) {
    return value.toExponential(3)
  }
  return Number(value.toPrecision(digits)).toString()
}

function assertPositive(value: number, label: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be greater than zero.`)
  }
}

function result(moduleId: SolverModuleId, steps: SolverStep[], answer: string): SolverResult {
  const meta = metaFor(moduleId)
  return {
    moduleId,
    title: meta.title,
    difficulty: meta.difficulty,
    topic: meta.topic,
    commonMistakes: meta.commonMistakes,
    unitReminders: meta.unitReminders,
    steps,
    answer,
  }
}

export function solveMolarity(moles: number, volumeL: number): SolverResult {
  assertPositive(moles, "Moles")
  assertPositive(volumeL, "Volume")
  const molarity = moles / volumeL
  const answer = `${formatNumber(molarity)} M`
  return result("molarity", [
    { label: "Given", expression: `n = ${moles} mol; V = ${volumeL} L`, detail: "Moles and volume are both known." },
    { label: "Formula", expression: "M = n / V", detail: "Molarity is moles of solute per liter of solution." },
    { label: "Substitution", expression: `M = ${moles} mol / ${volumeL} L`, detail: "Substitute moles for n and liters for V." },
    { label: "Calculation", expression: `M = ${formatNumber(molarity)} mol/L`, detail: "Divide moles by volume." },
    { label: "Answer", expression: answer, detail: "The solution concentration is the calculated molarity." },
    { label: "Unit Check", expression: "mol / L = M", detail: "The unit reduces to molarity, so the unit is consistent." },
  ], answer)
}

export function solveDilution(values: { m1?: number; v1?: number; m2?: number; v2?: number }): SolverResult {
  const entries = Object.entries(values)
  const missing = entries.filter(([, value]) => value === undefined || Number.isNaN(value)).map(([key]) => key)
  if (missing.length !== 1) throw new Error("Leave exactly one dilution variable blank.")
  for (const [key, value] of entries) {
    if (!missing.includes(key)) assertPositive(value as number, key.toUpperCase())
  }

  const { m1, v1, m2, v2 } = values
  let calculated = 0
  let variable = missing[0].toUpperCase()
  if (missing[0] === "m1") calculated = ((m2 as number) * (v2 as number)) / (v1 as number)
  if (missing[0] === "v1") calculated = ((m2 as number) * (v2 as number)) / (m1 as number)
  if (missing[0] === "m2") calculated = ((m1 as number) * (v1 as number)) / (v2 as number)
  if (missing[0] === "v2") calculated = ((m1 as number) * (v1 as number)) / (m2 as number)
  const answer = `${variable} = ${formatNumber(calculated)}`

  return result("dilution", [
    { label: "Given", expression: `M1 = ${m1 ?? "?"}; V1 = ${v1 ?? "?"}; M2 = ${m2 ?? "?"}; V2 = ${v2 ?? "?"}`, detail: "One variable is unknown and the other three are known." },
    { label: "Formula", expression: "M1V1 = M2V2", detail: "Dilution keeps moles of solute constant." },
    { label: "Substitution", expression: `${m1 ?? variable} x ${v1 ?? variable} = ${m2 ?? variable} x ${v2 ?? variable}`, detail: "Place the known values into the dilution equation." },
    { label: "Calculation", expression: answer, detail: `Rearrange to isolate ${variable}.` },
    { label: "Answer", expression: answer, detail: "Use consistent volume units across both sides." },
    { label: "Unit Check", expression: "M x V = M x V", detail: "Both sides represent amount of solute, so matching volume units cancel properly." },
  ], answer)
}

export function solvePercentYield(actual: number, theoretical: number): SolverResult {
  assertPositive(actual, "Actual yield")
  assertPositive(theoretical, "Theoretical yield")
  const percent = (actual / theoretical) * 100
  const answer = `${formatNumber(percent)}%`
  return result("percent-yield", [
    { label: "Given", expression: `actual = ${actual}; theoretical = ${theoretical}`, detail: "Both yields must be in the same unit." },
    { label: "Formula", expression: "percent yield = (actual / theoretical) x 100", detail: "Compare what was obtained to what was predicted." },
    { label: "Substitution", expression: `percent yield = (${actual} / ${theoretical}) x 100`, detail: "Substitute actual yield over theoretical yield." },
    { label: "Calculation", expression: `percent yield = ${formatNumber(percent)}`, detail: "Convert the fraction to a percentage." },
    { label: "Answer", expression: answer, detail: "Report percent yield with a percent sign." },
    { label: "Unit Check", expression: "same unit / same unit x 100 = %", detail: "Yield units cancel because they match." },
  ], answer)
}

function findElement(value: string) {
  const key = value.trim().toLowerCase()
  return ALL_ELEMENTS.find((element) => element.symbol.toLowerCase() === key || element.name.toLowerCase() === key)
}

function empiricalMultiplier(ratios: number[]): number {
  for (const multiplier of [1, 2, 3, 4, 5, 6]) {
    if (ratios.every((ratio) => Math.abs(ratio * multiplier - Math.round(ratio * multiplier)) < 0.08)) {
      return multiplier
    }
  }
  return 1
}

export function solveEmpiricalFormula(rows: EmpiricalFormulaInput[]): SolverResult {
  const validRows = rows.filter((row) => row.element.trim() && Number.isFinite(row.mass) && row.mass > 0)
  if (validRows.length < 2) throw new Error("Enter at least two elements with positive masses.")

  const moleRows = validRows.map((row) => {
    const element = findElement(row.element)
    if (!element) throw new Error(`Element not found: ${row.element}`)
    return {
      element,
      mass: row.mass,
      moles: row.mass / element.atomicMass,
    }
  })
  const minMoles = Math.min(...moleRows.map((row) => row.moles))
  const ratios = moleRows.map((row) => row.moles / minMoles)
  const multiplier = empiricalMultiplier(ratios)
  const wholeNumbers = ratios.map((ratio) => Math.max(1, Math.round(ratio * multiplier)))
  const formula = moleRows
    .map((row, index) => `${row.element.symbol}${wholeNumbers[index] === 1 ? "" : wholeNumbers[index]}`)
    .join("")

  return result("empirical-formula", [
    { label: "Given", expression: validRows.map((row) => `${row.element}: ${row.mass} g`).join("; "), detail: "Masses are given for each element." },
    { label: "Formula", expression: "moles = mass / atomic mass", detail: "Convert each element mass to moles before comparing atoms." },
    { label: "Substitution", expression: moleRows.map((row) => `${row.element.symbol}: ${row.mass} / ${row.element.atomicMass}`).join("; "), detail: "Use local periodic-table atomic masses." },
    { label: "Calculation", expression: moleRows.map((row, index) => `${row.element.symbol}: ${formatNumber(row.moles)} mol -> ratio ${formatNumber(ratios[index])}`).join("; "), detail: "Divide all mole values by the smallest mole value." },
    { label: "Answer", expression: formula, detail: multiplier > 1 ? `Ratios were multiplied by ${multiplier} to reach whole numbers.` : "The ratios were already close to whole numbers." },
    { label: "Unit Check", expression: "g / (g/mol) = mol; ratios are unitless", detail: "The final formula uses atom ratios, not grams." },
  ], formula)
}

export function solveIdealGas(values: { p?: number; v?: number; n?: number; t?: number }): SolverResult {
  const entries = Object.entries(values)
  const missing = entries.filter(([, value]) => value === undefined || Number.isNaN(value)).map(([key]) => key)
  if (missing.length !== 1) throw new Error("Leave exactly one ideal gas variable blank.")
  for (const [key, value] of entries) {
    if (!missing.includes(key)) assertPositive(value as number, key.toUpperCase())
  }

  const { p, v, n, t } = values
  let calculated = 0
  let variable = missing[0].toUpperCase()
  if (missing[0] === "p") calculated = ((n as number) * R_IDEAL_GAS * (t as number)) / (v as number)
  if (missing[0] === "v") calculated = ((n as number) * R_IDEAL_GAS * (t as number)) / (p as number)
  if (missing[0] === "n") calculated = ((p as number) * (v as number)) / (R_IDEAL_GAS * (t as number))
  if (missing[0] === "t") calculated = ((p as number) * (v as number)) / ((n as number) * R_IDEAL_GAS)
  const unit = missing[0] === "p" ? "atm" : missing[0] === "v" ? "L" : missing[0] === "n" ? "mol" : "K"
  const answer = `${variable} = ${formatNumber(calculated)} ${unit}`

  return result("ideal-gas-law", [
    { label: "Given", expression: `P = ${p ?? "?"} atm; V = ${v ?? "?"} L; n = ${n ?? "?"} mol; T = ${t ?? "?"} K`, detail: "One gas variable is unknown." },
    { label: "Formula", expression: "PV = nRT", detail: "Use R = 0.08206 L atm mol^-1 K^-1 for atm, L, mol, K." },
    { label: "Substitution", expression: `${p ?? variable} x ${v ?? variable} = ${n ?? variable} x 0.08206 x ${t ?? variable}`, detail: "Substitute all known values." },
    { label: "Calculation", expression: answer, detail: `Rearrange to isolate ${variable}.` },
    { label: "Answer", expression: answer, detail: "Report the missing variable with its unit." },
    { label: "Unit Check", expression: "atm L = mol x L atm mol^-1 K^-1 x K", detail: "The units cancel to the requested variable." },
  ], answer)
}

export function solveCalorimetry(mass: number, specificHeat: number, deltaT: number): SolverResult {
  assertPositive(mass, "Mass")
  assertPositive(specificHeat, "Specific heat")
  if (!Number.isFinite(deltaT) || deltaT === 0) throw new Error("Delta T must be nonzero.")
  const q = mass * specificHeat * deltaT
  const answer = `${formatNumber(q)} J`
  return result("calorimetry", [
    { label: "Given", expression: `m = ${mass} g; c = ${specificHeat} J/g C; delta T = ${deltaT} C`, detail: "Heat depends on mass, specific heat, and temperature change." },
    { label: "Formula", expression: "q = mc delta T", detail: "This calculates heat absorbed or released." },
    { label: "Substitution", expression: `q = ${mass} x ${specificHeat} x ${deltaT}`, detail: "Substitute values directly." },
    { label: "Calculation", expression: `q = ${formatNumber(q)} J`, detail: q > 0 ? "Positive q means heat is absorbed." : "Negative q means heat is released." },
    { label: "Answer", expression: answer, detail: "Keep the sign if direction of heat flow matters." },
    { label: "Unit Check", expression: "g x J/g C x C = J", detail: "Grams and degrees cancel, leaving joules." },
  ], answer)
}

export function solvePh(hydrogenIon: number): SolverResult {
  assertPositive(hydrogenIon, "[H+]")
  const ph = -Math.log10(hydrogenIon)
  const poh = 14 - ph
  const answer = `pH = ${formatNumber(ph)}; pOH = ${formatNumber(poh)}`
  return result("ph", [
    { label: "Given", expression: `[H+] = ${hydrogenIon} M`, detail: "Hydrogen ion concentration is known." },
    { label: "Formula", expression: "pH = -log10([H+])", detail: "pH uses base-10 logarithms." },
    { label: "Substitution", expression: `pH = -log10(${hydrogenIon})`, detail: "Substitute the concentration in mol/L." },
    { label: "Calculation", expression: `pH = ${formatNumber(ph)}; pOH = 14 - ${formatNumber(ph)} = ${formatNumber(poh)}`, detail: "pOH assumes 25 C where pH + pOH = 14." },
    { label: "Answer", expression: answer, detail: "Lower pH means more acidic solution." },
    { label: "Unit Check", expression: "log of concentration gives a unitless pH", detail: "pH and pOH are reported without units." },
  ], answer)
}

export function solveStoichiometry(input: StoichiometryInput): SolverResult {
  const reaction = REACTION_RECORDS.find((record) => record.id === input.reactionId)
  if (!reaction) throw new Error("Select a reaction.")
  assertPositive(input.knownMoles, "Known amount")
  const parsed = parseEquation(reaction.balancedEquation)
  if (!parsed) throw new Error("Could not parse the balanced equation.")
  const known = parsed.reactants.find((species) => species.formula === input.knownFormula)
  const target = parsed.products.find((species) => species.formula === input.targetFormula)
  if (!known || !target) throw new Error("Select a reactant and product from the balanced equation.")
  const productMoles = input.knownMoles * (target.coefficient / known.coefficient)
  const answer = `${formatNumber(productMoles)} mol ${target.formula}`

  return result("stoichiometry", [
    { label: "Given", expression: `${input.knownMoles} mol ${known.formula}; target = ${target.formula}`, detail: "The known amount is in moles." },
    { label: "Formula", expression: reaction.balancedEquation, detail: "Use the balanced equation from the local Reaction Database." },
    { label: "Substitution", expression: `${input.knownMoles} mol ${known.formula} x (${target.coefficient} mol ${target.formula} / ${known.coefficient} mol ${known.formula})`, detail: "Build the mole ratio from coefficients." },
    { label: "Calculation", expression: `${input.knownMoles} x ${target.coefficient} / ${known.coefficient} = ${formatNumber(productMoles)}`, detail: "Multiply by the product-to-reactant coefficient ratio." },
    { label: "Answer", expression: answer, detail: "This alpha reports the final product amount in moles." },
    { label: "Unit Check", expression: `mol ${known.formula} cancels -> mol ${target.formula}`, detail: "The known reactant unit cancels, leaving product moles." },
  ], answer)
}

export function getSolverModule(moduleId: SolverModuleId): SolverModuleMeta {
  return metaFor(moduleId)
}

export function getSolverMetrics() {
  return {
    solverModules: SOLVER_MODULES.length,
    workedExamplesGenerated: SOLVER_PRACTICE_EXAMPLES.length,
    topicsCovered: Array.from(new Set(SOLVER_MODULES.map((module) => module.topic))).length,
  }
}
