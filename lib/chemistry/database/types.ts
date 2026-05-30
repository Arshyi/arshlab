/** Central chemistry database types — ARSHLAB v1.0 */

export type ExamBoard =
  | "high-school"
  | "ib-sl"
  | "ib-hl"
  | "ap"
  | "a-level"
  | "university-intro"

export type Difficulty = "foundation" | "standard" | "advanced" | "extension"

export type EntityKind =
  | "compound"
  | "ion"
  | "element"
  | "functional-group"
  | "reaction"
  | "orbital"
  | "spectroscopy"

/** Stable cross-module identifier */
export type ChemistryId = string

export interface DatabaseMeta {
  version: string
  updatedAt: string
  counts: Record<string, number>
}

export interface SearchableRecord {
  id: ChemistryId
  kind: EntityKind
  name: string
  aliases: string[]
  formula?: string
  tags: string[]
  examBoards: ExamBoard[]
  topics: string[]
  subtopics: string[]
}

export interface LonePairInfo {
  atom: string
  count: number
}

export interface SymmetryInfo {
  type: "symmetric" | "asymmetric"
  equivalentEnds: boolean
  explanation: string
}

export interface CompoundRecord extends SearchableRecord {
  kind: "compound"
  condensed: string
  family: string
  functionalGroup: string
  polarity: "Nonpolar" | "Polar" | "Ionic"
  hydrogenBonding: boolean
  explanation: string
  structureArt: string
  structureArtWithLonePairs?: string
  lonePairs?: LonePairInfo[]
  symmetry?: SymmetryInfo
  commonReactions: string[]
  /** Links to other database modules */
  lewisId?: string
  vseprId?: string
  molecule3dId?: string
  spectroscopyId?: string
}

export interface IonRecord extends SearchableRecord {
  kind: "ion"
  charge: number
  formula: string
  name: string
  type: "monoatomic" | "polyatomic"
  oxidationStates?: number[]
  isCommonIon: boolean
}

export type ElementCategory =
  | "alkali-metal"
  | "alkaline-earth-metal"
  | "transition-metal"
  | "post-transition-metal"
  | "metalloid"
  | "nonmetal"
  | "halogen"
  | "noble-gas"
  | "lanthanide"
  | "actinide"
  | "unknown"

export type ElementBlock = "s" | "p" | "d" | "f"

export interface ElementRecord extends SearchableRecord {
  kind: "element"
  symbol: string
  atomicNumber: number
  atomicMass: number
  period: number
  group: number | null
  block: ElementBlock
  electronConfiguration: string
  shorthandConfiguration?: string
  valenceElectrons: number
  electronegativity: number | null
  atomicRadiusPm: number | null
  ionicRadiusPm: number | null
  ionizationEnergyKjMol: number | null
  electronAffinityKjMol: number | null
  meltingPointC: number | null
  boilingPointC: number | null
  densityGcm3: number | null
  oxidationStates: number[]
  commonIons: string[]
  category: ElementCategory
  isMetal: boolean
  isNonmetal: boolean
  isMetalloid: boolean
}

export interface FunctionalGroupRecord extends SearchableRecord {
  kind: "functional-group"
  structures: string[]
  representativeClass: string
  generalFormula: string
  color: string
  polarity: "Nonpolar" | "Polar" | "Mixed"
  hydrogenBonding: boolean
  properties: string[]
  characteristicReactions: string[]
  iupacNamingRules: string[]
  irAbsorptionRanges: { range: string; description: string }[]
  msFragmentationNotes: string[]
  nmrHints: string[]
  exampleCompoundIds: string[]
  structureArtExamples: string[]
  explanation: string
}

export type ReactionFamily =
  | "combustion"
  | "addition"
  | "substitution"
  | "elimination"
  | "esterification"
  | "hydrolysis"
  | "oxidation"
  | "reduction"
  | "acid-base"
  | "precipitation"
  | "redox"
  | "neutralization"
  | "other"

