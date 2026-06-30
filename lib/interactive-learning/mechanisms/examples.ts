import type {
  CurvedArrow,
  MechanismAtom,
  MechanismBond,
  MechanismGraphState,
  MechanismLearningCard,
  MechanismMistake,
  MechanismPracticePrompt,
  MechanismStep,
  ReactionMechanism,
} from "./types"

type AtomOptions = Partial<Omit<MechanismAtom, "id" | "trackingId" | "element" | "x" | "y">>
type BondOptions = Partial<Omit<MechanismBond, "id" | "trackingId" | "from" | "to" | "order">>

function atom(
  id: string,
  element: string,
  x: number,
  y: number,
  role: string,
  options: AtomOptions = {},
): MechanismAtom {
  const heteroLonePairs = element === "O" ? 2 : element === "N" ? 1 : element === "Br" || element === "Cl" ? 3 : 0
  return {
    id,
    trackingId: options.role ?? id,
    element,
    x,
    y,
    formalCharge: options.formalCharge ?? 0,
    hybridization: options.hybridization ?? (element === "H" || element === "Br" || element === "Cl" ? "none" : "sp3"),
    electronCount: options.electronCount ?? (element === "H" ? 1 : element === "C" ? 4 : element === "O" ? 6 : 7),
    sigmaBonds: options.sigmaBonds ?? 0,
    piBonds: options.piBonds ?? 0,
    lonePairs: options.lonePairs ?? heteroLonePairs,
    conjugated: options.conjugated ?? false,
    aromatic: options.aromatic ?? false,
    homoContribution: options.homoContribution ?? 0,
    lumoContribution: options.lumoContribution ?? 0,
    role,
    explanation: options.explanation ?? `${element} is tracked as ${role}.`,
  }
}

function bond(
  id: string,
  from: string,
  to: string,
  order: MechanismBond["order"],
  explanation: string,
  options: BondOptions = {},
): MechanismBond {
  const piBonds = order === 2 ? 1 : order === 3 ? 2 : order === "aromatic" ? 0.5 : 0
  return {
    id,
    trackingId: options.explanation ?? id,
    from,
    to,
    order,
    sigmaBonds: order === 0 ? 0 : 1,
    piBonds,
    conjugated: options.conjugated ?? order !== 1,
    aromatic: options.aromatic ?? order === "aromatic",
    breaking: options.breaking ?? false,
    forming: options.forming ?? false,
    explanation,
  }
}

function graph(id: string, title: string, formula: string, atoms: MechanismAtom[], bonds: MechanismBond[]): MechanismGraphState {
  const counts = new Map<string, { sigma: number; pi: number }>()
  for (const atomRecord of atoms) counts.set(atomRecord.id, { sigma: 0, pi: 0 })
  for (const bondRecord of bonds) {
    for (const atomId of [bondRecord.from, bondRecord.to]) {
      const current = counts.get(atomId)
      if (current) {
        current.sigma += bondRecord.sigmaBonds
        current.pi += bondRecord.piBonds
      }
    }
  }
  return {
    id,
    title,
    formula,
    atoms: atoms.map((atomRecord) => {
      const current = counts.get(atomRecord.id)
      return current ? { ...atomRecord, sigmaBonds: current.sigma, piBonds: current.pi } : atomRecord
    }),
    bonds,
  }
}

function arrow(
  id: string,
  kind: CurvedArrow["kind"],
  from: CurvedArrow["from"],
  to: CurvedArrow["to"],
  explanation: string,
  options: Partial<CurvedArrow> = {},
): CurvedArrow {
  return {
    id,
    kind,
    from,
    to,
    control: options.control ?? { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - 58 },
    electronCount: options.electronCount ?? 2,
    movingPair: options.movingPair ?? true,
    stationary: options.stationary ?? false,
    origin: options.origin ?? from.label,
    destination: options.destination ?? to.label,
    explanation,
  }
}

function step(input: Omit<MechanismStep, "transitionState"> & { transitionState?: boolean }): MechanismStep {
  return {
    ...input,
    transitionState: input.transitionState ?? input.stageKind === "transition-state",
  }
}

