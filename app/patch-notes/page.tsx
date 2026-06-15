"use client"

import { motion } from "framer-motion"
import { Check, Clock, Rocket, Star, Zap, ChevronDown } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useState } from "react"
import { cn } from "@/lib/utils"

type VersionStatus = "released" | "beta" | "coming-soon"

interface PatchNote {
  version: string
  date: string
  status: VersionStatus
  title: string
  changes: string[]
}

const patchNotes: PatchNote[] = [
  {
    version: "3.8.0",
    date: "Current",
    status: "released",
    title: "Organic Mechanism Trainer",
    changes: [
      "Added deterministic Organic Mechanism Trainer route with step-by-step visual mechanism playback",
      "Added local mechanism records for alkene bromination, alkene hydration, alkene hydrogenation, esterification, SN1, SN2, E1, E2, alcohol oxidation, and carboxylic acid formation",
      "Added highlighted atoms and bonds for each mechanism step using the existing 2D molecule renderer",
      "Added Predict Next Step student mode with four deterministic answer choices and immediate feedback",
      "Added Organic Mechanisms database question templates for next-step prediction, intermediate identification, mechanism type, product, and reagent questions",
      "Added Organic Mechanisms coverage to deterministic exam blueprints, curriculum topics, recovery topics, and learning dashboard mechanism mastery",
      "Added Chemistry Hub, homepage, and navbar links for Mechanism Trainer",
      "Kept AI routes, OpenRouter configuration, and free-model guardrails unchanged",
    ],
  },
  {
    version: "3.7.1",
    date: "Previous",
    status: "released",
    title: "Molecular Visualization Refinement",
    changes: [
      "Added centered atom labels for every visible atom in the 2D molecule renderer",
      "Added deterministic element colors and an Element Colors legend for common chemistry elements",
      "Improved single, double, triple, and aromatic bond rendering with clearer visual distinctions",
      "Added Ball-and-Stick, Condensed Formula, and Skeletal Organic display modes to the Molecular Visualizer",
      "Added hover tooltips for atoms with element name, atomic number, and atomic mass",
      "Added direct functional-group overlay labels such as -OH, C=O, -COOH, -COO-, and -NH2",
      "Improved reaction diagrams with Reactants-to-Products flow and inferred classroom conditions",
      "Improved pathway cards with compound name, formula, functional group, and reduced horizontal scrolling",
      "Polished mobile readability for molecule, reaction, pathway, database, and spectroscopy visual cards",
    ],
  },
  {
    version: "3.7.0",
    date: "Previous",
    status: "released",
    title: "Molecular Visualization Engine",
    changes: [
      "Added deterministic 2D molecular visualization types and hand-authored structure records for common organic, inorganic, acid/base, aromatic, and spectroscopy examples",
      "Added /molecular-visualizer with compound selection, functional group highlight toggles, reaction diagram examples, and pathway examples",
      "Added reusable Molecule2DRenderer, ReactionDiagram, and CompoundPathwayGraph components",
      "Added molecule cards to the Chemistry Database compound viewer with clear unavailable-state messaging",
      "Added reaction diagrams to the Reaction Database while preserving search, filters, prediction, and classification checks",
      "Added spectroscopy-to-structure mappings so IR peaks can point to highlighted functional groups in example molecules",
      "Added visual metadata hooks to database-generated questions for future molecule and reaction rendering",
      "Added Chemistry Hub, homepage, roadmap, and navigation links for the Molecular Visualizer and Visual Reaction Pathways",
    ],
  },
  {
    version: "3.6.0",
    date: "Previous",
    status: "released",
    title: "Chemistry Reaction Engine",
    changes: [
      "Added deterministic reaction knowledge core with 100+ reaction records across acid-base, precipitation, combustion, displacement, redox, synthesis, decomposition, organic, electrochemistry, and equilibrium categories",
      "Added /reaction-database with searchable reaction records, category filters, curriculum filters, difficulty filters, and a reaction viewer",
      "Added local reaction prediction, classification, and balancing helper modules with fail-closed behavior for unknown reactions",
      "Added deterministic reaction question templates for reaction type, product prediction, missing products, balancing, redox identification, precipitation prediction, acid/base products, combustion products, and classification",
      "Integrated reaction topics into Practice Generator, Study Mode, Recovery Mode, Curriculum Engine, Exam Engine, Progress analytics, and achievements",
      "Added Chemistry Hub cards for Reaction Database, Reaction Predictor, Balancing Practice, and Reaction Mastery",
      "Preserved OpenRouter configuration, free-model-only AI guardrails, and existing Reaction Lab behavior",
    ],
  },
  {
    version: "3.5.1",
    date: "Previous",
    status: "released",
    title: "Adaptive Learning Engine Hardening",
    changes: [
      "Hardened mastery calculations with clamped 0-100 outputs, safe counts, missing-topic fallbacks, and NaN protection",
      "Confirmed weighted mastery sources: Diagnostic 25%, Practice 35%, Exam 30%, and Recovery 10%",
      "Expanded recommendations with topic, priority, suggested mode, estimated time, and clearer reasons",
      "Added deterministic 7-day adaptive study plans with starter fallback plans when no saved data exists",
      "Improved Learning Dashboard empty states and explanation cards for mastery and recommendation logic",
      "Polished Supabase achievement unlock storage with safer constraints, timestamps, unique user-achievement pairs, and RLS",
      "Kept OpenRouter configuration and free-model-only guardrails unchanged",
    ],
  },
  {
    version: "3.5.0",
    date: "Previous",
    status: "released",
    title: "Adaptive Learning Engine",
    changes: [
      "Added weighted mastery scoring across diagnostic, practice, exam, and recovery progress",
      "Added adaptive recommendation engine for strongest topic, weakest topic, weakest unit, next unit, recovery target, and exam focus",
      "Added /study-plan with today, this week, and long-term study recommendations",
      "Added /learning-dashboard with overall mastery, curriculum progress, diagnostic coverage, exam readiness, study streak, weak areas, and strong areas",
      "Added 0-100 Exam Readiness Index with Needs Preparation, Developing, Ready, and Exam Ready bands",
      "Upgraded Recovery Mode targeting to prioritize diagnostic weaknesses, low-mastery units, and recently missed questions",
      "Added curriculum completion tracking with completed units, remaining units, estimated completion, and estimated graduation",
      "Added achievement unlock storage for adaptive learning milestones",
      "Added Chemistry Hub, homepage, roadmap, and navigation links for Learning Dashboard and Study Plan",
    ],
  },
  {
    version: "3.4.0",
    date: "Previous",
    status: "released",
    title: "Spectroscopy Knowledge Core",
    changes: [
      "Added root spectroscopy types and functional-group IR reference records for alcohols, aldehydes, ketones, carboxylic acids, esters, amines, amides, alkenes, alkynes, arenes, and nitriles",
      "Added deterministic spectroscopy question templates for IR peak recognition, functional group identification, peak assignment, compound elimination, and spectral matching",
      "Added /spectroscopy with searchable IR reference tables and quick-study functional group cards",
      "Added Spectroscopy to Chemistry Database search, tabs, and knowledge-core counts",
      "Added Spectroscopy topic support to Practice Generator, Study Mode, Recovery Mode, Exam Generator, diagnostics, and curriculum mappings",
      "Added spectroscopy-specific progress analytics for attempts, accuracy, weakest concept, and strongest concept",
      "Preserved existing AI functionality while enabling database-generated spectroscopy questions entirely offline from OpenRouter",
    ],
  },
  {
    version: "3.3.0",
    date: "Previous",
    status: "released",
    title: "Deterministic Exam Engine",
    changes: [
      "Added reusable exam-engine modules for blueprints, deterministic generation, scoring, metrics, and typed exam records",
      "Added predefined exam blueprints for General First-Year Chemistry, CHEM 121, IB Chemistry, AP Chemistry, and A-Level Chemistry styles",
      "Added Database Only, AI Only, and Hybrid source modes to Exam Generator",
      "Added adaptive database exams that weight weak topics from existing progress data",
      "Added exam metrics for database percentage, AI percentage, estimated completion time, coverage, and question breakdown",
      "Added /exam-engine with blueprint coverage, supported curricula, performance targets, and deterministic exam statistics",
      "Added exam-source analytics for database, AI, hybrid, and adaptive exam scores on My Progress",
      "Updated exam PDF metadata with exam source, coverage summary, curriculum units tested, and question breakdown",
      "Preserved existing AI exam generation, free-model-only guardrails, and no paid fallback policy",
    ],
  },
  {
    version: "3.2.0",
    date: "Previous",
    status: "released",
    title: "Database Generated Questions",
    changes: [
      "Added deterministic question engine modules with reusable templates, validators, typed questions, and generator facade",
      "Added database-generated multiple choice questions for functional groups, formulas, molar mass, ion charges, reaction types, compound classification, and periodic trends",
      "Added plausible distractor generation from chemistry database similarity",
      "Added /question-engine with template coverage, database metrics, supported topics, and sample questions",
      "Added Practice Generator source modes: Database Only, AI Only, and Hybrid",
      "Added Database Generated and AI Generated source badges",
      "Added source-level progress analytics for database questions and AI questions",
      "Preserved existing AI generation, OpenRouter free-model-only guardrails, and no paid fallback policy",
    ],
  },
  {
    version: "3.1.0",
    date: "Previous",
    status: "released",
    title: "Chemistry Knowledge Core",
    changes: [
      "Added root chemistry knowledge modules for compounds, ions, functional groups, reaction templates, typed records, and registry lookup",
      "Added more than 100 compound records through the existing database projection plus v3.1 supplemental staples",
      "Added 50+ common ions with formulas, charges, categories, and aliases",
      "Added 11 functional group registry entries for future validation and generation workflows",
      "Added starter reaction templates for acid-base, neutralization, combustion, addition, elimination, substitution, esterification, hydrolysis, redox, and precipitation",
      "Added /chemistry-database for browsing and searching the local knowledge core",
      "Added deterministic helper functions for compound lookup, ion lookup, functional group lookup, reaction lookup, and future AI prompt context",
      "Preserved existing AI, curriculum, study, diagnostic, recovery, molecule, reaction, and spectroscopy behavior",
    ],
  },
  {
    version: "3.0.0",
    date: "Previous",
    status: "released",
    title: "Curriculum Engine",
    changes: [
      "Added shared curriculum registry for General First-Year Chemistry, CHEM 121 Style, IB Chemistry Style, AP Chemistry Style, and A-Level Chemistry Style",
      "Added selected learning path fields to user profiles",
      "Added Curriculum Engine dashboard at /curriculum",
      "Added unit-by-unit mastery, weakest/strongest unit, recommended next unit, and diagnostic coverage summaries",
      "Added curriculum selection and curriculum achievements to My Progress",
      "Added curriculum, unit, topic, and subtopic constraints to Practice Generator, Study Mode, Exam Generator, Diagnostic Assessment, and Recovery Mode",
      "Added curriculum diagnostic mode and unit-level diagnostic coverage summaries",
      "Added legal copy clarifying curriculum labels are study-style alignment, not official syllabus coverage",
      "Preserved OpenRouter free-model-only guardrails with no client-side model selection or paid fallback",
    ],
  },
  {
    version: "2.7.0",
    date: "Previous",
    status: "released",
    title: "Diagnostic Assessment & Placement Engine",
    changes: [
      "Added Diagnostic Assessment route at /diagnostic",
      "Added AI-generated mixed chemistry diagnostics with 20, 40, or 60 questions",
      "Added server-side diagnostic JSON validation with exact question counts, topic metadata, and four-choice answer checks",
      "Added one-question-at-a-time diagnostic flow with immediate feedback and explanations",
      "Added topic and subtopic accuracy summaries with placement bands",
      "Added recommended study order and links to Recovery Mode, Study Mode, Practice Generator, Exam Generator, and Progress",
      "Added diagnostic PDF, answer key PDF, and diagnostic report PDF exports",
      "Added diagnostic profile fields, progress integration, XP rewards, and diagnostic achievements",
      "Preserved free-model-only AI guardrails with no client-side model selection or paid fallback",
    ],
  },
  {
    version: "2.6.0",
    date: "Previous",
    status: "released",
    title: "PDF Export System",
    changes: [
      "Added client-side PDF export support with jsPDF and jsPDF AutoTable",
      "Added Download PDF and Download Answer Key PDF actions to Practice Generator",
      "Added printable exam PDFs and separate answer key PDFs to Exam Generator",
      "Added Study Mode PDF exports with questions, answers, and explanations",
      "Added Recovery Mode PDFs with weak concepts, starting mastery, ending mastery, and solutions",
      "Added clean black-and-white printable formatting with page breaks, page numbers, and ARSHLAB footers",
      "Kept PDF generation entirely client-side with no server storage or database changes",
    ],
  },
  {
    version: "2.5.1",
    date: "Previous",
    status: "released",
    title: "Automatic Subtopic Classification",
    changes: [
      "Added a shared chemistry topic-to-subtopic registry",
      "Added required AI question subtopic metadata for practice, study, recovery, and exam generation",
      "Added server-side subtopic inference when generated output omits metadata",
      "Replaced known-topic General fallbacks with meaningful chemistry concepts",
      "Added Thermodynamics subtopics including Enthalpy, Entropy, Gibbs Free Energy, Hess Law, and Calorimetry",
      "Improved Most Missed Concepts so concept mastery uses specific subtopics",
      "Improved Recovery Mode targeting from weak subtopics instead of generic topic buckets",
      "Preserved existing free-model-only AI guardrails",
    ],
  },
  {
    version: "2.5.0",
    date: "Previous",
    status: "released",
    title: "Mistake Analytics & Mastery Tracking",
    changes: [
      "Extended practice progress with subtopic and question-type metadata",
      "Added concept_progress analytics storage with Supabase RLS",
      "Added Most Missed Concepts analytics on My Progress",
      "Added topic mastery bands: Weak, Developing, Strong, and Mastered",
      "Added weakest, strongest, most improved, and most attempted topic dashboard cards",
      "Upgraded Recovery Mode to target weak concepts instead of only broad topics",
      "Passed weak-area data into recovery prompts while preserving free-model-only guardrails",
      "Added achievements for First Recovery Session, Mastered Topic, 10 Correct In A Row, 100 Questions Attempted, and 500 XP Earned",
    ],
  },
  {
    version: "2.4.0",
    date: "Previous",
    status: "released",
    title: "Recovery Mode",
    changes: [
      "Added Recovery Mode at /recovery",
      "Added weak topic detection from practice_progress records",
      "Flagged weak topics with at least five attempts and below 60% accuracy",
      "Added automatic 10-question recovery session generation",
      "Added 70/20/10 recovery distribution for two weak topics",
      "Added 90/10 recovery distribution for one weak topic",
      "Added adaptive difficulty selection from mastery percentage",
      "Added before/after/improvement recovery summaries",
      "Added Recommended Recovery integration on My Progress",
      "Preserved existing free-model-only AI guardrails",
    ],
  },
  {
    version: "2.3.0",
    date: "Previous",
    status: "released",
    title: "Study Mode & Adaptive Learning",
    changes: [
      "Added guided Study Mode at /study",
      "Added one-question-at-a-time study sessions",
      "Added immediate answer feedback",
      "Added current streak, remaining questions, and session accuracy",
      "Added XP and level tracking",
      "Added daily goal preferences and progress bars",
      "Added weighted topic mastery calculations",
      "Added adaptive recovery recommendations for topics below 60% mastery",
      "Added achievement badges",
      "Expanded My Progress into Overview, Topics, Achievements, and Recent Activity",
      "Connected Practice Generator and Exam Generator self-marking to XP rewards",
    ],
  },
  {
    version: "2.2.0",
    date: "Previous",
    status: "released",
    title: "Exam Generator Alpha",
    changes: [
      "Added full AI-generated chemistry practice exams",
      "Added curriculum, length, difficulty, and question-type controls",
      "Added validated exam JSON generation",
      "Added answer and explanation reveal controls for exam questions",
      "Added copy entire exam and copy answer key actions",
      "Integrated exam self-marking with practice progress",
      "Added recovery exam generation from weak-topic detection",
      "Preserved free-model-only AI guardrails",
    ],
  },
  {
    version: "2.1.1",
    date: "Previous",
    status: "released",
    title: "Practice Generator Plus",
    changes: [
      "Added question set generation",
      "Added 1, 5, 10, and 20 question set sizes",
      "Added study session mode",
      "Added self-marking",
      "Added Supabase-backed practice progress tracking",
      "Added My Progress page",
      "Added session score summary",
      "Added weakness detection for recent missed topics",
      "Added copy entire set",
      "Added copy questions only",
      "Added copy answer key",
      "Added stronger validation",
      "Added topic-specific generation guidance",
      "Added quality warnings",
    ],
  },
  {
    version: "2.1.0",
    date: "Previous",
    status: "released",
    title: "Practice Generator Alpha",
    changes: [
      "Added AI-assisted practice question generator",
      "Added multiple choice question generation",
      "Added short answer question generation",
      "Added explanation prompts",
      "Added support for functional groups, hybridization, VSEPR, periodic trends, electron configuration, and IR spectroscopy",
      "Added answer/explanation reveal controls",
      "Added validation and educational disclaimers",
    ],
  },
  {
    version: "2.0.0",
    date: "Previous",
    status: "released",
    title: "Free AI Chemistry Assistant Alpha",
    changes: [
      "Added AI Assistant page",
      "Added zero-cost guardrails",
      "Added free-model-only enforcement",
      "Added usage limits",
      "Added no paid fallback policy",
      "Added educational disclaimer",
    ],
  },
  {
    version: "1.9.1",
    date: "Previous",
    status: "released",
    title: "Account and History Polish",
    changes: [
      "Added account dropdown",
      "Added individual history item deletion",
      "Added friendly timestamps",
      "Added JSON and CSV history export",
      "Added better empty states",
      "Improved account history summary",
      "Updated privacy wording",
    ],
  },
  {
    version: "1.9.0",
    date: "Previous",
    status: "released",
    title: "Permanent Account History",
    changes: [
      "Added Supabase-backed saved molecule history",
      "Added Supabase-backed saved reaction history",
      "Added history sync for logged-in users",
      "Added guest-to-account history migration",
      "Added clear saved molecule history",
      "Added clear saved reaction history",
      "Added clear all saved history",
      "Added account history statistics",
      "Updated privacy and terms for saved history",
    ],
  },
  {
    version: "1.8.1",
    date: "Previous",
    status: "released",
    title: "Stability and Polish Pass",
    changes: [
      "Added navigation polish",
      "Added mobile usability improvements",
      "Improved legal/footer consistency",
      "Completed account page QA",
      "Completed guest history QA",
      "Added 3D tool layout and WebGL fallback fixes",
      "Added periodic table layout polish",
      "Added accessibility improvements",
      "Completed production build verification",
    ],
  },
  {
    version: "1.8.0",
    date: "Previous",
    status: "released",
    title: "Hybridization Builder Alpha",
    changes: [
      "Added Interactive Hybridization Builder",
      "Added sp, sp2, sp3, sp3d, and sp3d2 modes",
      "Added 3D hybrid orbital visualization",
      "Added outer atom placement",
      "Added conceptual orbital overlap detection",
      "Added sigma overlap labels",
      "Added example presets for BeCl2, BF3, CH4, NH3, H2O, PCl5, SF6, and XeF4",
      "Added electron geometry vs molecular geometry explanations",
    ],
  },
  {
    version: "1.7.0",
    date: "Previous",
    status: "released",
    title: "Supabase Authentication Alpha",
    changes: [
      "Added email/password sign up",
      "Added login/logout",
      "Added persistent Supabase sessions",
      "Updated Account page",
      "Prepared future permanent user history",
    ],
  },
  {
    version: "1.6.0",
    date: "Previous",
    status: "released",
    title: "Element Profile Expansion",
    changes: [
      "Added successive ionization energy graphs",
      "Added electron affinity panels",
      "Added property comparison graphs",
      "Added data completeness indicators",
      "Expanded natural form and allotrope data",
      "Expanded transition metal color cards",
      "Added radioactive/synthetic element badges",
      "Improved element profile organization",
    ],
  },
  {
    version: "1.5.0",
    date: "Previous",
    status: "released",
    title: "Bond Energy & Orbital Overlap Explorer",
    changes: [
      "Added Interactive Bonding Explorer",
      "Added potential energy vs internuclear distance graph",
      "Added sigma overlap visualization",
      "Added pi overlap visualization",
      "Added electron cloud overlap mode",
      "Added space-filling mode",
      "Added force arrows for attraction and repulsion",
      "Added bond length marker",
      "Added Morse-potential-style educational curve",
      "Added presets for H-H, H-F, F-F, Cl-Cl, O=O, N2, C=C, C2, He-He, and Ne-Ne",
      "Added educational explanations for bond formation",
    ],
  },
  {
    version: "1.4.0",
    date: "Previous",
    status: "released",
    title: "Electron Configurations & Periodic Trends",
    changes: [
      "Added Interactive Electron Configuration Builder",
      "Added orbital filling animation",
      "Added teaching exceptions for Cr, Cu, Ag, Au, and Mo",
      "Added periodic trend heatmaps",
      "Added trend comparison tool",
      "Added Periodic Trends Quiz",
      "Added educational trend explanations",
    ],
  },
  {
    version: "1.3.0",
    date: "Previous",
    status: "released",
    title: "Element Profile Upgrade",
    changes: [
      "Added richer element profile cards",
      "Added electron configuration and noble gas notation",
      "Added orbital box diagrams",
      "Added periodic property panels",
      "Added oxidation state data",
      "Added natural elemental forms",
      "Added octet-rule exception examples",
      "Added transition metal color and wavelength cards",
    ],
  },
  {
    version: "1.2.0",
    date: "Previous",
    status: "released",
    title: "Temporary Guest History",
    changes: [
      "Added temporary guest history",
      "Added History page",
      "Molecule searches now save locally for the current session",
      "Reaction searches now save locally for the current session",
      "Added clear history controls",
      "No account required",
    ],
  },
  {
    version: "1.1.0",
    date: "Previous",
    status: "released",
    title: "Creator and Learning Ecosystem Release",
    changes: [
      "About Creator page with profile, biography, and mission statement",
      "Social links section (YouTube channel linked)",
      "Practice Papers hub with filters and sample metadata entries",
      "Video Solutions hub with category browsing and coming soon entries",
      "Roadmap page with completed, in development, and planned features",
      "Learning Ecosystem section on homepage",
      "High School → First Year University curriculum architecture",
      "Future AI question generation hierarchy (Subject → Topic → Subtopic → Concept → Templates)",
    ],
  },
  {
    version: "1.0.0",
    date: "Previous",
    status: "released",
    title: "Massive Chemistry Engine Release",
    changes: [
      "Master Chemistry Database with scalable TypeScript architecture",
      "Complete periodic table (118 elements) with interactive viewer",
      "Expanded molecule database (organic generators + inorganic seeds)",
      "Lewis structure engine with templates and formal charge analysis",
      "VSEPR engine with all major molecular geometries",
      "Orbital viewer expansion including 6f orbitals and ml quantum numbers",
      "Spectroscopy infrastructure (IR, NMR, MS records + FG fallbacks)",
      "Reaction family database (combustion through redox)",
      "Global chemistry search engine",
      "Question generation metadata foundation (no AI questions yet)",
      "Future-ready user account schema",
      "Local analytics tracker",
      "Education Hub infrastructure (lessons, practice, past papers — planned)",
      "Chemistry Hub dashboard at /chemistry-hub",
    ],
  },
  {
    version: "0.8.0",
    date: "Previous",
    status: "released",
    title: "Full Periodic Table Orbital Viewer",
    changes: [
      "Added s orbitals from 1s to 7s",
      "Added p orbitals from 2p to 7p",
      "Added d orbitals from 3d to 6d",
      "Added f orbitals from 4f to 5f",
      "Added radial node visualization",
      "Added angular node visualization",
      "Added node/asymptote surface toggle",
      "Added phase coloring",
      "Added orbital quantum number cards",
      "Added orbital filtering by family and principal quantum number",
      "Added educational explanations for nodes and phases",
    ],
  },
  {
    version: "0.6.0",
    date: "Previous",
    status: "released",
    title: "Functional Groups & Spectroscopy",
    changes: [
      "Added all 9 IB HL functional groups",
      "Added Functional Group Explorer",
      "Added Spectroscopy Lab learning section",
      "Added educational IR visualization",
      "Added mass spectrometry basics",
      "Added proton NMR basics",
      "Added functional-group-aware search",
      "Added amides and ethers",
      "Added aromatic/phenyl support (toluene)",
      "Added halogenoalkanes, aldehydes, and ketones",
      "Added Study Mode on molecule cards",
      "Added functional group highlighting",
      "Added primary/secondary classifications",
    ],
  },
  {
    version: "0.5.0",
    date: "Previous",
    status: "released",
    title: "Amines, Symmetry, and Better 2D Structures",
    changes: [
      "Added NH2 / primary amine support",
      "Added ammonia, methylamine, ethylamine, propylamine, and aniline",
      "Added condensed formula normalization",
      "Added support for reversed formulas such as H3C-CH3",
      "Added symmetry notes for common molecules",
      "Improved 2D text-art structures",
      "Added double bond = support in text-art",
      "Added triple bond ≡ support in text-art",
      "Added lone pair toggle for 2D and 3D views",
      "Added symmetry toggle",
    ],
  },
  {
    version: "0.7.0",
    date: "Planned",
    status: "coming-soon",
    title: "Equation Balancing & More Isomers",
    changes: [
      "Add automatic equation balancing",
      "Add more isomer support (branched alkanes)",
      "Add ester generation from alcohols + acids",
      "Add benzene derivatives (xylene)",
      "Add user history saving",
      "Add spectroscopy quiz cards",
    ],
  },
  {
    version: "0.4.0",
    date: "Previous",
    status: "released",
    title: "3D Molecule Viewer Alpha",
    changes: [
      "Added interactive 3D molecule viewer using Three.js",
      "Added mouse rotation, zoom, and pan controls",
      "Added hard-coded 3D structures for 15 common molecules",
      "Supported molecules: water, CO2, ammonia, methane, ethane, propane",
      "Supported molecules: ethene, ethyne, methanol, ethanol",
      "Supported molecules: propan-1-ol, propan-2-ol, ethanoic acid, benzene",
      "Added show/hide hydrogens toggle",
      "Added atom labels with element symbols",
      "Added lone pair visualization (purple dots)",
      "Added bond angle arc labels",
      "Added bond length display",
      "Added ball-and-stick mode (default)",
      "Added space-filling mode (van der Waals radii)",
      "Added 2D/3D view toggle in molecule result card",
      "3D button disabled for molecules without 3D data",
      "Added loading animation during 3D generation",
    ],
  },
  {
    version: "0.3.0",
    date: "Previous",
    status: "released",
    title: "Proper 2D Molecule Renderer",
    changes: [
      "Improved text-art structure rendering",
      "Better bond visualization",
      "Improved molecule card layout",
      "Added search suggestions",
    ],
  },
  {
    version: "0.2.0",
    date: "Previous",
    status: "released",
    title: "Rule-Based Chemistry Engine",
    changes: [
      "Added alkanes C1-C20 with auto-generated formulas",
      "Added alkenes C2-C20 with double bond structures",
      "Added alkynes C2-C20 with triple bond structures",
      "Added primary alcohols C1-C20",
      "Added secondary alcohols (propan-2-ol, butan-2-ol)",
      "Added carboxylic acids C1-C20",
      "Added simple esters (methyl/ethyl/propyl ethanoate)",
      "Added benzene, phenol, glucose, glycogen",
      "Added molecule search by name, alias, or formula",
      "Added 2D text-art structure visualization",
      "Added 2D/3D view toggle (3D placeholder)",
      "Added IB-level reaction templates",
      "Added combustion reaction recognition",
      "Added hydrogenation (alkene + H2)",
      "Added bromination (alkene + Br2)",
      "Added esterification recognition",
      "Added neutralization (acid + base)",
      "Added acid + carbonate reactions",
      "Added metal + acid reactions",
      "Added autocomplete suggestions in search",
      "Added polarity and H-bonding indicators",
    ],
  },
  {
    version: "0.1.0",
    date: "Initial",
    status: "released",
    title: "Initial ARSHLAB Launch",
    changes: [
      "Landing page with modern design",
      "Molecule Builder UI with input system",
      "Reaction Lab UI with equation input",
      "Account system placeholder",
      "Patch notes system",
      "Responsive mobile-friendly layout",
      "Navigation between all sections",
      "Floating atoms animation",
    ],
  },
]

