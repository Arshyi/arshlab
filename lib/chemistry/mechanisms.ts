import type { BondOrder, MolecularStructure2D } from "./visualization-types"
import type { MechanismAction, MechanismMetrics, MechanismRecord, MechanismStep } from "./mechanism-types"

type AtomInput = [id: string, element: string, x: number, y: number, charge?: string]
type BondInput = [id: string, from: string, to: string, order: BondOrder, label?: string]

function structure(
  id: string,
  displayName: string,
  formula: string,
  atoms: AtomInput[],
  bonds: BondInput[],
  condensedFormula?: string,
): MolecularStructure2D {
  return {
    id,
    compoundId: id,
    displayName,
    formula,
    condensedFormula,
    atoms: atoms.map(([atomId, element, x, y, charge]) => ({ id: atomId, element, x, y, charge })),
    bonds: bonds.map(([bondId, from, to, order, label]) => ({ id: bondId, from, to, order, label })),
    notes: ["Simplified mechanism sketch for electron-flow teaching."],
  }
}

function action(id: string, label: string, explanation: string): MechanismAction {
  return { id, label, explanation }
}

function electronFlowHint(input: Omit<MechanismStep, "distractorActions" | "electronFlow">): string {
  if (input.nextAction) {
    return `Electron flow focus: ${input.nextAction.label.toLowerCase()}. ${input.nextAction.explanation}`
  }

  return `Electron flow focus: follow the highlighted atoms and bonds to the product-forming change. ${input.explanation}`
}

function step(
  input: Omit<MechanismStep, "distractorActions" | "electronFlow"> & {
    distractorActions?: MechanismAction[]
    electronFlow?: string
  },
): MechanismStep {
  return {
    ...input,
    electronFlow: input.electronFlow ?? electronFlowHint(input),
    distractorActions:
      input.distractorActions ??
      [
        action("remove-proton", "Remove a proton", "This is a common step, but it is not the best next move here."),
        action("break-leaving-group", "Break a leaving-group bond", "Leaving groups depart only when the mechanism has activated that pathway."),
        action("oxidize", "Oxidize the substrate", "Oxidation changes carbon bonding to oxygen, which is not the next step in this pathway."),
      ],
  }
}

const ethene = structure(
  "mech-ethene",
  "Ethene",
  "C2H4",
  [
    ["c1", "C", 120, 120],
    ["c2", "C", 220, 120],
    ["h1", "H", 70, 80],
    ["h2", "H", 70, 160],
    ["h3", "H", 270, 80],
    ["h4", "H", 270, 160],
  ],
  [
    ["b-c1-c2", "c1", "c2", 2],
    ["b-c1-h1", "c1", "h1", 1],
    ["b-c1-h2", "c1", "h2", 1],
    ["b-c2-h3", "c2", "h3", 1],
    ["b-c2-h4", "c2", "h4", 1],
  ],
  "CH2=CH2",
)

const bromonium = structure(
  "mech-bromonium",
  "Bromonium Ion",
  "C2H4Br+",
  [
    ["c1", "C", 120, 145],
    ["c2", "C", 220, 145],
    ["br", "Br", 170, 70, "+"],
    ["h1", "H", 70, 115],
    ["h2", "H", 70, 175],
    ["h3", "H", 270, 115],
    ["h4", "H", 270, 175],
  ],
  [
    ["b-c1-c2", "c1", "c2", 1],
    ["b-c1-br", "c1", "br", 1],
    ["b-c2-br", "c2", "br", 1],
    ["b-c1-h1", "c1", "h1", 1],
    ["b-c1-h2", "c1", "h2", 1],
    ["b-c2-h3", "c2", "h3", 1],
    ["b-c2-h4", "c2", "h4", 1],
  ],
  "cyclic bromonium ion",
)

const dibromoethane = structure(
  "mech-dibromoethane",
  "1,2-Dibromoethane",
  "C2H4Br2",
  [
    ["br1", "Br", 70, 70],
    ["c1", "C", 130, 130],
    ["c2", "C", 230, 130],
    ["br2", "Br", 290, 190],
    ["h1", "H", 80, 165],
    ["h2", "H", 125, 205],
    ["h3", "H", 235, 55],
    ["h4", "H", 285, 105],
  ],
  [
    ["b-br1-c1", "br1", "c1", 1],
    ["b-c1-c2", "c1", "c2", 1],
    ["b-c2-br2", "c2", "br2", 1],
    ["b-c1-h1", "c1", "h1", 1],
    ["b-c1-h2", "c1", "h2", 1],
    ["b-c2-h3", "c2", "h3", 1],
    ["b-c2-h4", "c2", "h4", 1],
  ],
  "BrCH2CH2Br",
)