function mistake(id: string, title: string, wrongAction: string, explanation: string, relatedStepId: string): MechanismMistake {
  return { id, title, wrongAction, explanation, relatedStepId }
}

function card(id: string, title: string, body: string): MechanismLearningCard {
  return { id, title, body }
}

function practice(id: string, stepId: string, expectedArrowIds: string[], correctLabel: string, wrongLabel = "Move electrons the opposite way"): MechanismPracticePrompt {
  return {
    id,
    stepId,
    prompt: "Place the curved arrow(s) that best describe this elementary step.",
    expectedArrowIds,
    hint: "Curved arrows start at electron-rich sites and point toward electron-poor sites or new bond positions.",
    choices: [
      {
        id: "correct",
        label: correctLabel,
        arrowIds: expectedArrowIds,
        explanation: "Correct: this arrow starts from the electron source and lands where the new bonding or charge change occurs.",
      },
      {
        id: "wrong-direction",
        label: wrongLabel,
        arrowIds: [`wrong-${id}-reverse`],
        explanation: "Electron arrows never start at electron-poor sites; they start where the electron pair already is.",
      },
      {
        id: "wrong-bond",
        label: "Break an unrelated sigma bond",
        arrowIds: [`wrong-${id}-sigma`],
        explanation: "Breaking an unrelated sigma bond would create an unstable fragment and does not match the mechanism.",
      },
    ],
  }
}

const sn2Reactants = graph(
  "sn2-reactants",
  "Hydroxide attacks methyl bromide",
  "CH3Br + HO-",
  [
    atom("o", "O", 105, 185, "nucleophile", { formalCharge: -1, lonePairs: 3, explanation: "Hydroxide is electron-rich, so its lone pair can attack the electrophilic carbon." }),
    atom("c", "C", 260, 185, "electrophilic carbon", { hybridization: "sp3", explanation: "The carbon bonded to bromine is polarized and accessible to backside attack." }),
    atom("br", "Br", 405, 185, "leaving group", { explanation: "Bromide can leave because it stabilizes negative charge." }),
  ],
  [
    bond("c-br", "c", "br", 1, "C-Br sigma bond is the leaving-group bond.", { breaking: true }),
  ],
)

const sn2Ts = graph(
  "sn2-ts",
  "SN2 transition state",
  "[HO---CH3---Br]-",
  [
    atom("o", "O", 125, 185, "incoming nucleophile", { formalCharge: -1, lonePairs: 2 }),
    atom("c", "C", 265, 185, "pentacoordinate transition center", { hybridization: "sp3", explanation: "This educational transition state shows partial O-C formation and partial C-Br breaking." }),
    atom("br", "Br", 405, 185, "departing leaving group", { formalCharge: -1, lonePairs: 3 }),
  ],
  [
    bond("o-c", "o", "c", 1, "Partial O-C bond is forming.", { forming: true }),
    bond("c-br", "c", "br", 1, "C-Br bond is partially broken.", { breaking: true }),
  ],
)

const sn2Products = graph(
  "sn2-products",
  "Methanol and bromide",
  "CH3OH + Br-",
  [
    atom("o", "O", 160, 185, "alcohol oxygen", { lonePairs: 2 }),
    atom("c", "C", 290, 185, "substituted carbon", { hybridization: "sp3" }),
    atom("br", "Br", 430, 185, "bromide leaving group", { formalCharge: -1, lonePairs: 4 }),
  ],
  [
    bond("o-c", "o", "c", 1, "New C-O sigma bond formed."),
  ],
)