const roadmap = [
  { label: "More 3D Molecules", status: "planned" as const },
  { label: "Equation Auto-Balancing", status: "planned" as const },
  { label: "More Isomers & Branching", status: "planned" as const },
  { label: "Polarity Calculations", status: "planned" as const },
  { label: "Partial Charge Display", status: "planned" as const },
  { label: "Hybridization Detection", status: "planned" as const },
  { label: "User Account System", status: "planned" as const },
  { label: "Canvas/SVG 2D Renderer", status: "planned" as const },
]

const statusConfig = {
  released: { label: "Released", color: "bg-green-500/10 text-green-600 border-green-500/20", icon: Check },
  beta: { label: "Beta", color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20", icon: Zap },
  "coming-soon": { label: "Coming Soon", color: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: Clock },
}

function StatusBadge({ status }: { status: VersionStatus }) {
  const config = statusConfig[status]
  const Icon = config.icon
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium", config.color)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  )
}

function VersionCard({ note, defaultExpanded = false }: { note: PatchNote; defaultExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  return (
    <Card className="rounded-2xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left"
      >
        <CardHeader className="flex flex-row items-center justify-between gap-4 p-5 hover:bg-secondary/30 transition-colors">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-mono font-bold text-sm">
              {note.version}
            </div>
            <div>
              <CardTitle className="text-lg">{note.title}</CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">{note.date}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={note.status} />
            <ChevronDown className={cn("h-5 w-5 text-muted-foreground transition-transform", expanded && "rotate-180")} />
          </div>
        </CardHeader>
      </button>
      
      {expanded && (
        <CardContent className="px-5 pb-5 pt-0">
          <ul className="space-y-2 border-l-2 border-border pl-4 ml-6">
            {note.changes.map((change, i) => (
              <li key={i} className="text-sm text-muted-foreground relative before:absolute before:-left-[21px] before:top-2 before:h-2 before:w-2 before:rounded-full before:bg-accent">
                {change}
              </li>
            ))}
          </ul>
        </CardContent>
      )}
    </Card>
  )
}

export default function PatchNotesPage() {
  const totalChanges = patchNotes.reduce((acc, n) => acc + n.changes.length, 0)
  const releasedChanges = patchNotes
    .filter((n) => n.status === "released")
    .reduce((acc, n) => acc + n.changes.length, 0)

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Rocket className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Patch Notes
              </h1>
              <p className="text-muted-foreground">Development Progress & Changelog</p>
            </div>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Track what chemistry functionality has been implemented and what&apos;s coming next. 
            ARSHLAB is actively developed with new features added regularly.
          </p>
        </motion.div>

        <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
          {/* Version History */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-4"
          >
            {patchNotes.map((note, i) => (
              <VersionCard key={note.version} note={note} defaultExpanded={i === 0} />
            ))}
          </motion.div>

          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            {/* Roadmap */}
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Star className="h-5 w-5" />
                  Roadmap
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {roadmap.map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                    <span className="text-sm text-muted-foreground">
                      {item.label}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Stats */}
            <Card className="rounded-2xl bg-primary text-primary-foreground">
              <CardHeader>
                <CardTitle className="text-lg">Project Stats</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-3xl font-bold">{patchNotes.length}</p>
                  <p className="text-sm opacity-80">Versions</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold">{releasedChanges}</p>
                  <p className="text-sm opacity-80">Released</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold">{totalChanges}</p>
                  <p className="text-sm opacity-80">Total Changes</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold">{roadmap.length}</p>
                  <p className="text-sm opacity-80">Planned</p>
                </div>
              </CardContent>
            </Card>

            {/* Compound Stats */}
            <Card className="rounded-2xl border-dashed">
              <CardContent className="p-5">
                <h3 className="font-medium text-foreground mb-3">Database Stats</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>• 20 Alkanes (C1-C20)</p>
                  <p>• 19 Alkenes (C2-C20)</p>
                  <p>• 19 Alkynes (C2-C20)</p>
                  <p>• 20 Alcohols (C1-C20)</p>
                  <p>• 20 Carboxylic Acids</p>
                  <p>• 9 IB HL Functional Groups</p>
                  <p>• Spectroscopy Data (12+ molecules)</p>
                  <p>• 7 Reaction Types</p>
                  <p className="font-medium text-foreground pt-2">~100+ compounds total</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