const secondaryCarbocation = structure(
  "mech-secondary-carbocation",
  "Secondary Carbocation",
  "C3H7+",
  [
    ["c1", "C", 80, 130],
    ["c2", "C", 175, 130, "+"],
    ["c3", "C", 270, 130],
    ["h1", "H", 175, 65],
    ["h2", "H", 175, 195],
  ],
  [
    ["b-c1-c2", "c1", "c2", 1],
    ["b-c2-c3", "c2", "c3", 1],
    ["b-c2-h1", "c2", "h1", 1],
    ["b-c2-h2", "c2", "h2", 1],
  ],
  "CH3CH+CH3",
)

const propanol = structure(
  "mech-propan-2-ol",
  "Propan-2-ol",
  "C3H8O",
  [
    ["c1", "C", 70, 130],
    ["c2", "C", 165, 130],
    ["c3", "C", 260, 130],
    ["o", "O", 165, 60],
    ["h", "H", 215, 35],
  ],
  [
    ["b-c1-c2", "c1", "c2", 1],
    ["b-c2-c3", "c2", "c3", 1],
    ["b-c2-o", "c2", "o", 1],
    ["b-o-h", "o", "h", 1],
  ],
  "CH3CHOHCH3",
)

const ethane = structure(
  "mech-ethane",
  "Ethane",
  "C2H6",
  [
    ["c1", "C", 120, 125],
    ["c2", "C", 220, 125],
    ["h1", "H", 75, 80],
    ["h2", "H", 75, 170],
    ["h3", "H", 120, 55],
    ["h4", "H", 265, 80],
    ["h5", "H", 265, 170],
    ["h6", "H", 220, 195],
  ],
  [
    ["b-c1-c2", "c1", "c2", 1],
    ["b-c1-h1", "c1", "h1", 1],
    ["b-c1-h2", "c1", "h2", 1],
    ["b-c1-h3", "c1", "h3", 1],
    ["b-c2-h4", "c2", "h4", 1],
    ["b-c2-h5", "c2", "h5", 1],
    ["b-c2-h6", "c2", "h6", 1],
  ],
  "CH3CH3",
)

const ethanoicAcid = structure(
  "mech-ethanoic-acid",
  "Ethanoic Acid",
  "C2H4O2",
  [
    ["c1", "C", 80, 135],
    ["c2", "C", 180, 135],
    ["o1", "O", 245, 80],
    ["o2", "O", 245, 190],
    ["h", "H", 300, 205],
  ],
  [
    ["b-c1-c2", "c1", "c2", 1],
    ["b-c2-o1", "c2", "o1", 2],
    ["b-c2-o2", "c2", "o2", 1],
    ["b-o2-h", "o2", "h", 1],
  ],
  "CH3COOH",
)

const protonatedCarbonyl = structure(
  "mech-protonated-carbonyl",
  "Protonated Carbonyl",
  "C2H5O2+",
  [
    ["c1", "C", 80, 135],
    ["c2", "C", 180, 135],
    ["o1", "O", 245, 80, "+"],
    ["h1", "H", 300, 60],
    ["o2", "O", 245, 190],
    ["h2", "H", 300, 205],
  ],
  [
    ["b-c1-c2", "c1", "c2", 1],
    ["b-c2-o1", "c2", "o1", 2],
    ["b-o1-h1", "o1", "h1", 1],
    ["b-c2-o2", "c2", "o2", 1],
    ["b-o2-h2", "o2", "h2", 1],
  ],
  "activated acid",
)