const sn2: ReactionMechanism = {
  id: "sn2",
  name: "SN2 Substitution",
  category: "Substitution",
  difficulty: "Introductory",
  reactants: ["methyl bromide", "hydroxide"],
  products: ["methanol", "bromide"],
  reagentContext: "Strong nucleophile, polar aprotic solvent, accessible electrophilic carbon.",
  supportedCompoundIds: ["methyl-bromide", "bromoethane", "haloalkane"],
  summary: "A nucleophile attacks from the backside while the leaving group departs in one concerted step.",
  steps: [
    step({
      id: "sn2-reactants",
      label: "Reactants",
      stageKind: "reactants",
      graph: sn2Reactants,
      arrows: [
        arrow("sn2-attack", "lone-pair-donation", { x: 115, y: 166, atomId: "o", label: "O lone pair" }, { x: 250, y: 185, atomId: "c", label: "electrophilic carbon" }, "Hydroxide donates a lone pair into the backside of the C-Br sigma-star orbital."),
        arrow("sn2-leave", "bond-breaking", { x: 320, y: 178, bondId: "c-br", label: "C-Br bond" }, { x: 395, y: 170, atomId: "br", label: "bromide" }, "The C-Br bond electrons move onto bromine as the leaving group departs."),
      ],
      energy: 18,
      highlightAtoms: ["o", "c", "br"],
      highlightBonds: ["c-br"],
      reasoning: [
        "The nucleophile attacks because it has a high-energy lone pair.",
        "Backside attack aligns with the antibonding orbital of C-Br.",
        "The leaving group departs at the same time, so no carbocation intermediate forms.",
      ],
      electronOrigin: "hydroxide lone pair and C-Br sigma bond",
      electronDestination: "new C-O bond and bromide lone pair",
    }),
    step({
      id: "sn2-ts",
      label: "Transition state",
      stageKind: "transition-state",
      graph: sn2Ts,
      arrows: [],
      energy: 82,
      highlightAtoms: ["o", "c", "br"],
      highlightBonds: ["o-c", "c-br"],
      reasoning: [
        "Both bonds are partial in the transition state.",
        "Steric hindrance raises this energy, which is why methyl and primary substrates react fastest.",
        "Inversion occurs because attack comes from the side opposite the leaving group.",
      ],
      electronOrigin: "partly shared electron pair",
      electronDestination: "new sigma bond and leaving group",
    }),
    step({
      id: "sn2-products",
      label: "Products",
      stageKind: "products",
      graph: sn2Products,
      arrows: [],
      energy: 28,
      highlightAtoms: ["o", "c", "br"],
      highlightBonds: ["o-c"],
      reasoning: [
        "A new C-O sigma bond replaces the C-Br bond.",
        "Bromide carries the electron pair from the broken bond.",
        "The carbon remains sp3 before and after the substitution.",
      ],
      electronOrigin: "hydroxide",
      electronDestination: "C-O sigma bond",
    }),
  ],
  energyProfile: [
    { stepId: "sn2-reactants", label: "Reactants", energy: 18, reactionProgress: 0 },
    { stepId: "sn2-ts", label: "TS", energy: 82, reactionProgress: 52 },
    { stepId: "sn2-products", label: "Products", energy: 28, reactionProgress: 100 },
  ],
  commonMistakes: [
    mistake("sn2-frontside", "Wrong face of attack", "Draw front-side attack at carbon", "Front-side attack does not overlap well with the C-Br antibonding orbital.", "sn2-reactants"),
    mistake("sn2-carbocation", "Invented carbocation", "Break C-Br first", "SN2 is concerted; a methyl carbocation would be extremely unstable.", "sn2-reactants"),
  ],
  learningCards: [
    card("nucleophile-strength", "Nucleophile strength", "A stronger nucleophile gives a faster SN2 reaction because the rate-determining step includes bond formation."),
    card("steric-hindrance", "Steric hindrance", "Crowding near the electrophilic carbon blocks backside attack and slows SN2."),
    card("transition-state", "Transition state", "The SN2 transition state has partial bonds to both nucleophile and leaving group."),
  ],
  practicePrompts: [practice("sn2-arrow", "sn2-reactants", ["sn2-attack", "sn2-leave"], "Lone pair attacks carbon while C-Br breaks")],
}

const carbocationGraph = graph(
  "sn1-carbocation",
  "Tertiary carbocation",
  "R3C+",
  [
    atom("c", "C", 270, 180, "carbocation", { formalCharge: 1, hybridization: "sp2", lumoContribution: 70, explanation: "The empty p orbital makes this carbon strongly electrophilic." }),
    atom("r1", "C", 185, 120, "alkyl stabilizer"),
    atom("r2", "C", 185, 240, "alkyl stabilizer"),
    atom("r3", "C", 360, 180, "alkyl stabilizer"),
  ],
  [
    bond("c-r1", "c", "r1", 1, "Alkyl group stabilizes the carbocation by hyperconjugation."),
    bond("c-r2", "c", "r2", 1, "Alkyl group stabilizes the carbocation by hyperconjugation."),
    bond("c-r3", "c", "r3", 1, "Alkyl group stabilizes the carbocation by hyperconjugation."),
  ],
)

