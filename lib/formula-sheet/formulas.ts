import type { FormulaRecord } from "./types"

export const FORMULA_RECORDS: FormulaRecord[] = [
  {
    id: "stoichiometry-moles-from-mass",
    category: "Stoichiometry",
    name: "Moles from Mass",
    formula: "n = m / M",
    variables: [
      { symbol: "n", meaning: "amount of substance", unit: "mol" },
      { symbol: "m", meaning: "mass", unit: "g" },
      { symbol: "M", meaning: "molar mass", unit: "g/mol" },
    ],
    units: ["Use mass in grams.", "Use molar mass in g/mol.", "Answer is in mol."],
    description: "Converts a measured mass into moles using molar mass.",
    whenToUse: "Use when a problem gives mass and asks for moles or stoichiometric mole ratios.",
    commonMistakes: ["Using atomic number instead of molar mass", "Forgetting compound molar mass", "Rounding before the mole ratio step"],
    workedExample: [
      { label: "Given", expression: "m = 10.0 g NaCl; M = 58.44 g/mol", explanation: "Mass and molar mass are known." },
      { label: "Substitution", expression: "n = 10.0 / 58.44", explanation: "Divide mass by molar mass." },
      { label: "Answer", expression: "n = 0.171 mol NaCl", explanation: "The gram unit cancels, leaving mol." },
    ],
    keywords: ["moles", "mass", "molar mass", "stoichiometry"],
  },
  {
    id: "stoichiometry-moles-from-concentration",
    category: "Stoichiometry",
    name: "Moles from Concentration",
    formula: "n = C x V",
    variables: [
      { symbol: "n", meaning: "amount of solute", unit: "mol" },
      { symbol: "C", meaning: "concentration", unit: "mol/L" },
      { symbol: "V", meaning: "solution volume", unit: "L" },
    ],
    units: ["Convert mL to L.", "Concentration must be mol/L.", "Answer is in mol."],
    description: "Calculates moles of solute from solution concentration and volume.",
    whenToUse: "Use when concentration and solution volume are known.",
    commonMistakes: ["Using mL directly", "Confusing concentration with moles", "Not checking volume units"],
    workedExample: [
      { label: "Given", expression: "C = 0.200 mol/L; V = 0.250 L", explanation: "The volume is already in liters." },
      { label: "Substitution", expression: "n = 0.200 x 0.250", explanation: "Multiply concentration by volume." },
      { label: "Answer", expression: "n = 0.0500 mol", explanation: "L cancels from mol/L x L." },
    ],
    keywords: ["concentration", "moles", "solution", "stoichiometry"],
  },
  {
    id: "stoichiometry-percent-composition",
    category: "Stoichiometry",
    name: "Percent Composition",
    formula: "percent by mass = (element mass / compound molar mass) x 100",
    variables: [
      { symbol: "element mass", meaning: "mass contribution of one element in the formula", unit: "g/mol" },
      { symbol: "compound molar mass", meaning: "total molar mass of compound", unit: "g/mol" },
    ],
    units: ["Both masses must use the same unit.", "Final answer is percent."],
    description: "Finds what percent of a compound's mass comes from a given element.",
    whenToUse: "Use for empirical formula, composition, or element-by-mass questions.",
    commonMistakes: ["Using only one atom when the formula has multiple", "Forgetting to multiply by 100", "Using mass sample instead of formula mass"],
    workedExample: [
      { label: "Given", expression: "H2O: H mass = 2.016 g/mol; H2O molar mass = 18.015 g/mol", explanation: "Hydrogen appears twice in water." },
      { label: "Substitution", expression: "(2.016 / 18.015) x 100", explanation: "Divide element mass contribution by total molar mass." },
      { label: "Answer", expression: "11.2% H by mass", explanation: "The mass units cancel." },
    ],
    keywords: ["percent composition", "mass percent", "empirical formula"],
  },
  {
    id: "stoichiometry-percent-yield",
    category: "Stoichiometry",
    name: "Percent Yield",
    formula: "percent yield = (actual yield / theoretical yield) x 100",
    variables: [
      { symbol: "actual yield", meaning: "amount of product actually obtained", unit: "g, mol, or matching unit" },
      { symbol: "theoretical yield", meaning: "maximum product predicted by stoichiometry", unit: "same as actual yield" },
    ],
    units: ["Actual and theoretical yield must use the same unit.", "Final answer is percent."],
    description: "Compares experimental yield to the maximum possible yield.",
    whenToUse: "Use after theoretical yield has been calculated and actual yield is known.",
    commonMistakes: ["Reversing actual and theoretical yield", "Forgetting to multiply by 100", "Mixing grams and moles"],
    workedExample: [
      { label: "Given", expression: "actual = 8.0 g; theoretical = 10.0 g", explanation: "Both yields use grams." },
      { label: "Substitution", expression: "(8.0 / 10.0) x 100", explanation: "Actual yield goes on top." },
      { label: "Answer", expression: "80.0%", explanation: "The gram units cancel." },
    ],
    keywords: ["percent yield", "actual yield", "theoretical yield", "stoichiometry"],
  },
  {
    id: "stoichiometry-limiting-reagent",
    category: "Stoichiometry",
    name: "Limiting Reagent Relationship",
    formula: "product mol = reactant mol x (product coefficient / reactant coefficient)",
    variables: [
      { symbol: "reactant mol", meaning: "available moles of one reactant", unit: "mol" },
      { symbol: "coefficient", meaning: "balanced equation coefficient", unit: "unitless" },
      { symbol: "product mol", meaning: "moles of product predicted", unit: "mol" },
    ],
    units: ["Use balanced equation coefficients.", "Work in moles before converting to mass."],
    description: "Uses balanced coefficients to compare reactants and predict product amounts.",
    whenToUse: "Use when a problem asks which reactant runs out first or how much product forms.",
    commonMistakes: ["Using formula subscripts as coefficients", "Comparing grams directly", "Skipping the balanced equation"],
    workedExample: [
      { label: "Given", expression: "2H2 + O2 -> 2H2O; 3.0 mol H2", explanation: "The H2:H2O ratio is 2:2." },
      { label: "Substitution", expression: "3.0 mol H2 x (2 mol H2O / 2 mol H2)", explanation: "Use coefficients from the balanced equation." },
      { label: "Answer", expression: "3.0 mol H2O", explanation: "Mol H2 cancels, leaving mol H2O." },
    ],
    keywords: ["limiting reagent", "mole ratio", "stoichiometry", "balanced equation"],
  },
  {
    id: "solutions-molarity",
    category: "Solutions",
    name: "Molarity",
    formula: "M = n / V",
    variables: [
      { symbol: "M", meaning: "molarity", unit: "mol/L" },
      { symbol: "n", meaning: "moles of solute", unit: "mol" },
      { symbol: "V", meaning: "volume of solution", unit: "L" },
    ],
    units: ["Volume must be in L.", "Molarity can be written as M or mol/L."],
    description: "Calculates solution concentration from moles and volume.",
    whenToUse: "Use when moles and solution volume are known.",
    commonMistakes: ["Using mL instead of L", "Rearranging as V/n", "Rounding too early"],
    workedExample: [
      { label: "Given", expression: "n = 0.250 mol; V = 0.500 L", explanation: "Both required quantities are given." },
      { label: "Substitution", expression: "M = 0.250 / 0.500", explanation: "Moles divided by liters." },
      { label: "Answer", expression: "M = 0.500 M", explanation: "mol/L is the same as molarity." },
    ],
    keywords: ["molarity", "concentration", "solution", "moles", "volume"],
  },
  {
    id: "solutions-dilution",
    category: "Solutions",
    name: "Dilution Equation",
    formula: "M1V1 = M2V2",
    variables: [
      { symbol: "M1", meaning: "initial concentration", unit: "mol/L" },
      { symbol: "V1", meaning: "initial volume", unit: "L or mL" },
      { symbol: "M2", meaning: "final concentration", unit: "mol/L" },
      { symbol: "V2", meaning: "final volume", unit: "same as V1" },
    ],
    units: ["V1 and V2 must use matching volume units.", "M1 and M2 must use matching concentration units."],
    description: "Relates initial and final concentration/volume during dilution.",
    whenToUse: "Use when a stock solution is diluted and solute moles stay constant.",
    commonMistakes: ["Changing volume units on only one side", "Thinking moles are lost during dilution", "Solving for the wrong variable"],
    workedExample: [
      { label: "Given", expression: "M1 = 2.0 M; V1 = 0.100 L; M2 = 0.500 M", explanation: "Final volume is unknown." },
      { label: "Substitution", expression: "2.0 x 0.100 = 0.500 x V2", explanation: "Place known values in M1V1 = M2V2." },
      { label: "Answer", expression: "V2 = 0.400 L", explanation: "Divide both sides by 0.500 M." },
    ],
    keywords: ["dilution", "stock solution", "m1v1", "m2v2"],
  },
  {
    id: "gases-ideal-gas-law",
    category: "Gases",
    name: "Ideal Gas Law",
    formula: "PV = nRT",
    variables: [
      { symbol: "P", meaning: "pressure", unit: "atm" },
      { symbol: "V", meaning: "volume", unit: "L" },
      { symbol: "n", meaning: "amount of gas", unit: "mol" },
      { symbol: "R", meaning: "ideal gas constant", unit: "0.08206 L atm mol^-1 K^-1" },
      { symbol: "T", meaning: "temperature", unit: "K" },
    ],
    units: ["Temperature must be in K.", "Use R that matches P and V units."],
    description: "Relates pressure, volume, moles, and temperature for an ideal gas.",
    whenToUse: "Use when three of P, V, n, and T are known.",
    commonMistakes: ["Using Celsius", "Using the wrong gas constant", "Leaving two variables unknown"],
    workedExample: [
      { label: "Given", expression: "n = 1.00 mol; T = 273 K; P = 1.00 atm", explanation: "Volume is unknown." },
      { label: "Substitution", expression: "V = nRT / P = (1.00 x 0.08206 x 273) / 1.00", explanation: "Rearrange PV = nRT." },
      { label: "Answer", expression: "V = 22.4 L", explanation: "The units reduce to liters." },
    ],
    keywords: ["ideal gas", "pv nrt", "gas law", "pressure", "volume"],
  },
  {
    id: "gases-boyles-law",
    category: "Gases",
    name: "Boyle's Law",
    formula: "P1V1 = P2V2",
    variables: [
      { symbol: "P", meaning: "pressure", unit: "any matching pressure unit" },
      { symbol: "V", meaning: "volume", unit: "any matching volume unit" },
    ],
    units: ["Pressure units must match.", "Volume units must match.", "Temperature and moles are constant."],
    description: "Shows inverse relationship between pressure and volume.",
    whenToUse: "Use when gas amount and temperature stay constant.",
    commonMistakes: ["Using when temperature changes", "Forgetting inverse relationship", "Mixing pressure units"],
    workedExample: [
      { label: "Given", expression: "P1 = 1.0 atm; V1 = 2.0 L; P2 = 4.0 atm", explanation: "Pressure increases." },
      { label: "Substitution", expression: "1.0 x 2.0 = 4.0 x V2", explanation: "Use P1V1 = P2V2." },
      { label: "Answer", expression: "V2 = 0.50 L", explanation: "Higher pressure gives lower volume." },
    ],
    keywords: ["boyle", "pressure volume", "inverse"],
  },
  {
    id: "gases-charles-law",
    category: "Gases",
    name: "Charles' Law",
    formula: "V1 / T1 = V2 / T2",
    variables: [
      { symbol: "V", meaning: "gas volume", unit: "any matching volume unit" },
      { symbol: "T", meaning: "temperature", unit: "K" },
    ],
    units: ["Temperature must be in K.", "Volume units must match."],
    description: "Shows direct relationship between volume and temperature.",
    whenToUse: "Use when pressure and moles stay constant.",
    commonMistakes: ["Using Celsius", "Treating the relationship as inverse", "Changing volume units mid-calculation"],
    workedExample: [
      { label: "Given", expression: "V1 = 2.0 L; T1 = 300 K; T2 = 450 K", explanation: "Temperature rises." },
      { label: "Substitution", expression: "2.0 / 300 = V2 / 450", explanation: "Use matching Kelvin temperatures." },
      { label: "Answer", expression: "V2 = 3.0 L", explanation: "Volume increases with temperature." },
    ],
    keywords: ["charles law", "volume temperature", "kelvin"],
  },
  {
    id: "gases-combined-gas-law",
    category: "Gases",
    name: "Combined Gas Law",
    formula: "P1V1 / T1 = P2V2 / T2",
    variables: [
      { symbol: "P", meaning: "pressure", unit: "matching pressure unit" },
      { symbol: "V", meaning: "volume", unit: "matching volume unit" },
      { symbol: "T", meaning: "temperature", unit: "K" },
    ],
    units: ["Temperature must be K.", "Pressure and volume units must match across states."],
    description: "Combines pressure, volume, and temperature for a fixed amount of gas.",
    whenToUse: "Use when gas amount is constant but P, V, and T may change.",
    commonMistakes: ["Using Celsius", "Dropping one variable", "Cross-multiplying incorrectly"],
    workedExample: [
      { label: "Given", expression: "P1 = 1 atm; V1 = 2 L; T1 = 300 K; P2 = 2 atm; T2 = 300 K", explanation: "Temperature is unchanged." },
      { label: "Substitution", expression: "(1 x 2) / 300 = (2 x V2) / 300", explanation: "Insert each state into the equation." },
      { label: "Answer", expression: "V2 = 1 L", explanation: "Doubling pressure halves volume when T is constant." },
    ],
    keywords: ["combined gas law", "pressure volume temperature"],
  },
  {
    id: "thermochemistry-calorimetry",
    category: "Thermochemistry",
    name: "Calorimetry Heat",
    formula: "q = mc delta T",
    variables: [
      { symbol: "q", meaning: "heat energy", unit: "J" },
      { symbol: "m", meaning: "mass", unit: "g" },
      { symbol: "c", meaning: "specific heat capacity", unit: "J/g C" },
      { symbol: "delta T", meaning: "temperature change", unit: "C" },
    ],
    units: ["Mass in g.", "Specific heat in J/g C.", "delta T can be C or K difference."],
    description: "Calculates heat absorbed or released from a temperature change.",
    whenToUse: "Use for calorimetry problems with mass, specific heat, and temperature change.",
    commonMistakes: ["Using final temperature instead of delta T", "Losing the sign of q", "Mixing J and kJ"],
    workedExample: [
      { label: "Given", expression: "m = 50.0 g; c = 4.184 J/g C; delta T = 10.0 C", explanation: "Water warms by 10.0 C." },
      { label: "Substitution", expression: "q = 50.0 x 4.184 x 10.0", explanation: "Multiply all three values." },
      { label: "Answer", expression: "q = 2090 J", explanation: "The positive sign means heat is absorbed." },
    ],
    keywords: ["calorimetry", "specific heat", "q=mc", "enthalpy"],
  },
  {
    id: "thermochemistry-enthalpy-per-mole",
    category: "Thermochemistry",
    name: "Enthalpy per Mole",
    formula: "delta H = q / n",
    variables: [
      { symbol: "delta H", meaning: "molar enthalpy change", unit: "kJ/mol" },
      { symbol: "q", meaning: "heat transferred", unit: "kJ" },
      { symbol: "n", meaning: "moles reacted", unit: "mol" },
    ],
    units: ["Convert q to kJ if reporting kJ/mol.", "Use moles of the limiting or specified reactant."],
    description: "Converts heat released or absorbed into molar enthalpy change.",
    whenToUse: "Use when heat and moles are known and the answer should be per mole.",
    commonMistakes: ["Using grams instead of moles", "Forgetting sign convention", "Reporting J/mol when kJ/mol is requested"],
    workedExample: [
      { label: "Given", expression: "q = -5.00 kJ; n = 0.100 mol", explanation: "Heat is released." },
      { label: "Substitution", expression: "delta H = -5.00 / 0.100", explanation: "Divide heat by moles." },
      { label: "Answer", expression: "delta H = -50.0 kJ/mol", explanation: "Negative sign means exothermic." },
    ],
    keywords: ["enthalpy", "delta h", "heat per mole", "thermochemistry"],
  },
  {
    id: "acids-bases-ph",
    category: "Acids and Bases",
    name: "pH",
    formula: "pH = -log10([H+])",
    variables: [
      { symbol: "pH", meaning: "acidity measure", unit: "unitless" },
      { symbol: "[H+]", meaning: "hydrogen ion concentration", unit: "mol/L" },
    ],
    units: ["[H+] must be mol/L.", "pH has no unit."],
    description: "Calculates pH from hydrogen ion concentration.",
    whenToUse: "Use when [H+] is known.",
    commonMistakes: ["Using natural log", "Forgetting the negative sign", "Typing pH instead of concentration"],
    workedExample: [
      { label: "Given", expression: "[H+] = 1.0 x 10^-3 M", explanation: "Hydrogen ion concentration is known." },
      { label: "Substitution", expression: "pH = -log10(1.0 x 10^-3)", explanation: "Use base-10 logarithm." },
      { label: "Answer", expression: "pH = 3.00", explanation: "The solution is acidic." },
    ],
    keywords: ["ph", "hydrogen ion", "acid", "log"],
  },
  {
    id: "acids-bases-poh",
    category: "Acids and Bases",
    name: "pOH",
    formula: "pOH = -log10([OH-])",
    variables: [
      { symbol: "pOH", meaning: "basicity measure", unit: "unitless" },
      { symbol: "[OH-]", meaning: "hydroxide ion concentration", unit: "mol/L" },
    ],
    units: ["[OH-] must be mol/L.", "pOH has no unit."],
    description: "Calculates pOH from hydroxide ion concentration.",
    whenToUse: "Use when [OH-] is known.",
    commonMistakes: ["Using [H+] in the pOH formula", "Using natural log", "Forgetting pH + pOH relationship"],
    workedExample: [
      { label: "Given", expression: "[OH-] = 1.0 x 10^-4 M", explanation: "Hydroxide concentration is known." },
      { label: "Substitution", expression: "pOH = -log10(1.0 x 10^-4)", explanation: "Use base-10 log." },
      { label: "Answer", expression: "pOH = 4.00", explanation: "This corresponds to pH 10.00 at 25 C." },
    ],
    keywords: ["poh", "hydroxide", "base", "log"],
  },
  {
    id: "acids-bases-ph-poh",
    category: "Acids and Bases",
    name: "pH and pOH Relationship",
    formula: "pH + pOH = 14",
    variables: [
      { symbol: "pH", meaning: "acidity measure", unit: "unitless" },
      { symbol: "pOH", meaning: "basicity measure", unit: "unitless" },
    ],
    units: ["Applies to water at 25 C.", "Both values are unitless."],
    description: "Relates pH and pOH at 25 C.",
    whenToUse: "Use when pH or pOH is known and the other is needed.",
    commonMistakes: ["Using 14 outside standard 25 C assumptions", "Adding concentration values instead", "Forgetting pH and pOH are logarithmic"],
    workedExample: [
      { label: "Given", expression: "pH = 3.00", explanation: "pOH is unknown." },
      { label: "Substitution", expression: "3.00 + pOH = 14.00", explanation: "Rearrange for pOH." },
      { label: "Answer", expression: "pOH = 11.00", explanation: "Acidic solutions have high pOH." },
    ],
    keywords: ["ph poh", "14", "acid base"],
  },
  {
    id: "acids-bases-ka",
    category: "Acids and Bases",
    name: "Acid Dissociation Constant",
    formula: "Ka = [H+][A-] / [HA]",
    variables: [
      { symbol: "Ka", meaning: "acid dissociation constant", unit: "usually unitless in intro courses" },
      { symbol: "[H+]", meaning: "hydrogen ion concentration", unit: "mol/L" },
      { symbol: "[A-]", meaning: "conjugate base concentration", unit: "mol/L" },
      { symbol: "[HA]", meaning: "weak acid concentration", unit: "mol/L" },
    ],
    units: ["Use equilibrium concentrations.", "Do not use initial concentrations unless unchanged."],
    description: "Quantifies weak acid dissociation at equilibrium.",
    whenToUse: "Use for weak acid equilibrium and pH calculations.",
    commonMistakes: ["Using initial instead of equilibrium concentrations", "Including solids or liquids", "Confusing Ka with Kb"],
    workedExample: [
      { label: "Given", expression: "[H+] = 0.010 M; [A-] = 0.010 M; [HA] = 0.090 M", explanation: "Equilibrium concentrations are known." },
      { label: "Substitution", expression: "Ka = (0.010 x 0.010) / 0.090", explanation: "Products over reactant." },
      { label: "Answer", expression: "Ka = 1.1 x 10^-3", explanation: "Larger Ka means stronger weak acid." },
    ],
    keywords: ["ka", "weak acid", "equilibrium", "dissociation"],
  },
  {
    id: "acids-bases-kb",
    category: "Acids and Bases",
    name: "Base Dissociation Constant",
    formula: "Kb = [BH+][OH-] / [B]",
    variables: [
      { symbol: "Kb", meaning: "base dissociation constant", unit: "usually unitless in intro courses" },
      { symbol: "[BH+]", meaning: "conjugate acid concentration", unit: "mol/L" },
      { symbol: "[OH-]", meaning: "hydroxide concentration", unit: "mol/L" },
      { symbol: "[B]", meaning: "weak base concentration", unit: "mol/L" },
    ],
    units: ["Use equilibrium concentrations.", "All concentrations use mol/L."],
    description: "Quantifies weak base reaction with water at equilibrium.",
    whenToUse: "Use for weak base equilibrium and pOH calculations.",
    commonMistakes: ["Confusing Kb with Ka", "Using pH directly as concentration", "Forgetting hydroxide is produced"],
    workedExample: [
      { label: "Given", expression: "[BH+] = 0.0020 M; [OH-] = 0.0020 M; [B] = 0.098 M", explanation: "Equilibrium values are known." },
      { label: "Substitution", expression: "Kb = (0.0020 x 0.0020) / 0.098", explanation: "Products over base concentration." },
      { label: "Answer", expression: "Kb = 4.1 x 10^-5", explanation: "Smaller Kb means weaker base." },
    ],
    keywords: ["kb", "weak base", "equilibrium", "hydroxide"],
  },
  {
    id: "equilibrium-kc",
    category: "Equilibrium",
    name: "Equilibrium Constant Kc",
    formula: "Kc = products / reactants, each raised to coefficients",
    variables: [
      { symbol: "Kc", meaning: "equilibrium constant using concentration", unit: "varies by expression" },
      { symbol: "[ ]", meaning: "equilibrium concentration", unit: "mol/L" },
    ],
    units: ["Use equilibrium concentrations.", "Omit pure solids and liquids."],
    description: "Compares product and reactant concentrations at equilibrium.",
    whenToUse: "Use when an equilibrium system is at equilibrium and concentrations are known.",
    commonMistakes: ["Using initial concentrations", "Including solids/liquids", "Forgetting exponents from coefficients"],
    workedExample: [
      { label: "Given", expression: "A + B <-> C; [A] = 0.20, [B] = 0.10, [C] = 0.40", explanation: "Equilibrium concentrations are given." },
      { label: "Substitution", expression: "Kc = [C] / ([A][B]) = 0.40 / (0.20 x 0.10)", explanation: "Products over reactants." },
      { label: "Answer", expression: "Kc = 20", explanation: "Products are favored for this example." },
    ],
    keywords: ["kc", "equilibrium constant", "products reactants"],
  },
  {
    id: "equilibrium-q",
    category: "Equilibrium",
    name: "Reaction Quotient Q",
    formula: "Q = products / reactants using current concentrations",
    variables: [
      { symbol: "Q", meaning: "reaction quotient", unit: "varies by expression" },
      { symbol: "[ ]", meaning: "current concentration", unit: "mol/L" },
    ],
    units: ["Use current concentrations.", "Omit pure solids and liquids."],
    description: "Predicts which direction a reaction shifts before equilibrium.",
    whenToUse: "Use when concentrations are known but the system may not be at equilibrium.",
    commonMistakes: ["Using equilibrium concentrations when asked for Q", "Comparing Q and K backward", "Including solids/liquids"],
    workedExample: [
      { label: "Given", expression: "Q = 2.0; K = 10", explanation: "Q is less than K." },
      { label: "Comparison", expression: "Q < K", explanation: "The system needs more products to reach equilibrium." },
      { label: "Answer", expression: "shift right", explanation: "Reaction proceeds toward products." },
    ],
    keywords: ["q", "reaction quotient", "shift", "equilibrium"],
  },
  {
    id: "equilibrium-ice-table",
    category: "Equilibrium",
    name: "ICE Table Relationship",
    formula: "equilibrium = initial + change",
    variables: [
      { symbol: "I", meaning: "initial concentration", unit: "mol/L" },
      { symbol: "C", meaning: "change based on coefficients", unit: "mol/L" },
      { symbol: "E", meaning: "equilibrium concentration", unit: "mol/L" },
    ],
    units: ["Use concentration or pressure consistently.", "Changes follow balanced coefficients."],
    description: "Organizes equilibrium concentration changes.",
    whenToUse: "Use when equilibrium concentrations must be calculated from initial values and K.",
    commonMistakes: ["Ignoring coefficients in the change row", "Making concentrations negative", "Using x inconsistently"],
    workedExample: [
      { label: "Given", expression: "A <-> B; initial A = 1.0 M, B = 0", explanation: "Let x react." },
      { label: "ICE", expression: "A: 1.0 - x; B: x", explanation: "The 1:1 coefficients make changes equal." },
      { label: "Answer", expression: "Use K = x / (1.0 - x)", explanation: "Substitute the E row into the K expression." },
    ],
    keywords: ["ice table", "initial change equilibrium", "equilibrium"],
  },
  {
    id: "electrochemistry-ecell",
    category: "Electrochemistry",
    name: "Cell Potential",
    formula: "Ecell = Ecathode - Eanode",
    variables: [
      { symbol: "Ecell", meaning: "overall cell potential", unit: "V" },
      { symbol: "Ecathode", meaning: "reduction potential at cathode", unit: "V" },
      { symbol: "Eanode", meaning: "reduction potential for anode half-reaction", unit: "V" },
    ],
    units: ["All potentials use volts.", "Use reduction potentials from tables."],
    description: "Calculates standard electrochemical cell voltage.",
    whenToUse: "Use when cathode and anode reduction potentials are known.",
    commonMistakes: ["Adding both values blindly", "Using oxidation potential with the subtraction formula", "Mixing up cathode and anode"],
    workedExample: [
      { label: "Given", expression: "Ecathode = +0.34 V; Eanode = -0.76 V", explanation: "Use reduction potentials." },
      { label: "Substitution", expression: "Ecell = 0.34 - (-0.76)", explanation: "Subtract the anode reduction potential." },
      { label: "Answer", expression: "Ecell = 1.10 V", explanation: "Positive cell potential is spontaneous under standard conditions." },
    ],
    keywords: ["ecell", "electrochemistry", "cathode", "anode", "voltage"],
  },
  {
    id: "electrochemistry-faraday",
    category: "Electrochemistry",
    name: "Faraday Relationships",
    formula: "charge = current x time; mol e- = charge / F",
    variables: [
      { symbol: "charge", meaning: "electrical charge", unit: "C" },
      { symbol: "current", meaning: "electric current", unit: "A" },
      { symbol: "time", meaning: "time", unit: "s" },
      { symbol: "F", meaning: "Faraday constant", unit: "96485 C/mol e-" },
    ],
    units: ["Current in A.", "Time in s.", "Charge in C."],
    description: "Relates electrical current to moles of electrons transferred.",
    whenToUse: "Use for electrolysis and plating calculations.",
    commonMistakes: ["Using minutes instead of seconds", "Forgetting electron stoichiometry", "Using 96500 without noting approximation"],
    workedExample: [
      { label: "Given", expression: "I = 2.00 A; t = 100 s", explanation: "Current and time are known." },
      { label: "Substitution", expression: "charge = 2.00 x 100 = 200 C", explanation: "Ampere means coulomb per second." },
      { label: "Answer", expression: "mol e- = 200 / 96485 = 0.00207 mol", explanation: "Divide charge by Faraday constant." },
    ],
    keywords: ["faraday", "electrolysis", "charge", "current"],
  },
  {
    id: "organic-degree-unsaturation",
    category: "Organic Chemistry",
    name: "Degree of Unsaturation",
    formula: "DU = (2C + 2 + N - H - X) / 2",
    variables: [
      { symbol: "C", meaning: "number of carbons", unit: "count" },
      { symbol: "N", meaning: "number of nitrogens", unit: "count" },
      { symbol: "H", meaning: "number of hydrogens", unit: "count" },
      { symbol: "X", meaning: "number of halogens", unit: "count" },
    ],
    units: ["Use atom counts.", "Ignore oxygen and sulfur in the formula."],
    description: "Counts rings and pi bonds in an organic formula.",
    whenToUse: "Use when a molecular formula is known and unsaturation is needed.",
    commonMistakes: ["Including oxygen", "Forgetting halogens count like hydrogen", "Interpreting DU as only double bonds"],
    workedExample: [
      { label: "Given", expression: "C6H6", explanation: "C = 6, H = 6, N = 0, X = 0." },
      { label: "Substitution", expression: "DU = (2(6) + 2 - 6) / 2", explanation: "Insert atom counts." },
      { label: "Answer", expression: "DU = 4", explanation: "Benzene has one ring plus three pi bonds." },
    ],
    keywords: ["degree of unsaturation", "double bond equivalent", "organic formula"],
  },
  {
    id: "organic-homologous-series",
    category: "Organic Chemistry",
    name: "General Homologous Series Formulas",
    formula: "alkanes CnH2n+2; alkenes CnH2n; alkynes CnH2n-2; alcohols CnH2n+1OH",
    variables: [
      { symbol: "n", meaning: "number of carbon atoms", unit: "count" },
      { symbol: "H", meaning: "number of hydrogen atoms", unit: "count" },
    ],
    units: ["Use whole-number carbon counts.", "These are general formulas for simple acyclic series."],
    description: "Summarizes common organic homologous series formulas.",
    whenToUse: "Use for formula prediction and checking simple organic compounds.",
    commonMistakes: ["Using alkane formula for alkenes", "Forgetting rings change hydrogen count", "Applying simple formulas to branched functionalized molecules without care"],
    workedExample: [
      { label: "Given", expression: "alkene with n = 3", explanation: "Use CnH2n." },
      { label: "Substitution", expression: "C3H2(3)", explanation: "2n hydrogens for a simple alkene." },
      { label: "Answer", expression: "C3H6", explanation: "Propene fits CnH2n." },
    ],
    keywords: ["homologous series", "alkane", "alkene", "alkyne", "alcohol"],
  },
]