const esterProduct = structure(
  "mech-ethyl-ethanoate",
  "Ethyl Ethanoate",
  "C4H8O2",
  [
    ["c1", "C", 60, 135],
    ["c2", "C", 150, 135],
    ["o1", "O", 210, 80],
    ["o2", "O", 215, 185],
    ["c3", "C", 290, 185],
    ["c4", "C", 355, 130],
  ],
  [
    ["b-c1-c2", "c1", "c2", 1],
    ["b-c2-o1", "c2", "o1", 2],
    ["b-c2-o2", "c2", "o2", 1],
    ["b-o2-c3", "o2", "c3", 1],
    ["b-c3-c4", "c3", "c4", 1],
  ],
  "CH3COOCH2CH3",
)

const tertiaryChloride = structure(
  "mech-tert-butyl-chloride",
  "tert-Butyl Chloride",
  "C4H9Cl",
  [
    ["c", "C", 180, 130],
    ["c1", "C", 95, 80],
    ["c2", "C", 95, 180],
    ["c3", "C", 260, 130],
    ["cl", "Cl", 330, 130],
  ],
  [
    ["b-c-c1", "c", "c1", 1],
    ["b-c-c2", "c", "c2", 1],
    ["b-c-c3", "c", "c3", 1],
    ["b-c-cl", "c", "cl", 1],
  ],
  "(CH3)3CCl",
)

const tertiaryCarbocation = structure(
  "mech-tert-butyl-cation",
  "tert-Butyl Carbocation",
  "C4H9+",
  [
    ["c", "C", 180, 130, "+"],
    ["c1", "C", 95, 80],
    ["c2", "C", 95, 180],
    ["c3", "C", 260, 130],
  ],
  [
    ["b-c-c1", "c", "c1", 1],
    ["b-c-c2", "c", "c2", 1],
    ["b-c-c3", "c", "c3", 1],
  ],
  "(CH3)3C+",
)

const tertiaryAlcohol = structure(
  "mech-tert-butanol",
  "tert-Butanol",
  "C4H10O",
  [
    ["c", "C", 180, 130],
    ["c1", "C", 95, 80],
    ["c2", "C", 95, 180],
    ["c3", "C", 260, 130],
    ["o", "O", 330, 130],
    ["h", "H", 380, 130],
  ],
  [
    ["b-c-c1", "c", "c1", 1],
    ["b-c-c2", "c", "c2", 1],
    ["b-c-c3", "c", "c3", 1],
    ["b-c-o", "c", "o", 1],
    ["b-o-h", "o", "h", 1],
  ],
  "(CH3)3COH",
)

const methylpropene = structure(
  "mech-2-methylpropene",
  "2-Methylpropene",
  "C4H8",
  [
    ["c1", "C", 120, 135],
    ["c2", "C", 220, 135],
    ["c3", "C", 270, 70],
    ["c4", "C", 270, 200],
    ["h1", "H", 70, 95],
    ["h2", "H", 70, 175],
  ],
  [
    ["b-c1-c2", "c1", "c2", 2],
    ["b-c2-c3", "c2", "c3", 1],
    ["b-c2-c4", "c2", "c4", 1],
    ["b-c1-h1", "c1", "h1", 1],
    ["b-c1-h2", "c1", "h2", 1],
  ],
  "CH2=C(CH3)2",
)

const bromoethane = structure(
  "mech-bromoethane",
  "Bromoethane",
  "C2H5Br",
  [
    ["c1", "C", 100, 130],
    ["c2", "C", 200, 130],
    ["br", "Br", 290, 130],
    ["o", "O", 30, 130, "-"],
    ["h", "H", 20, 75],
  ],
  [
    ["b-o-h", "o", "h", 1],
    ["b-c1-c2", "c1", "c2", 1],
    ["b-c2-br", "c2", "br", 1],
  ],
  "HO- + CH3CH2Br",
)

const sn2Transition = structure(
  "mech-sn2-transition",
  "SN2 Transition State",
  "C2H5BrOH-",
  [
    ["c1", "C", 100, 130],
    ["c2", "C", 200, 130],
    ["br", "Br", 310, 130],
    ["o", "O", 90, 45, "-"],
    ["h", "H", 40, 45],
  ],
  [
    ["b-o-h", "o", "h", 1],
    ["b-c1-c2", "c1", "c2", 1],
    ["b-o-c2", "o", "c2", 1, "forming"],
    ["b-c2-br", "c2", "br", 1, "breaking"],
  ],
  "backside attack",
)