function simpleMechanism(
  id: string,
  name: string,
  category: string,
  difficulty: ReactionMechanism["difficulty"],
  supportedCompoundIds: string[],
  summary: string,
  reactantLabel: string,
  productLabel: string,
  arrowKind: CurvedArrow["kind"],
  firstReason: string,
): ReactionMechanism {
  const reactants = graph(
    `${id}-reactants`,
    reactantLabel,
    reactantLabel,
    [
      atom("a", "C", 150, 185, "reactive atom", { hybridization: arrowKind.includes("pi") ? "sp2" : "sp3" }),
      atom("b", "C", 280, 185, "reaction partner", { hybridization: arrowKind.includes("pi") ? "sp2" : "sp3" }),
      atom("x", id.includes("benzene") ? "Br" : id.includes("carbonyl") || id.includes("acetal") ? "O" : "H", 410, 185, "reagent or leaving group"),
    ],
    [bond("a-b", "a", "b", arrowKind.includes("pi") ? 2 : 1, "Reactive bond that changes during the mechanism.", { breaking: arrowKind === "bond-breaking" })],
  )
  const intermediate = id.includes("sn1") || id.includes("e1") ? carbocationGraph : graph(
    `${id}-intermediate`,
    "Educational intermediate",
    "intermediate",
    [
      atom("a", "C", 150, 185, "partly transformed center", { hybridization: "sp2", conjugated: id.includes("benzene"), aromatic: false }),
      atom("b", "C", 280, 185, "bonded partner", { hybridization: "sp2", conjugated: id.includes("benzene") }),
      atom("x", "O", 410, 185, "attached reagent", { lonePairs: 2 }),
    ],
    [
      bond("a-b", "a", "b", 1, "Bond order has changed in the intermediate."),
      bond("b-x", "b", "x", 1, "New sigma bond has formed.", { forming: true }),
    ],
  )
  const products = graph(
    `${id}-products`,
    productLabel,
    productLabel,
    [
      atom("a", "C", 150, 185, "product atom", { hybridization: id.includes("hydrogenation") ? "sp3" : "sp2", aromatic: id.includes("benzene") }),
      atom("b", "C", 280, 185, "product atom", { hybridization: id.includes("hydrogenation") ? "sp3" : "sp2", aromatic: id.includes("benzene") }),
      atom("x", id.includes("benzene") ? "Br" : "O", 410, 185, "product substituent", { lonePairs: 2 }),
    ],
    [
      bond("a-b", "a", "b", id.includes("hydrogenation") || id.includes("halogenation") || id.includes("hydration") ? 1 : "aromatic", "Product bond pattern after electron movement.", { aromatic: id.includes("benzene") }),
      bond("b-x", "b", "x", 1, "New product sigma bond."),
    ],
  )

  const movingArrow = arrow(`${id}-arrow`, arrowKind, { x: 170, y: 155, atomId: "a", bondId: "a-b", label: "electron source" }, { x: 390, y: 170, atomId: "x", label: "electron destination" }, firstReason)

  return {
    id,
    name,
    category,
    difficulty,
    reactants: [reactantLabel],
    products: [productLabel],
    reagentContext: id.includes("benzene") ? "Lewis acid activation and aromatic pi electrons." : "Classroom deterministic reagent context.",
    supportedCompoundIds,
    summary,
    steps: [
      step({
        id: `${id}-reactants`,
        label: "Reactants",
        stageKind: "reactants",
        graph: reactants,
        arrows: [movingArrow],
        energy: 20,
        highlightAtoms: ["a", "b", "x"],
        highlightBonds: ["a-b"],
        reasoning: [firstReason, "The arrow starts at the electron source and points to the electron destination.", "This step is deterministic educational chemistry, not a quantum simulation."],
        electronOrigin: movingArrow.origin,
        electronDestination: movingArrow.destination,
      }),
      step({
        id: `${id}-intermediate`,
        label: id.includes("hydrogenation") ? "Surface transition state" : "Intermediate",
        stageKind: id.includes("hydrogenation") ? "transition-state" : "intermediate",
        graph: intermediate,
        arrows: [],
        energy: id.includes("sn1") || id.includes("e1") ? 75 : 55,
        highlightAtoms: ["a", "b", "x", "c"],
        highlightBonds: ["a-b", "b-x"],
        reasoning: [
          id.includes("sn1") || id.includes("e1") ? "A carbocation forms because the leaving group departs before nucleophile/base action." : "The intermediate stores the changed bond order or newly formed bond.",
          id.includes("benzene") ? "Aromaticity is temporarily disrupted in the sigma complex." : "The structure is less stable than the final product, so it continues reacting.",
        ],
        electronOrigin: "reactant electron pair",
        electronDestination: "intermediate bonding pattern",
      }),
      step({
        id: `${id}-products`,
        label: "Products",
        stageKind: "products",
        graph: products,
        arrows: [],
        energy: id.includes("benzene") ? 18 : 30,
        highlightAtoms: ["a", "b", "x"],
        highlightBonds: ["a-b", "b-x"],
        reasoning: [
          id.includes("benzene") ? "Aromaticity is restored, which strongly stabilizes the product." : "The final product has the expected new bond and charge pattern.",
          "Formal charges and bond orders settle into the product graph.",
        ],
        electronOrigin: "intermediate electrons",
        electronDestination: "product bonds",
      }),
    ],
    energyProfile: [
      { stepId: `${id}-reactants`, label: "Reactants", energy: 20, reactionProgress: 0 },
      { stepId: `${id}-intermediate`, label: "Intermediate / TS", energy: id.includes("sn1") || id.includes("e1") ? 75 : 55, reactionProgress: 55 },
      { stepId: `${id}-products`, label: "Products", energy: id.includes("benzene") ? 18 : 30, reactionProgress: 100 },
    ],
    commonMistakes: [
      mistake(`${id}-wrong-arrow`, "Incorrect arrow direction", "Start arrow at electrophile", "Curved arrows start at electrons, not at electron-poor atoms.", `${id}-reactants`),
      mistake(`${id}-wrong-bond`, "Wrong bond changed", "Break an unrelated sigma bond", "Mechanism arrows should target the bond directly involved in the elementary step.", `${id}-reactants`),
    ],
    learningCards: [
      card(`${id}-rds`, "Rate-determining step", "The highest point on the energy diagram approximates the slowest elementary step."),
      card(`${id}-electron-flow`, "Electron flow", "Electron pairs move from electron-rich sources toward electron-poor destinations."),
      card(`${id}-stability`, "Intermediate stability", "More stable intermediates lower the energy barrier and make a mechanism more plausible."),
    ],
    practicePrompts: [practice(`${id}-practice`, `${id}-reactants`, [`${id}-arrow`], "Use the shown electron-rich site to form or move the key bond")],
  }
}