export const SOLVER_FORMULA_MAP: Record<string, string> = {
  molarity: "solutions-molarity",
  dilution: "solutions-dilution",
  "percent-yield": "stoichiometry-percent-yield",
  "empirical-formula": "stoichiometry-moles-from-mass",
  "ideal-gas-law": "gases-ideal-gas-law",
  calorimetry: "thermochemistry-calorimetry",
  ph: "acids-bases-ph",
  stoichiometry: "stoichiometry-limiting-reagent",
}

export function listFormulaRecords(): FormulaRecord[] {
  return FORMULA_RECORDS
}

export function getFormulaById(id: string | undefined): FormulaRecord | undefined {
  if (!id) return undefined
  return FORMULA_RECORDS.find((formula) => formula.id === id)
}

export function formulaHref(id: string): string {
  return `/formula-sheet?formula=${encodeURIComponent(id)}#formula-${id}`
}

export function getFormulaForSolverModule(moduleId: string): FormulaRecord | undefined {
  return getFormulaById(SOLVER_FORMULA_MAP[moduleId])
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
}

export function searchFormulaRecords(query: string): FormulaRecord[] {
  const q = normalize(query)
  if (!q) return FORMULA_RECORDS
  return FORMULA_RECORDS.filter((formula) =>
    normalize(
      [
        formula.name,
        formula.category,
        formula.formula,
        formula.description,
        formula.whenToUse,
        ...formula.keywords,
        ...formula.variables.flatMap((variable) => [variable.symbol, variable.meaning, variable.unit]),
      ].join(" "),
    ).includes(q),
  )
}

export function getFormulaMetrics() {
  return {
    formulas: FORMULA_RECORDS.length,
    categories: Array.from(new Set(FORMULA_RECORDS.map((formula) => formula.category))).length,
    workedExamples: FORMULA_RECORDS.length,
    variablesDefined: FORMULA_RECORDS.reduce((sum, formula) => sum + formula.variables.length, 0),
  }
}