const ethanol = structure(
  "mech-ethanol",
  "Ethanol",
  "C2H6O",
  [
    ["c1", "C", 100, 130],
    ["c2", "C", 200, 130],
    ["o", "O", 285, 130],
    ["h", "H", 340, 130],
  ],
  [
    ["b-c1-c2", "c1", "c2", 1],
    ["b-c2-o", "c2", "o", 1],
    ["b-o-h", "o", "h", 1],
  ],
  "CH3CH2OH",
)

const etheneLeaving = structure(
  "mech-elimination-ethene",
  "Ethene Formation",
  "C2H4",
  [
    ["h", "H", 75, 55],
    ["c1", "C", 120, 130],
    ["c2", "C", 220, 130],
    ["br", "Br", 300, 130],
    ["base", "O", 30, 55, "-"],
  ],
  [
    ["b-base-h", "base", "h", 1, "forming"],
    ["b-h-c1", "h", "c1", 1, "breaking"],
    ["b-c1-c2", "c1", "c2", 2],
    ["b-c2-br", "c2", "br", 1, "breaking"],
  ],
  "base removes beta H",
)

const aldehyde = structure(
  "mech-ethanal",
  "Ethanal",
  "C2H4O",
  [
    ["c1", "C", 90, 135],
    ["c2", "C", 185, 135],
    ["o", "O", 250, 85],
    ["h", "H", 250, 185],
  ],
  [
    ["b-c1-c2", "c1", "c2", 1],
    ["b-c2-o", "c2", "o", 2],
    ["b-c2-h", "c2", "h", 1],
  ],
  "CH3CHO",
)