export interface ReactionTemplateRecord extends SearchableRecord {
  kind: "reaction"
  family: ReactionFamily
  reactants: string[]
  products: string[]
  conditions: string[]
  catalysts: string[]
  mechanism?: string
  examBoards: ExamBoard[]
  exampleEquation: string
  explanation: string
}

export type OrbitalFamily = "s" | "p" | "d" | "f"

export interface OrbitalRecord extends SearchableRecord {
  kind: "orbital"
  family: OrbitalFamily
  n: number
  l: number
  ml?: number
  orientation?: string
  radialNodes: number
  angularNodes: number
  totalNodes: number
  shapeDescription: string
  chemistryRelevance: string
  explanation: string
}

export interface IRPeakRecord {
  wavenumber: number
  intensity: number
  assignment: string
  functionalGroupHint?: string
}

export interface NMRSignalRecord {
  shiftPpm: number
  multiplicity: string
  integration: number
  assignment: string
}

export interface MSFragmentRecord {
  mz: number
  intensity: number
  label: string
}

export interface SpectroscopyRecord extends SearchableRecord {
  kind: "spectroscopy"
  compoundId: string
  irPeaks: IRPeakRecord[]
  nmrSignals: NMRSignalRecord[]
  msFragments: MSFragmentRecord[]
  characteristicAbsorptions: string[]
  characteristicSignals: string[]
  characteristicFragments: string[]
  notes: string
}

/** Question generation metadata — no questions stored yet */
export type QuestionType =
  | "mcq"
  | "structured"
  | "calculation"
  | "mechanism"
  | "spectra-interpretation"
  | "lewis-draw"
  | "vsepr-predict"

export interface QuestionTopicRecord {
  id: string
  topic: string
  subtopic: string
  difficulty: Difficulty
  examBoards: ExamBoard[]
  learningOutcomes: string[]
  commonMistakes: string[]
  questionTypes: QuestionType[]
  relatedCompoundIds?: string[]
  relatedReactionIds?: string[]
  tags: string[]
}

/** Future user persistence — schema only */
export interface UserRecord {
  id: string
  email: string
  displayName: string
  examBoard?: ExamBoard
  createdAt: string
}

export interface SearchHistoryRecord {
  id: string
  userId: string
  query: string
  resultKinds: EntityKind[]
  timestamp: string
}

export interface SavedCompoundRecord {
  id: string
  userId: string
  compoundId: ChemistryId
  savedAt: string
}

export interface SavedReactionRecord {
  id: string
  userId: string
  reactionId: ChemistryId
  savedAt: string
}

export interface BookmarkRecord {
  id: string
  userId: string
  entityKind: EntityKind
  entityId: ChemistryId
  label: string
  createdAt: string
}

export interface AchievementRecord {
  id: string
  userId: string
  achievementKey: string
  unlockedAt: string
}

export interface SubscriptionRecord {
  id: string
  userId: string
  tier: "free" | "student" | "teacher" | "institution"
  status: "active" | "cancelled" | "trial"
  expiresAt?: string
}

export interface LeaderboardEntryRecord {
  userId: string
  displayName: string
  score: number
  period: "weekly" | "monthly" | "all-time"
}

export interface FriendConnectionRecord {
  id: string
  userId: string
  friendUserId: string
  status: "pending" | "accepted"
}

/** Analytics event types */
export type AnalyticsEventType =
  | "view_compound"
  | "view_reaction"
  | "view_functional_group"
  | "view_orbital"
  | "view_element"
  | "search"
  | "view_spectroscopy"

export interface AnalyticsEvent {
  type: AnalyticsEventType
  entityId?: string
  query?: string
  timestamp: number
}

/** Education hub content types — content TBD */
export type EducationContentType =
  | "lesson"
  | "worked-example"
  | "proof"
  | "practice-problem"
  | "past-paper"
  | "video"
  | "creator"

export interface EducationHubSection {
  id: string
  title: string
  description: string
  contentType: EducationContentType
  examBoards: ExamBoard[]
  topics: string[]
  itemCount: number
  status: "planned" | "beta" | "available"
}