export const REACTION_MECHANISMS: ReactionMechanism[] = [
  sn2,
  simpleMechanism("sn1", "SN1 Substitution", "Substitution", "Intermediate", ["tert-butyl-chloride", "haloalkane"], "Leaving group departure forms a carbocation, then nucleophile capture gives substitution.", "tert-butyl chloride + water", "tert-butanol", "bond-breaking", "The C-Cl bond breaks first because the tertiary carbocation is stabilized by alkyl groups."),
  simpleMechanism("e2", "E2 Elimination", "Elimination", "Intermediate", ["bromoethane", "haloalkane"], "A strong base removes a beta proton while the leaving group departs in one concerted step.", "bromoethane + base", "ethene", "electron-shift", "The beta C-H bond electrons form the pi bond as the leaving group departs."),
  simpleMechanism("e1", "E1 Elimination", "Elimination", "Intermediate", ["tert-butyl-bromide", "haloalkane"], "Leaving group departure forms a carbocation before deprotonation creates an alkene.", "tert-butyl bromide", "2-methylpropene", "bond-breaking", "The leaving group departs first, creating a carbocation that can lose a beta proton."),
  simpleMechanism("electrophilic-aromatic-substitution", "Electrophilic Aromatic Substitution", "Aromatic substitution", "Intermediate", ["benzene", "arene"], "An aromatic pi system attacks an electrophile, forms a sigma complex, then restores aromaticity.", "arene + electrophile", "substituted arene", "pi-bond-movement", "Aromatic pi electrons attack an activated electrophile, temporarily disrupting aromaticity."),
  simpleMechanism("benzene-bromination", "Benzene Bromination", "Aromatic substitution", "Intermediate", ["benzene", "arene"], "Benzene reacts with activated bromine, forms a sigma complex, and regains aromaticity after deprotonation.", "benzene + Br2 / FeBr3", "bromobenzene", "pi-bond-movement", "Benzene pi electrons attack electrophilic bromine after Lewis acid activation."),
  simpleMechanism("carbonyl-addition", "Nucleophilic Addition to Carbonyl", "Addition", "Introductory", ["acetone", "aldehyde", "ketone"], "A nucleophile attacks the polarized carbonyl carbon, pushing pi electrons onto oxygen.", "acetone + nucleophile", "tetrahedral alkoxide", "lone-pair-donation", "The carbonyl carbon is electrophilic because the C=O bond is polarized toward oxygen."),
  simpleMechanism("acetal-formation", "Acetal Formation", "Condensation", "Advanced", ["aldehyde", "ketone", "alcohol"], "Acid-catalyzed alcohol addition and water loss convert a carbonyl into an acetal.", "carbonyl + alcohol + acid", "acetal", "lone-pair-donation", "Alcohol oxygen attacks the activated carbonyl carbon after protonation."),
  simpleMechanism("alkene-hydration", "Hydration of Alkene", "Addition", "Introductory", ["ethene", "alkene"], "Pi electrons add H and OH across an alkene through an acid-catalyzed pathway.", "alkene + water / acid", "alcohol", "pi-bond-movement", "The alkene pi bond attacks a proton to create the more stable carbocation."),
  simpleMechanism("hydrogenation", "Hydrogenation", "Addition", "Introductory", ["ethene", "alkene"], "Hydrogen adds across a pi bond on a catalyst surface, reducing the alkene to an alkane.", "alkene + H2 / catalyst", "alkane", "bond-formation", "The catalyst surface helps break H-H and deliver hydrogen atoms across the pi bond."),
  simpleMechanism("halogenation", "Halogenation of Alkene", "Addition", "Introductory", ["ethene", "alkene"], "An alkene reacts with halogen to form a halonium intermediate and a vicinal dihalide.", "alkene + Br2", "vicinal dibromide", "pi-bond-movement", "The alkene pi bond polarizes bromine and forms a bromonium-like intermediate."),
  simpleMechanism("free-radical-substitution", "Free-Radical Substitution", "Radical substitution", "Intermediate", ["methane", "alkane"], "Light initiates halogen radicals, then propagation replaces an alkane C-H bond with C-X.", "methane + Cl2 / hv", "chloromethane", "electron-shift", "Single-electron movement creates and propagates radicals in this simplified model.",),
]

const aliasMap = new Map<string, string>([
  ["substitution", "sn2"],
  ["sn-2", "sn2"],
  ["sn-1", "sn1"],
  ["benzene bromination", "benzene-bromination"],
  ["eas", "electrophilic-aromatic-substitution"],
  ["carbonyl", "carbonyl-addition"],
  ["hydration", "alkene-hydration"],
  ["radical", "free-radical-substitution"],
])

function normalize(value: string | null | undefined) {
  return (value ?? "")
    .toLowerCase()
    .replace(/\+/g, "plus")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

export function listReactionMechanisms() {
  return REACTION_MECHANISMS
}

export function getReactionMechanism(id: string | null | undefined): ReactionMechanism {
  const normalized = normalize(id)
  const alias = aliasMap.get(normalized) ?? aliasMap.get((id ?? "").toLowerCase())
  return REACTION_MECHANISMS.find((mechanism) => mechanism.id === normalized || mechanism.id === alias) ?? sn2
}