export const ORGANIC_MECHANISMS: MechanismRecord[] = [
  {
    id: "alkene-bromination",
    name: "Alkene Bromination",
    category: "Addition",
    difficulty: "Intermediate",
    reactants: ["alkene", "Br2"],
    products: ["vicinal dibromide"],
    reagents: ["Br2", "inert solvent"],
    conditions: "Room temperature, non-nucleophilic solvent",
    summary: "An alkene forms a bromonium ion, then bromide opens the ring to give anti addition.",
    steps: [
      step({
        id: "alkene-bromination-1",
        title: "Pi bond polarizes bromine",
        description: "The alkene pi bond approaches Br2 and induces a dipole.",
        intermediateStructure: ethene,
        highlightAtoms: ["c1", "c2"],
        highlightBonds: ["b-c1-c2"],
        explanation: "The electron-rich pi bond acts as a nucleophile toward polarized bromine.",
        nextAction: action("attack-electrophile", "Attack electrophile", "The pi bond donates toward Br2 to form a bridged bromonium ion."),
      }),
      step({
        id: "alkene-bromination-2",
        title: "Bromonium ion intermediate",
        description: "A three-membered bromonium ion forms with positive character on bromine.",
        intermediateStructure: bromonium,
        highlightAtoms: ["br", "c1", "c2"],
        highlightBonds: ["b-c1-br", "b-c2-br"],
        explanation: "Bridging prevents a free carbocation and sets up anti attack from bromide.",
        nextAction: action("nucleophilic-attack", "Attack from backside", "Bromide attacks the more accessible carbon from the opposite face."),
      }),
      step({
        id: "alkene-bromination-3",
        title: "Bromide opens the ring",
        description: "Bromide attacks and breaks one C-Br bridge bond.",
        intermediateStructure: dibromoethane,
        highlightAtoms: ["br1", "br2", "c1", "c2"],
        highlightBonds: ["b-br1-c1", "b-c2-br2"],
        explanation: "Backside attack opens the bromonium ion, producing anti vicinal dibromide.",
      }),
    ],
  },
  {
    id: "alkene-hydration",
    name: "Acid-Catalyzed Alkene Hydration",
    category: "Addition",
    difficulty: "Intermediate",
    reactants: ["alkene", "H2O"],
    products: ["alcohol"],
    reagents: ["H3O+", "H2O"],
    conditions: "Dilute acid",
    summary: "Protonation creates the more stable carbocation, water attacks, and deprotonation gives an alcohol.",
    steps: [
      step({
        id: "alkene-hydration-1",
        title: "Protonate the alkene",
        description: "The pi bond attacks H3O+ to form the more stable carbocation.",
        intermediateStructure: ethene,
        highlightAtoms: ["c1", "c2"],
        highlightBonds: ["b-c1-c2"],
        explanation: "Markovnikov hydration starts by placing positive charge on the more substituted carbon.",
        nextAction: action("form-carbocation", "Form carbocation", "Protonation converts the pi bond into a carbocation intermediate."),
      }),
      step({
        id: "alkene-hydration-2",
        title: "Carbocation intermediate",
        description: "A secondary carbocation is ready for nucleophilic attack by water.",
        intermediateStructure: secondaryCarbocation,
        highlightAtoms: ["c2"],
        highlightBonds: ["b-c1-c2", "b-c2-c3"],
        explanation: "The empty p orbital on the carbocation accepts a lone pair from water.",
        nextAction: action("water-attack", "Water attacks carbocation", "Water donates a lone pair to the positively charged carbon."),
      }),
      step({
        id: "alkene-hydration-3",
        title: "Alcohol product after deprotonation",
        description: "Loss of a proton gives the neutral alcohol.",
        intermediateStructure: propanol,
        highlightAtoms: ["o", "h", "c2"],
        highlightBonds: ["b-c2-o", "b-o-h"],
        explanation: "Deprotonation regenerates acid and leaves the Markovnikov alcohol.",
      }),
    ],
  },
  {
    id: "alkene-hydrogenation",
    name: "Alkene Hydrogenation",
    category: "Addition",
    difficulty: "Introductory",
    reactants: ["alkene", "H2"],
    products: ["alkane"],
    reagents: ["H2", "Pd/C or Pt"],
    conditions: "Metal catalyst",
    summary: "Hydrogen adsorbs to a metal surface and adds across the C=C bond.",
    steps: [
      step({
        id: "alkene-hydrogenation-1",
        title: "Alkene binds catalyst surface",
        description: "The pi bond coordinates to the metal catalyst.",
        intermediateStructure: ethene,
        highlightAtoms: ["c1", "c2"],
        highlightBonds: ["b-c1-c2"],
        explanation: "Coordination weakens the pi bond and aligns the alkene for hydrogen transfer.",
        nextAction: action("add-hydrogen", "Add surface hydrogen", "Hydrogen atoms transfer from the catalyst to the alkene carbons."),
      }),
      step({
        id: "alkene-hydrogenation-2",
        title: "C-H bonds form",
        description: "Hydrogen atoms add to the same catalyst-facing side of the alkene.",
        intermediateStructure: ethane,
        highlightAtoms: ["c1", "c2", "h3", "h6"],
        highlightBonds: ["b-c1-h3", "b-c2-h6"],
        explanation: "The former double bond becomes a single bond as two new C-H bonds form.",
        nextAction: action("release-product", "Release alkane product", "The saturated alkane leaves the catalyst surface."),
      }),
      step({
        id: "alkene-hydrogenation-3",
        title: "Alkane product",
        description: "The product is saturated because the pi bond has been removed.",
        intermediateStructure: ethane,
        highlightAtoms: ["c1", "c2"],
        highlightBonds: ["b-c1-c2"],
        explanation: "Hydrogenation reduces an alkene to an alkane.",
      }),
    ],
  },
  {
    id: "esterification",
    name: "Fischer Esterification",
    category: "Condensation",
    difficulty: "Advanced",
    reactants: ["carboxylic acid", "alcohol"],
    products: ["ester", "water"],
    reagents: ["H2SO4", "alcohol"],
    conditions: "Heat, acid catalyst",
    summary: "Acid activates the carbonyl, alcohol attacks, proton transfers occur, and water leaves to form an ester.",
    steps: [
      step({
        id: "esterification-1",
        title: "Protonate carbonyl oxygen",
        description: "Acid makes the carbonyl carbon more electrophilic.",
        intermediateStructure: protonatedCarbonyl,
        highlightAtoms: ["o1", "c2"],
        highlightBonds: ["b-c2-o1"],
        explanation: "Protonation increases the partial positive character at the carbonyl carbon.",
        nextAction: action("alcohol-attack", "Alcohol attacks carbonyl", "The alcohol oxygen attacks the activated carbonyl carbon."),
      }),
      step({
        id: "esterification-2",
        title: "Tetrahedral intermediate",
        description: "The carbonyl pi bond opens as the alcohol attaches.",
        intermediateStructure: esterProduct,
        highlightAtoms: ["c2", "o2", "c3"],
        highlightBonds: ["b-c2-o2", "b-o2-c3"],
        explanation: "A tetrahedral intermediate forms before water is eliminated.",
        nextAction: action("eliminate-water", "Eliminate water", "Proton transfers turn OH into water, which leaves."),
      }),
      step({
        id: "esterification-3",
        title: "Ester product",
        description: "Deprotonation regenerates acid and gives the ester.",
        intermediateStructure: esterProduct,
        highlightAtoms: ["o1", "o2", "c2"],
        highlightBonds: ["b-c2-o1", "b-c2-o2"],
        explanation: "Fischer esterification is reversible, so removing water can improve yield.",
      }),
    ],
  },
  {
    id: "sn1-substitution",
    name: "SN1 Substitution",
    category: "Substitution",
    difficulty: "Intermediate",
    reactants: ["tertiary haloalkane", "water"],
    products: ["tertiary alcohol"],
    reagents: ["H2O"],
    conditions: "Polar protic solvent",
    summary: "The leaving group departs first, then the nucleophile attacks the planar carbocation.",
    steps: [
      step({
        id: "sn1-1",
        title: "Leaving group ionizes",
        description: "The C-Cl bond breaks to give a carbocation and chloride.",
        intermediateStructure: tertiaryChloride,
        highlightAtoms: ["c", "cl"],
        highlightBonds: ["b-c-cl"],
        explanation: "SN1 rate depends on substrate ionization, so stable carbocations favor the pathway.",
        nextAction: action("leaving-group-departs", "Leaving group departs", "The C-Cl bond breaks before nucleophile attack."),
      }),
      step({
        id: "sn1-2",
        title: "Tertiary carbocation",
        description: "The planar carbocation is stabilized by three alkyl groups.",
        intermediateStructure: tertiaryCarbocation,
        highlightAtoms: ["c"],
        highlightBonds: ["b-c-c1", "b-c-c2", "b-c-c3"],
        explanation: "The carbocation can be attacked from either face, often causing racemization at a chiral center.",
        nextAction: action("nucleophile-attacks", "Nucleophile attacks carbocation", "Water attacks the electron-poor carbon."),
      }),
      step({
        id: "sn1-3",
        title: "Substitution product",
        description: "Water attaches and deprotonation gives the alcohol.",
        intermediateStructure: tertiaryAlcohol,
        highlightAtoms: ["c", "o", "h"],
        highlightBonds: ["b-c-o", "b-o-h"],
        explanation: "The leaving group has been substituted by OH.",
      }),
    ],
  },
  {
    id: "sn2-substitution",
    name: "SN2 Substitution",
    category: "Substitution",
    difficulty: "Intermediate",
    reactants: ["primary haloalkane", "hydroxide"],
    products: ["alcohol", "bromide"],
    reagents: ["OH-"],
    conditions: "Polar aprotic solvent",
    summary: "A nucleophile attacks from the backside while the leaving group leaves in one concerted step.",
    steps: [
      step({
        id: "sn2-1",
        title: "Backside approach",
        description: "Hydroxide approaches opposite the C-Br bond.",
        intermediateStructure: bromoethane,
        highlightAtoms: ["o", "c2", "br"],
        highlightBonds: ["b-c2-br"],
        explanation: "SN2 requires an accessible backside trajectory, so primary substrates react fastest.",
        nextAction: action("backside-attack", "Backside attack", "The nucleophile attacks as the leaving group begins to depart."),
      }),
      step({
        id: "sn2-2",
        title: "Concerted transition state",
        description: "C-O formation and C-Br breaking happen together.",
        intermediateStructure: sn2Transition,
        highlightAtoms: ["o", "c2", "br"],
        highlightBonds: ["b-o-c2", "b-c2-br"],
        explanation: "There is no carbocation intermediate in an SN2 mechanism.",
        nextAction: action("leaving-group-exits", "Leaving group exits", "The C-Br bond fully breaks as C-O becomes a normal bond."),
      }),
      step({
        id: "sn2-3",
        title: "Substitution product",
        description: "The nucleophile has replaced bromide.",
        intermediateStructure: ethanol,
        highlightAtoms: ["c2", "o", "h"],
        highlightBonds: ["b-c2-o", "b-o-h"],
        explanation: "A chiral SN2 center would invert configuration because attack happens from the backside.",
      }),
    ],
  },
  {
    id: "e1-elimination",
    name: "E1 Elimination",
    category: "Elimination",
    difficulty: "Intermediate",
    reactants: ["tertiary haloalkane"],
    products: ["alkene"],
    reagents: ["weak base"],
    conditions: "Heat, polar protic solvent",
    summary: "The leaving group departs first, then a base removes a beta proton to form an alkene.",
    steps: [
      step({
        id: "e1-1",
        title: "Leaving group departs",
        description: "Ionization forms a carbocation.",
        intermediateStructure: tertiaryChloride,
        highlightAtoms: ["c", "cl"],
        highlightBonds: ["b-c-cl"],
        explanation: "E1 and SN1 share a carbocation-forming first step.",
        nextAction: action("form-carbocation", "Form carbocation", "The leaving group departs to make a stable carbocation."),
      }),
      step({
        id: "e1-2",
        title: "Base removes beta proton",
        description: "A weak base removes H from a neighboring carbon.",
        intermediateStructure: tertiaryCarbocation,
        highlightAtoms: ["c", "c1"],
        highlightBonds: ["b-c-c1"],
        explanation: "Electrons from the C-H bond form the new pi bond.",
        nextAction: action("form-alkene", "Form alkene", "Beta deprotonation collapses into a C=C bond."),
      }),
      step({
        id: "e1-3",
        title: "Alkene product",
        description: "The most substituted alkene is often favored.",
        intermediateStructure: methylpropene,
        highlightAtoms: ["c1", "c2"],
        highlightBonds: ["b-c1-c2"],
        explanation: "E1 product ratios are controlled by carbocation stability and alkene substitution.",
      }),
    ],
  },
  {
    id: "e2-elimination",
    name: "E2 Elimination",
    category: "Elimination",
    difficulty: "Intermediate",
    reactants: ["haloalkane", "strong base"],
    products: ["alkene", "leaving group acid"],
    reagents: ["strong base"],
    conditions: "Often heat, anti-periplanar geometry",
    summary: "A strong base removes beta H while the leaving group departs in one concerted step.",
    steps: [
      step({
        id: "e2-1",
        title: "Anti-periplanar setup",
        description: "The beta C-H bond aligns opposite the leaving group.",
        intermediateStructure: bromoethane,
        highlightAtoms: ["o", "c1", "c2", "br"],
        highlightBonds: ["b-c1-c2", "b-c2-br"],
        explanation: "Good orbital alignment lets bond breaking and pi bond formation occur together.",
        nextAction: action("abstract-beta-h", "Remove beta hydrogen", "The base removes beta H as the leaving group exits."),
      }),
      step({
        id: "e2-2",
        title: "Concerted elimination",
        description: "C-H breaks, C=C forms, and C-Br breaks in the same step.",
        intermediateStructure: etheneLeaving,
        highlightAtoms: ["base", "h", "c1", "c2", "br"],
        highlightBonds: ["b-base-h", "b-h-c1", "b-c1-c2", "b-c2-br"],
        explanation: "E2 has no carbocation intermediate.",
        nextAction: action("release-alkene", "Release alkene", "The product alkene remains after the concerted step."),
      }),
      step({
        id: "e2-3",
        title: "Alkene product",
        description: "The leaving group and proton have been removed.",
        intermediateStructure: ethene,
        highlightAtoms: ["c1", "c2"],
        highlightBonds: ["b-c1-c2"],
        explanation: "E2 is favored by strong bases and accessible beta hydrogens.",
      }),
    ],
  },
  {
    id: "alcohol-oxidation",
    name: "Alcohol Oxidation",
    category: "Oxidation",
    difficulty: "Introductory",
    reactants: ["primary alcohol", "oxidizing agent"],
    products: ["aldehyde or carboxylic acid"],
    reagents: ["PCC or acidified dichromate"],
    conditions: "Controlled oxidation or reflux",
    summary: "A primary alcohol can be oxidized to an aldehyde, then further to a carboxylic acid.",
    steps: [
      step({
        id: "alcohol-oxidation-1",
        title: "Alcohol binds oxidant",
        description: "The alcohol oxygen coordinates to the oxidizing species.",
        intermediateStructure: ethanol,
        highlightAtoms: ["o", "h", "c2"],
        highlightBonds: ["b-c2-o", "b-o-h"],
        explanation: "Oxidation begins by activating the O-H and alpha C-H bonds.",
        nextAction: action("remove-hydrogen", "Remove hydrogens", "Oxidation removes H from oxygen and the adjacent carbon."),
      }),
      step({
        id: "alcohol-oxidation-2",
        title: "Aldehyde forms",
        description: "A C=O bond forms at the primary carbon.",
        intermediateStructure: aldehyde,
        highlightAtoms: ["c2", "o", "h"],
        highlightBonds: ["b-c2-o", "b-c2-h"],
        explanation: "PCC can stop here; stronger conditions can oxidize further.",
        nextAction: action("oxidize-further", "Oxidize further", "Hydration and further oxidation can convert the aldehyde to acid."),
      }),
      step({
        id: "alcohol-oxidation-3",
        title: "Carboxylic acid product",
        description: "Strong oxidizing conditions give the carboxylic acid.",
        intermediateStructure: ethanoicAcid,
        highlightAtoms: ["c2", "o1", "o2"],
        highlightBonds: ["b-c2-o1", "b-c2-o2"],
        explanation: "Primary alcohols can reach carboxylic acids under reflux with strong oxidants.",
      }),
    ],
  },
  {
    id: "carboxylic-acid-formation",
    name: "Carboxylic Acid Formation",
    category: "Oxidation",
    difficulty: "Intermediate",
    reactants: ["aldehyde", "oxidizing agent"],
    products: ["carboxylic acid"],
    reagents: ["acidified KMnO4 or K2Cr2O7"],
    conditions: "Aqueous oxidation",
    summary: "Aldehydes hydrate and are oxidized to carboxylic acids.",
    steps: [
      step({
        id: "acid-formation-1",
        title: "Aldehyde hydrate forms",
        description: "Water adds to the aldehyde carbonyl.",
        intermediateStructure: aldehyde,
        highlightAtoms: ["c2", "o"],
        highlightBonds: ["b-c2-o"],
        explanation: "Hydration makes the aldehyde easier to oxidize further.",
        nextAction: action("add-water", "Add water to carbonyl", "Water attacks the aldehyde carbonyl to form a hydrate."),
      }),
      step({
        id: "acid-formation-2",
        title: "Oxidize hydrated aldehyde",
        description: "The oxidant increases bonding from carbon to oxygen.",
        intermediateStructure: ethanoicAcid,
        highlightAtoms: ["c2", "o1", "o2"],
        highlightBonds: ["b-c2-o1", "b-c2-o2"],
        explanation: "The carbonyl carbon is oxidized because it gains additional bonding to oxygen.",
        nextAction: action("deprotonate", "Deprotonate to neutral acid", "Proton transfers give the neutral carboxylic acid."),
      }),
      step({
        id: "acid-formation-3",
        title: "Carboxylic acid",
        description: "The final product contains the -COOH group.",
        intermediateStructure: ethanoicAcid,
        highlightAtoms: ["c2", "o1", "o2", "h"],
        highlightBonds: ["b-c2-o1", "b-c2-o2", "b-o2-h"],
        explanation: "The carboxyl group combines carbonyl and hydroxyl bonding at the same carbon.",
      }),
    ],
  },
]

export function listMechanisms(): MechanismRecord[] {
  return ORGANIC_MECHANISMS
}

export function getMechanism(id: string | undefined): MechanismRecord | undefined {
  if (!id) return undefined
  return ORGANIC_MECHANISMS.find((mechanism) => mechanism.id === id)
}

export function getMechanismMetrics(): MechanismMetrics {
  const steps = ORGANIC_MECHANISMS.reduce((sum, mechanism) => sum + mechanism.steps.length, 0)
  const exercises = ORGANIC_MECHANISMS.reduce(
    (sum, mechanism) => sum + mechanism.steps.filter((item) => Boolean(item.nextAction)).length,
    0,
  )
  const categories = new Set(ORGANIC_MECHANISMS.map((mechanism) => mechanism.category)).size

  return {
    mechanismsAvailable: ORGANIC_MECHANISMS.length,
    mechanismSteps: steps,
    interactiveExercises: exercises,
    coverageLevel: "Intro organic core",
    categories,
  }
}
