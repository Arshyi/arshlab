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
    version: "8.4.0",
    date: "Current",
    status: "released",
    title: "Conjugation, Resonance and Delocalization Learning Engine",
    changes: [
      "Added /interactive-learning/conjugation as a deterministic SVG learning engine for conjugation and resonance",
      "Added conjugation detection for pi bonds, participating lone pairs, empty p orbitals, radicals, conjugation breaks, and principal conjugated pathways",
      "Added a step-by-step algorithm explorer showing hybridization checks, p-orbital availability, adjacency, DFS traversal, electron counting, aromaticity, and HOMO-LUMO reasoning",
      "Added delocalized electron counting, resonance-form explanations, curved-arrow tutor validation, Huckel aromaticity decisions, UV-Vis color learning, energy-gap animation, and practice mode",
      "Added a real molecule teaching library covering benzene, fused aromatics, heteroaromatics, polyenes, carbonyl conjugation, resonance ions, and material fragments",
      "Added regression commands for conjugation, resonance, aromaticity, electron counting, Huckel logic, pi systems, delocalization, principal pathways, curved arrows, and UV-Vis learning",
    ],
  },
  {
    version: "8.3.0",
    date: "Previous",
    status: "released",
    title: "Interactive Molecular Orbital & Hybridization Learning Engine",
    changes: [
      "Added a new /interactive-learning route for programmatic molecular orbital and hybridization visualizations",
      "Added a deterministic MO diagram renderer for H2, He2, Li2, Be2, B2, C2, N2, O2, F2, Ne2, O2+, O2-, B2+, N2+, NO, and CO",
      "Added electron filling animation controls for play, pause, step forward, step backward, reset, and speed",
      "Added live HOMO/LUMO highlighting, bond order calculation, bonding/antibonding electron counts, and magnetism explanations",
      "Added hybridization, energy-level, sigma/pi overlap, orbital rotation, lone-pair, pi-bond, examples-library, and quiz-mode learning panels",
      "Added deterministic regression commands for MO building, hybridization, HOMO/LUMO, sigma/pi, lone pairs, bond order, orbital rendering, orbital animation, and interactive learning coverage",
    ],
  },
  {
    version: "8.2.0",
    date: "Previous",
    status: "released",
    title: "Vision Reconstruction Pipeline",
    changes: [
      "Added deterministic vision reconstruction modules before graph validation",
      "Added stroke segmentation, line merging, endpoint clustering, junction detection, atom-center estimation, bond association, broken-stroke repair, crossing-bond filtering, and primitive confidence scoring",
      "Added a cleaner primitive graph handoff before graph validation and the molecular compiler",
      "Added primitive-level confidence channels for strokes, junctions, atoms, bonds, and repairs",
      "Added a Vision Reconstruction debug panel showing strokes, atom centers, accepted bonds, rejected bonds, repairs, confidence histogram, and final primitive graph metrics",
      "Added regression commands for stroke segmentation, junction detection, endpoint clustering, bond association, line merging, broken-stroke repair, primitive confidence, and the full vision reconstruction pipeline",
    ],
  },
  {
    version: "8.1.0",
    date: "Previous",
    status: "released",
    title: "Molecular Compiler Optimization Pipeline",
    changes: [
      "Added a deterministic Optimization Pass Manager after canonical compiler IR",
      "Added plug-and-play optimization pass interfaces, registry, pass metrics, and rollback-safe execution",
      "Added Dead Node Elimination, Dead Edge Elimination, Component Simplification, Ring Optimization, Bond Order Cleanup, Valence Cleanup, Confidence Propagation, and Canonical Ordering passes",
      "Added validation after each optimization pass with automatic rollback when graph validity gets worse",
      "Added optimized compiler IR handoff so downstream chemistry engines consume validated optimized IR",
      "Added an Optimizer debug panel showing IR before/after, pass execution log, graph hashes, timing, warnings, errors, and rollbacks",
      "Added optimizer regression commands for optimization, pass manager ordering, rollback behavior, and confidence propagation",
    ],
  },
  {
    version: "8.0.0",
    date: "Previous",
    status: "released",
    title: "Molecular Compiler Architecture",
    changes: [
      "Added a deterministic Molecular Compiler subsystem for structure recognition",
      "Added Visual Tokenizer, Primitive Builder, Chemical AST, Semantic Validator, Canonicalizer, Compiler IR, and Compiler Report layers",
      "Added compiler IR with canonical adjacency list, node ordering, edge ordering, graph fingerprint, deterministic graph hash, canonical graph ID, valence map, charge map, components, cycles, and confidence ceiling",
      "Added compiler-style semantic checks before downstream chemistry interpretation",
      "Added confidence propagation so downstream graph confidence cannot exceed upstream compiler inputs",
      "Added a Molecular Compiler debug panel showing tokens, primitives, AST metrics, semantic validation, canonical graph, IR, timing, and knowledge-engine gate state",
      "Refactored scanner graph handoff so downstream chemistry engines consume the compiler canonical graph when semantic validation passes",
      "Added compiler regression commands for tokenizer, primitives, AST, semantic validation, canonicalizer, compiler IR, and full compiler pipeline",
    ],
  },
  {
    version: "7.3.0",
    date: "Previous",
    status: "released",
    title: "Graph Validation and Topology Reconstruction Engine",
    changes: [
      "Added a deterministic Graph Validation Engine before chemistry interpretation",
      "Added conservative edge validation with accepted, weak, recovered, and rejected edge decisions",
      "Added bridge validation with guaranteed, likely, possible, and unsafe bridge classifications",
      "Added cycle validation so rings require unique graph cycles, plausible angles, consistent bond lengths, and no crossing edges before aromatic reasoning",
      "Added graph sanity checks for duplicate nodes, crossing bonds, floating atoms, graph islands, edge loops, disconnected aromatic systems, and valence violations",
      "Added topology reconstruction variants with topology score, chemical legality, and visual agreement before selecting a final graph",
      "Added a Graph Validation debug panel with edge decisions, cycle decisions, structural fingerprint, topology variants, and candidate gate state",
      "Added candidate gating so visual chemistry interpretation is intentionally skipped when graph validation fails",
      "Added graph-validator, edge-validator, bridge-validator, cycle-validator, and topology regression commands",
    ],
  },
  {
    version: "7.2.0",
    date: "Previous",
    status: "released",
    title: "Chemical Contradiction and Candidate Elimination Engine",
    changes: [
      "Added a deterministic Chemical Contradiction Engine before final chemistry intelligence ranking",
      "Added identity requirements for reference candidates, including atom counts, heteroatom counts, ring counts, ring sizes, aromaticity, bond orders, branches, terminal OH, carbonyls, amines, halogens, connected components, and forbidden functional groups",
      "Added hard contradiction handling so impossible candidates are eliminated before database ranking",
      "Added soft contradiction handling for weaker structural mismatches that reduce confidence without immediate rejection",
      "Updated canonical graph matching so only chemically surviving candidates are ranked",
      "Added a Chemical Contradiction Report panel to scanner results with generated candidates, eliminated candidates, hard contradictions, soft contradictions, requirements checked, and rejected alternatives",
      "Added contradiction-engine regression tests for benzene, cyclohexane, ethanol, acetone, ethanoic acid, aniline, phenol, cyclohexene, and nitrobenzene substitutions",
    ],
  },
  {
    version: "7.1.0",
    date: "Previous",
    status: "released",
    title: "Reference Compound Graph Library",
    changes: [
      "Added a deterministic reference compound graph library for Chemistry Intelligence",
      "Seeded 100+ undergraduate canonical molecular graph records across hydrocarbons, alcohols, carbonyls, acids, esters, amides, amines, haloalkanes, aromatics, heterocycles, amino acids, sugars, and lab reagents",
      "Added standardized compound metadata with functional-group annotations, scaffold/family annotations, curriculum mappings, formula sheet mappings, spectroscopy hooks, reaction hooks, mechanism hooks, and safety notes where available",
      "Expanded canonical graph matching coverage for benzene derivatives, primary/secondary/tertiary alcohols, aldehydes, ketones, carboxylic acids, esters, amides, amines, aryl halides, heterocycles, amino acids, and common solvents/reagents",
      "Added graph matcher checks for 100+ graph coverage, positional benzene derivative distinctions, and expanded compound identity matching",
      "Expanded functional-group, property, knowledge graph, and scanner-intelligence regression checks for new reference compounds",
    ],
  },
  {
    version: "7.0.0",
    date: "Previous",
    status: "released",
    title: "Chemistry Intelligence Engine",
    changes: [
      "Added a deterministic Chemistry Intelligence Engine after consensus molecular graph solving",
      "Added canonical graph matching so rotated, mirrored, and renumbered equivalent molecule graphs resolve to stable identities",
      "Added hierarchical functional-group classification, including primary alcohols, phenols, ketones, aldehydes, carboxylic acids, esters, amides, amines, arenes, and related families",
      "Added scaffold and compound-family recognition for common organic structures such as benzene, cyclohexane, pyridine, naphthalene, amino acids, esters, and carbonyl compounds",
      "Added local chemical property summaries with formula, molar mass, charge, aromaticity, ring count, atom count, bond count, polarity, hydrogen-bonding, solubility, and physical-state estimates",
      "Connected recognized molecules to spectroscopy, reactions, mechanisms, curriculum topics, formula sheet entries, practice, exams, synthesis, and molecular visualization",
      "Added a Chemistry Intelligence Panel to scanner results with separate vision, graph, chemistry, knowledge, and overall confidence",
      "Added deterministic Explain Why reasoning so users can see the graph, functional-group, scaffold, and database evidence behind a match",
      "Added chemistry intelligence regression tests for graph matching, functional groups, properties, knowledge graph links, and core compound records",
    ],
  },
  {
    version: "6.3.0",
    date: "Previous",
    status: "released",
    title: "Scene Understanding and Molecule Segmentation Engine",
    changes: [
      "Added a deterministic Scene Understanding Engine before perspective normalization",
      "Added a SceneGraph model for molecule regions, multiple-molecule regions, reaction arrows, reaction conditions, chemical text, borders, reflections, human-object masks, noise, and background",
      "Added molecule segmentation so the scanner can crop the strongest molecule region before OCR, isolation, graph reconstruction, validation, consensus solving, and evidence fusion",
      "Added a deterministic reaction-arrow detector for horizontal, vertical, equilibrium-style, and curved mechanism-arrow-like strokes",
      "Separated reaction arrows and chemical text from molecular line structures so arrows and conditions do not become bonds",
      "Added low-contrast page/slide ruling suppression for notebook pages, textbook captures, PowerPoint slides, and browser screenshots",
      "Added deterministic reflection/glare and skin-like human-object masks for local suppression before graph reconstruction",
      "Added confidence isolation for scene understanding, segmentation, graph, chemistry, OCR, and overall scanner confidence",
      "Added a Scene Understanding Debug Panel with semantic overlays, selected molecule crop, detected regions, reaction layouts, scene graph metrics, and warnings",
      "Added deterministic scene-understanding regressions for single molecules, multiple molecules, reaction schemes, text-heavy pages, notebook pages, tablet/page/slide borders, reflections, and fingers/hands",
    ],
  },
  {
    version: "6.2.0",
    date: "Previous",
    status: "released",
    title: "Consensus Graph Solver",
    changes: [
      "Added a deterministic Consensus Graph Solver after global graph optimization and chemical validation",
      "Builds a shared canonical hypothesis pool from raw graphs, candidate graphs, optimized graphs, validated graphs, and legal repair variants",
      "Deduplicates molecular graphs with canonical hashes before scoring",
      "Scores each hypothesis across perspective/isolation support, stroke continuity, atom labels, ring evidence, bond-angle geometry, valence legality, database similarity, optimizer agreement, validator agreement, OCR support, and source consensus",
      "Added legal repair passes for long-edge removal, unsupported multiple-bond downgrades, missing ring-closure recovery, and aromatic six-ring promotion",
      "Added calibrated visual, graph, chemical, database, OCR, and overall confidence values",
      "Added ring conflict resolution so benzene outranks cyclohexane only when ring geometry and aromatic/double-bond evidence agree",
      "Added a Consensus Graph Solver Debug Panel with hypothesis counts, duplicate removal, score channels, repair history, runner-ups, conflict resolutions, and graph history",
      "Added Consensus Graph Solver as an independent Evidence Fusion vote so strong topology can survive weak or noisy OCR",
      "Added deterministic consensus regressions for benzene, cyclohexane, partial benzene, cyclohexene, heteroatom aromatic rings, noisy OCR, duplicate graphs, and fused-ring readiness",
    ],
  },
  {
    version: "6.1.0",
    date: "Previous",
    status: "released",
    title: "Global Shape Reconstruction Engine",
    changes: [
      "Added a deterministic Global Shape Reconstruction Engine before molecular graph construction",
      "Added segment clustering so fragmented bond strokes are merged into continuous reconstructed strokes",
      "Added safeguarded gap bridging with confidence that decreases as gaps grow",
      "Added corner inference for chemically plausible near-intersections between reconstructed strokes",
      "Added 3- to 8-member polygon hypotheses with closure error, edge consistency, angle consistency, symmetry, and fit metrics",
      "Added regular polygon fitting for triangles, squares, pentagons, hexagons, heptagons, and octagons without forcing acceptance",
      "Added tablet/paper border rejection, crossing safeguards, symmetry scoring, and no-distance-only edge hallucination rules",
      "Added a Global Shape Reconstruction Debug Panel plus overlay layers for original fragments, merged strokes, accepted edges, rejected bridges, candidate polygons, and predicted vertices",
      "Added Global Shape Reconstruction as an independent Evidence Fusion vote so strong recovered ring geometry can support scanner matches",
      "Added deterministic global-shape regressions for benzene, rotated/perspective rings, missing edges, fragmented bonds, scan gaps, tablet borders, clutter, cyclohexane, cyclopentane, and acyclic chains",
    ],
  },
  {
    version: "6.0.0",
    date: "Previous",
    status: "released",
    title: "Global Molecular Graph Optimizer",
    changes: [
      "Added a deterministic Candidate Graph Generator that builds multiple molecular graph hypotheses from the same local image evidence",
      "Added a Global Molecular Graph Optimizer that accepts only legal graph moves that improve whole-molecule score",
      "Added whole-molecule scoring across visual confidence, bond-length consistency, bond-angle consistency, valence satisfaction, ring closure quality, aromatic stability, functional-group consistency, database similarity, simplicity, connectivity, and artifact penalties",
      "Added a Bond Angle Engine for sp, sp2, and sp3 geometry support plus impossible-geometry penalties",
      "Added ring-template fitting for 5-, 6-, 7-, and 8-member ring candidates with RMS error and confidence metrics",
      "Added canonical molecular graph generation with stable atom ordering, bond ordering, and deterministic graph hashes for future SMILES/InChI-style work",
      "Added a Global Graph Optimizer Debug Panel with candidate counts, selected hypothesis, runner-ups, accepted/rejected moves, score breakdown, angle statistics, ring-template statistics, and convergence graph",
      "Added the optimizer as an independent Evidence Fusion engine vote while preserving all existing OCR, isolation, ring-closure, validation, and local-only scanner safeguards",
      "Added deterministic optimizer and bond-angle regression tests for benzene, cyclohexane safeguards, long-edge pruning, aromatic triple correction, database ranking, and geometry scoring",
    ],
  },
  {
    version: "5.9.0",
    date: "Previous",
    status: "released",
    title: "Perspective-Normalized Structure Extraction",
    changes: [
      "Added a deterministic Perspective Normalizer before OCR, isolation, graph reconstruction, ring closure, validation, and evidence fusion",
      "Detects likely tablet, paper, whiteboard, and screenshot chemistry canvases from bright rectangular regions, stroke density, atom-label cues, bond-like transitions, and clutter rejection",
      "Deskews selected canvas regions into normalized local crops with grayscale, high-contrast, thresholded, glare-reduced, and inverted variants",
      "Added conservative safeguards so plaid/clothing lines, room edges, desk clutter, and tablet borders do not become molecular bonds",
      "Added a Perspective Normalization Debug Panel with selected quadrilateral overlays, rejected regions, variant scores, normalized previews, glare masks, and structure-region metrics",
      "Routes the best normalized crop into the existing local OCR, structure isolation, molecular graph, ring-closure, chemical validation, and evidence-fusion pipeline",
      "Preserved fallback behavior: if no confident paper/screen/whiteboard region is found, ARSHLAB uses the existing structure-isolation pipeline",
      "Added deterministic perspective-normalizer regressions for clean screenshots, tilted tablet captures, hands/arms, glare, dark bezels, partial crops, ethanol, methanal, paper photos, clutter-only scenes, and plaid background safeguards",
    ],
  },
  {
    version: "5.8.0",
    date: "Previous",
    status: "released",
    title: "Chemical Graph Validation and Edge Pruning",
    changes: [
      "Added a deterministic Chemical Graph Validator between molecular graph reconstruction and final scanner evidence fusion",
      "Added long-bond and high-crossing edge pruning to suppress tablet borders, hand/background diagonals, and scene artifacts",
      "Added basic valence enforcement for H, C, N, O, halogens, and common atom labels by pruning weakest/longest incident bonds",
      "Added false triple-bond correction so crowded parallel strokes do not overmatch ethyne, alkynes, or nitriles",
      "Preserved aromatic evidence when a validated six-member ring has reliable local double-bond/ring-closure support",
      "Added a Chemical Graph Validator Debug Panel with raw/accepted/pruned bond counts, valence fixes, bond-order corrections, and plausibility explanations",
      "Expanded the Visual Overlay Debugger with rejected bonds, accepted validated bonds, valence issues, bond-order corrections, and final validated ring polygons",
      "Added deterministic validator regressions for benzene, clutter/tablet borders, cyclohexane, cyclohexene, ethene, real triples, false triples, long diagonals, and valence cleanup",
    ],
  },
  {
    version: "5.7.0",
    date: "Previous",
    status: "released",
    title: "Ring Closure Engine",
    changes: [
      "Added a deterministic Ring Closure Engine before final evidence fusion for cyclic and near-cyclic drawings",
      "Added atom-label endpoint snapping and short gap bridging so interrupted C/H/O/N glyphs can still form molecular rings",
      "Added 5-, 6-, 7-, and 8-member true-cycle and one-missing-edge near-cycle recovery",
      "Added ring-closure candidate metrics for member count, closure confidence, polygon regularity, line coverage, aromatic support, and rejection reasons",
      "Added ring-closure as an independent Evidence Fusion engine vote with benzene versus cyclohexane safeguards",
      "Calibrated aromatic support so benzene outranks open-chain alkene candidates only when ring geometry and double-bond evidence agree",
      "Added heteroatom safeguards for pyridine-like rings so N-containing rings do not overmatch benzene",
      "Expanded Vision Debug and Visual Overlay Debugger with snapped endpoints, bridged gaps, selected/rejected polygons, and atom-label centroids",
      "Added deterministic ring-closure regressions for clean benzene, camera glare, tablet borders, missing edges, clutter, cyclohexane, cyclohexene, ethene, propene, pyridine, and fused-ring preparation",
    ],
  },
  {
    version: "5.6.0",
    date: "Previous",
    status: "released",
    title: "Structure Isolation Engine",
    changes: [
      "Upgraded structure isolation into an authoritative preprocessing stage before OCR and graph reconstruction",
      "Added multi-source candidate proposals from connected components, dark-pixel clusters, contours, bond density, and ring geometry",
      "Added per-region bond segments, parallel pairs, ring cues, aromatic evidence, and chemistry-density scoring",
      "Added mean bond length, bond-length variance, and regularity scoring to distinguish molecules from scene-scale edges",
      "Added deterministic suppression for image borders, device frames, paper edges, room geometry, desk edges, low-density clutter, and inconsistent line scales",
      "Preserved nested molecule proposals inside tablet and monitor frames instead of merging them into the bezel",
      "Added low-confidence multi-crop fallback with independent local OCR and graph probes for up to three candidate regions",
      "Restricted final graph reconstruction and evidence fusion to variants from the winning chemistry region",
      "Expanded Structure Isolation Debug with candidate scores, accepted evidence, rejection reasons, atom counts, graph confidence, and fallback status",
      "Expanded isolation regressions to 20 scenes including low light, lecture slides, multiple candidates, reflections, clutter, perspective, and occlusion",
    ],
  },
  {
    version: "5.5.0",
    date: "Previous",
    status: "released",
    title: "Multi-Engine Evidence Fusion",
    changes: [
      "Replaced linear scanner ranking with seven independent deterministic evidence engines",
      "Added separate OCR Formula, Atom Label, Bond Geometry, Ring/Aromatic, Molecular Graph, Functional Group, and Filename/Manual Hint engines",
      "Added typed candidate confidence, evidence strength, reasoning, and penalty contracts for every engine",
      "Added deterministic weighted voting, multi-engine agreement bonuses, contradiction penalties, and manual correction overrides",
      "Prevented noisy or missing OCR from suppressing strong graph and aromatic-ring evidence",
      "Calibrated benzene versus cyclohexane ranking from ring geometry and aromatic bond support",
      "Capped OCR-only matches while allowing clean database-valid formulas and names to remain useful",
      "Added an Evidence Fusion Debug Panel with per-engine candidates, contributions, reasoning, penalties, and voting summary",
      "Added separate OCR, graph, ring/aromatic, and chemistry fusion confidence indicators",
      "Added ten evidence-fusion regressions covering clutter, perspective, occlusion, saturated rings, displayed formulas, carbonyls, and invalid OCR noise",
    ],
  },
  {
    version: "5.4.4",
    date: "Previous",
    status: "released",
    title: "Structure-First Robust Scene Understanding",
    changes: [
      "Added multi-scale chemistry-region proposals that rank bond-like strokes, label-like components, repeated geometry, and ring geometry",
      "Added deterministic penalties for skin-toned regions, frame-scale borders, dense backgrounds, and tall object-like scene components",
      "Added original, grayscale, adaptive-threshold, high-contrast, inverted, and perspective-aware local crop variants",
      "Added graph-first variant selection so each proposed crop is reconstructed independently and the strongest chemistry topology wins",
      "Added planar quadrilateral estimation and browser-local perspective compensation for screens and photographed pages",
      "Added conservative local line continuation for glare, glyph gaps, and partially occluded bonds",
      "Added graph cleanup for border artifacts and disconnected scene components",
      "Separated OCR, molecular graph, and final chemistry confidence so weak OCR cannot suppress a decisive graph match",
      "Expanded Structure Isolation and Molecular Graph debug panels with region, variant, scene-penalty, and selection diagnostics",
      "Added 17 deterministic isolation and clutter stress fixtures covering screens, reflections, skin-toned occlusion, notebooks, cups, glare, perspective, partial crops, and multi-object scenes",
      "Preserved browser-local processing with no image uploads, external chemistry APIs, or AI calls",
    ],
  },
  {
    version: "5.4.3",
    date: "Previous",
    status: "released",
    title: "Atom-Centered Graph Reconstruction",
    changes: [
      "Added bounding-box and centroid extraction for chemistry-aware atom labels",
      "Added atom-label vertices with element, position, confidence, source, and snapped-stroke metadata",
      "Added configurable endpoint snapping from interrupted bond strokes to atom centroids",
      "Added short-gap bridging for handwritten and printed label-to-bond spacing",
      "Added atom-to-atom bond reconstruction with local parallel-line bond-order inference",
      "Moved labeled-structure cycle detection onto the atom graph with 3-8 member support",
      "Added six-member aromatic classification from reconstructed cycles and alternating double-bond evidence",
      "Expanded Molecular Graph Debug with atom centroids, snapped bonds, gap bridges, cycles, aromatic candidates, and snap radius",
      "Added printed benzene, camera benzene, cyclohexane, and hexane atom-centered regression fixtures",
      "Preserved stroke-graph fallback for unlabeled skeletal structures and all local-only privacy guarantees",
    ],
  },
  {
    version: "5.4.2",
    date: "Previous",
    status: "released",
    title: "Chemical Label Recognition",
    changes: [
      "Added chemistry-aware recognition for isolated H, C, N, O, S, P, F, Cl, Br, and I atom labels",
      "Separated atom labels from molecular and condensed formulas so scattered structure labels are not promoted into formulas",
      "Added dedicated molecule-name recognition backed by local compound names and aliases",
      "Added dedicated condensed-formula recognition for common organic structures",
      "Added explicit rejection and heavy scoring penalties for unsupported formula-like OCR noise",
      "Added separate graph, atom-label, formula, molecule-name, and noise-penalty scoring channels",
      "Expanded Chemistry OCR Debug with detected labels, names, formulas, rejected tokens, and chemistry confidence",
      "Added chemistry OCR regressions for labeled benzene, tablet benzene, ethanol, aspirin, propanone, and noisy handwriting",
      "Preserved browser-local OCR, isolation, graph reconstruction, camera capture, overlays, and privacy behavior",
    ],
  },
  {
    version: "5.4.1",
    date: "Previous",
    status: "released",
    title: "Automatic Structure Isolation",
    changes: [
      "Added browser-local grayscale conversion and adaptive thresholding before OCR and visual recognition",
      "Added connected-component analysis for dark chemistry strokes and nearby drawing-region clustering",
      "Added deterministic rejection for bezel-like borders, dense background objects, oversized shadows, and empty image regions",
      "Added automatic highest-density chemistry-region selection with a configurable safety margin",
      "Connected the isolated crop to OCR, ring detection, graph reconstruction, compound matching, and overlay export",
      "Added drawingCoverage, chemistryPixelDensity, and isolationConfidence metrics",
      "Added a Structure Isolation Debug Panel with original-frame boxes, selected region, and final downstream crop",
      "Added six isolation regressions for handwritten, printed, tablet, wide-margin, cluttered, and angled molecule images",
      "Preserved upload, camera, privacy, OCR, graph, overlay, and local-only behavior",
    ],
  },
  {
    version: "5.4.0",
    date: "Previous",
    status: "released",
    title: "Molecular Graph Reconstruction Engine",
    changes: [
      "Added a browser-local molecular graph layer with typed atoms, bonds, ring membership, aromatic flags, and confidence values",
      "Added deterministic single, double, and triple bond inference from merged line segments and parallel bond pairs",
      "Added closed-cycle reconstruction for 3-7 member rings while retaining fuzzy near-ring candidates",
      "Added benzene-like, cyclohexane-like, and cyclopentane-like ring classifications",
      "Added carbon skeleton, atom, bond, ring, bond-order, and molecular-formula estimates",
      "Added graph similarity as a major compound-matching signal for aromatic, alkene, alkyne, alcohol, and carbonyl structures",
      "Added an expandable Molecular Graph Debug Panel with node, bond, ring, formula, confidence, and candidate details",
      "Added deterministic graph regression coverage for benzene, cyclohexane, ethanol, methanal, ethanal, ethanoic acid, acetone, ethene, and ethyne",
      "Kept reconstruction, OCR, camera capture, overlays, and matching entirely browser-side with no AI or image uploads",
    ],
  },
  {
    version: "5.3.0",
    date: "Previous",
    status: "released",
    title: "Camera Capture Mode",
    changes: [
      "Added Upload Image and Camera Capture input modes to the Structure Scanner",
      "Added optional rear-camera permission, live preview, single-frame capture, retake, accept, and stop controls",
      "Connected accepted snapshots to the existing preprocessing, OCR, vision, fuzzy-ring, scoring, result, and overlay pipeline",
      "Added robust unsupported, denied, missing-device, and busy-camera handling",
      "Added clean media-track shutdown on stop, mode changes, snapshot acceptance, and component unmount",
      "Added upload, camera, OCR, visual-match, and correction metrics",
      "Added upload, camera, and manual-correction labels to local scan history",
      "Updated privacy wording for optional, snapshot-only, browser-local camera processing",
      "Kept live recognition, server uploads, AI, external APIs, and permanent image storage disabled",
    ],
  },
  {
    version: "5.2.3",
    date: "Previous",
    status: "released",
    title: "Visual Overlay Debugger",
    changes: [
      "Added an expandable Developer Vision Tools overlay panel to the Structure Scanner",
      "Added combinable layers for raw images, lines, endpoints, graph nodes, graph edges, cycles, near-rings, selected rings, parallel bonds, aromatic evidence, and functional-group cues",
      "Added node IDs, degrees, coordinates, edge lengths, connected-node labels, and ring confidence labels",
      "Added Why this ring was selected candidate comparisons",
      "Added a Benzene Classification Breakdown linked to visual and final database scoring",
      "Added local PNG export for the active image and overlay layers",
      "Added committed metric snapshots for seven deterministic structure-vision examples",
      "Kept overlay rendering and export entirely in-browser with no uploads or external APIs",
    ],
  },
  {
    version: "5.2.2",
    date: "Previous",
    status: "released",
    title: "Benzene Ring Calibration",
    changes: [
      "Calibrated imperfect 5-7 member near-rings using ring confidence, parallel bonds, aromatic cues, and local hints",
      "Added the Likely benzene / aromatic ring visual candidate label",
      "Added explicit 25/25/15/25 scoring for near-ring, aromatic, fuzzy-ring, and benzene-hint evidence",
      "Fixed misleading aromatic-support-missing feedback when parallel or double-bond strokes are present",
      "Added moderate visual-only and 85% visual-plus-hint confidence ceilings",
      "Preserved safeguards for open chains, carbonyl drawings, and saturated cyclohexane-like rings",
      "Added a regression fixture matching the observed 28-line, 7-pair, 66% ring, and 65% aromatic case",
      "Kept all recognition local with no AI, external APIs, camera, or permanent image storage",
    ],
  },
  {
    version: "5.2.1",
    date: "Previous",
    status: "released",
    title: "Fuzzy Ring Detection",
    changes: [
      "Added adaptive graph construction from detected bond-line endpoints",
      "Added endpoint merging based on image size and median line length",
      "Added deterministic 5-, 6-, and 7-member graph-cycle detection",
      "Added near-ring recovery when one short closing edge is missing",
      "Added ring scoring for closure, endpoint merging, polygon regularity, line coverage, and aromatic evidence",
      "Separated OCR, manual hint, filename, visual shape, ring/aromatic, and penalty contributions",
      "Expanded the Vision Debug Panel with graph metrics, ring confidence, aromatic scores, and candidate breakdowns",
      "Added six fuzzy-ring regression cases, including saturated rings and an open-chain false-positive guard",
      "Kept all image processing local with no AI, external APIs, camera, or permanent image storage",
    ],
  },
  {
    version: "5.2.0",
    date: "Previous",
    status: "released",
    title: "Structure Shape Detection",
    changes: [
      "Added browser-local dark-stroke extraction from the processed structure preview",
      "Added deterministic line-segment, closed-loop, six-membered-ring, parallel-bond, and simple-chain heuristics",
      "Added visual cues for aromatic rings, carbonyls, hydroxyl groups, carboxyl groups, and double bonds",
      "Combined visual evidence with OCR, manual hints, filename hints, and existing database scoring",
      "Added a Vision Debug Panel with line, loop, ring, functional-group, and candidate evidence",
      "Added conservative visual uncertainty guidance and top candidate behavior",
      "Added executable synthetic checks for benzene, methanal, ethanol, and blank-image fallback behavior",
      "Kept image processing local with no AI, external chemistry API, camera, or permanent image storage",
    ],
  },
  {
    version: "5.1.1",
    date: "Previous",
    status: "released",
    title: "OCR Scanner Accuracy Hardening",
    changes: [
      "Added chemistry-aware OCR cleanup for common O/0, I/l/1, S/5, Z/2, B/8, chlorine, bromine, and sodium recognition errors",
      "Expanded molecular, condensed, displayed, carbonyl, and aromatic formula parsing",
      "Added deterministic matching for formaldehyde, ethanoic acid, propanone, phenol, toluene, and ethyl ethanoate formulas",
      "Added browser-local OCR fallback recognition with an alternate page layout when the first pass is weak",
      "Rebalanced formula, name, functional-group, filename, aromatic, and OCR-quality confidence contributions",
      "Added low-confidence guidance and top-three possible matches instead of presenting a weak guess as detected",
      "Expanded the OCR Debug Panel with cleaned text, corrections, parsed formulas, parsed names, and top candidate scores",
      "Added executable local OCR parser and scanner checks for seven common chemistry cases",
      "Kept OpenRouter configuration, AI routes, auth, middleware, guardrails, camera behavior, and solver calculations unchanged",
    ],
  },
  {
    version: "5.1.0",
    date: "Previous",
    status: "released",
    title: "OCR Structure Recognition Foundation",
    changes: [
      "Added browser-side Tesseract.js OCR to the Molecular Structure Scanner",
      "Added deterministic chemistry parsing for molecular formulas, condensed formulas, and common compound names",
      "Connected processed crop, rotation, contrast, and grayscale previews directly to OCR input",
      "Added an OCR debug panel with raw text, parsed chemistry tokens, match reasoning, and confidence contributions",
      "Added OCR scanner metrics for scans performed, matches found, correction rate, and most recognized compounds",
      "Preserved manual correction fields and all scanner deep links into Molecular Visualizer, Reaction Explorer, Synthesis Explorer, Spectroscopy Explorer, Formula Sheet, Practice Generator, Exam Generator, and Curriculum",
      "Kept uploaded chemistry images local to the browser with no server-side image storage",
      "Kept OpenRouter configuration, AI routes, auth, middleware, guardrails, and solver calculations unchanged",
    ],
  },
  {
    version: "5.0.0",
    date: "Previous",
    status: "released",
    title: "Structure Recognition Upgrade",
    changes: [
      "Upgraded /structure-scanner into an upload-first local recognition workflow",
      "Added local image preprocessing previews with crop positioning, zoom, rotation, contrast, grayscale, and reset controls",
      "Added manual correction fields for compound name, molecular formula, condensed formula, and functional-group hints",
      "Added a text-extraction placeholder with clear no-readable-text guidance while keeping OCR disabled",
      "Added explainable confidence bands and correction-aware browser-local scan history",
      "Added total scans, corrected scans, most scanned compounds, and most scanned functional groups to Learning Dashboard",
      "Added direct result links to Molecular Visualizer, Reaction Explorer, Synthesis Explorer, Spectroscopy Explorer, Formula Sheet, Practice Generator, Exam Generator, and Curriculum",
      "Updated privacy wording to state that uploaded images are previewed locally, never permanently stored, and live camera access is not enabled",
      "Kept OpenRouter configuration, AI routes, auth, middleware, guardrails, and solver calculations unchanged",
    ],
  },
  {
    version: "4.9.0",
    date: "Previous",
    status: "released",
    title: "Lab Explorer",
    changes: [
      "Added /lab-explorer with a deterministic searchable lab technique database",
      "Added local lab records for titration, pipetting, burette reading, meniscus reading, filtration, recrystallization, distillation, extraction, TLC, IR sample prep, NMR sample prep, calorimetry, safety symbols, PPE, waste disposal, and common lab glassware",
      "Added technique detail panels with equipment, step-by-step procedure, common mistakes, safety notes, exam clues, and lab-report checklist items",
      "Added deterministic lab skills question templates for safety, meniscus/titration concepts, glassware identification, technique selection, and error analysis",
      "Added Lab Skills coverage to Practice Generator, Exam Generator, Study Mode, Curriculum, and subtopic mastery classification",
      "Added Lab Skills Mastery to the Learning Dashboard",
      "Added Lab Explorer links to the homepage, Chemistry Hub, Tools menu, Curriculum Roadmaps, Roadmap, and Patch Notes",
      "Kept OpenRouter configuration, AI routes, auth, middleware, guardrails, solver calculations, uploads, and camera features unchanged",
    ],
  },
  {
    version: "4.8.0",
    date: "Previous",
    status: "released",
    title: "Spectroscopy Explorer",
    changes: [
      "Added /spectroscopy-explorer with deterministic IR, 1H NMR, 13C NMR, and mass spectrometry tabs",
      "Added local spectroscopy records for O-H, N-H, C=O, C=C, C#C, C#N, aromatic, alkane C-H, alcohol, carboxylic acid, ester, ketone, aldehyde, amine, NMR, and mass spec clues",
      "Added expected spectra profiles for common ARSHLAB compounds including ethanol, propanone, ethanal, ethanoic acid, ethyl ethanoate, benzene, and phenol",
      "Added reaction spectral-change summaries such as alcohol to aldehyde/carboxylic acid and alkene to alcohol transformations",
      "Added deterministic IR, NMR, mass spectrometry, and compound-spectra question templates to Practice Generator and Exam Generator database mode",
      "Added Spectroscopy Mastery to the Learning Dashboard",
      "Added Spectroscopy Explorer links to the homepage, Chemistry Hub, Tools menu, Curriculum Roadmaps, Structure Scanner, Molecular Visualizer, Roadmap, and Patch Notes",
      "Kept OpenRouter configuration, AI routes, auth, middleware, guardrails, and solver calculations unchanged",
    ],
  },
  {
    version: "4.7.0",
    date: "Previous",
    status: "released",
    title: "Reaction Conditions Engine",
    changes: [
      "Added deterministic reaction condition records with reagents, catalysts, solvents, temperature, pressure, yield notes, safety notes, common mistakes, mechanism family, and difficulty",
      "Added Conditions sections to Reaction Database records",
      "Added reagent and condition summaries to Synthesis Explorer pathway steps",
      "Added reaction context cards to Mechanism Trainer",
      "Added deterministic reagent-selection questions to Practice Generator and Exam Generator database mode",
      "Added Reaction Conditions Mastery to Learning Dashboard",
      "Added Reaction Conditions links to the homepage, Chemistry Hub, Tools menu, Curriculum Roadmaps, Roadmap, and Patch Notes",
      "Kept OpenRouter configuration, AI routes, auth, middleware, guardrails, solver calculations, and Formula Sheet behavior unchanged",
    ],
  },
  {
    version: "4.6.0",
    date: "Previous",
    status: "released",
    title: "Synthesis Pathway Explorer",
    changes: [
      "Added /synthesis-explorer for deterministic pathway searches between compounds",
      "Added breadth-first search over the existing Reaction Explorer chemistry graph",
      "Added shortest pathway output with intermediate compounds, reaction names, total steps, and estimated difficulty",
      "Added pathway node actions for compound views, reactions, mechanisms, practice, and exam sets",
      "Added deep links such as /synthesis-explorer?start=ethene&target=ethanoic-acid",
      "Added local Synthesis Explorer metrics to the Learning Dashboard",
      "Added Synthesis Explorer links to the homepage, Chemistry Hub, Tools menu, Curriculum Roadmaps, Reaction Explorer, Molecular Visualizer, Roadmap, and Patch Notes",
      "Kept OpenRouter configuration, AI routes, middleware, authentication, guardrails, solver calculations, graph behavior, scanner behavior, and external API usage unchanged",
    ],
  },
  {
    version: "4.5.0",
    date: "Previous",
    status: "released",
    title: "Molecular Structure Scanner",
    changes: [
      "Added /structure-scanner with a deterministic local chemistry database scanner",
      "Added image upload preview for PNG, JPG, JPEG, and WEBP files with a local processing privacy notice",
      "Added optional molecule name, formula, and structure hint inputs for database-first matching",
      "Seeded scanner records with common compounds, formulas, functional groups, aliases, visualizer links, reaction graph links, and curriculum hooks",
      "Added confidence estimates, match explanations, result cards, and deep links to Molecular Visualizer, Reaction Explorer, Practice Generator, Exam Generator, Formula Sheet, and Curriculum",
      "Added browser-local scan history for the last 10 scans and Structure Scanner metrics on the Learning Dashboard",
      "Added Structure Scanner links to the homepage, Chemistry Hub, Tools menu, Roadmap, and Patch Notes",
      "Kept OpenRouter configuration, AI routes, auth, middleware, guardrails, solver calculations, and curriculum logic unchanged",
    ],
  },
  {
    version: "4.4.0",
    date: "Previous",
    status: "released",
    title: "Adaptive Study Mode",
    changes: [
      "Added deterministic study-engine modules for study types, local progress events, mastery scoring, and recommendations",
      "Tracked formula views, solver usage, practice self-marking, mechanism practice, exam generation, and curriculum completion locally",
      "Added 0-100 topic mastery scores with formula, solver, practice, exam, and curriculum signals",
      "Added recommended next topic/action logic based on prerequisites, mastery, and curriculum ordering",
      "Added Adaptive Study Mode cards to the Learning Dashboard with streak, mastered topics, weakest topics, and next action",
      "Added formula mastery badges to Formula Sheet and confidence estimates to Chemistry Solver",
      "Added mastery before/after indicators to Practice Generator questions",
      "Added curriculum roadmap status badges for Completed, In Progress, Recommended, and Locked",
      "Kept OpenRouter configuration, AI routes, auth, middleware, and guardrails unchanged",
    ],
  },
  {
    version: "4.3.1",
    date: "Previous",
    status: "released",
    title: "Graph and Periodic Table Layout Polish",
    changes: [
      "Improved Reaction Explorer graph spacing so edge arrows and labels avoid node text",
      "Changed graph edges from center-to-center lines to curved paths clipped outside node cards",
      "Added small neutral edge-label pills with safer midpoints and clearer selected-node outlines",
      "Updated the Periodic Table renderer to use explicit standard 18-column display placement",
      "Placed H at group 1, He at group 18, B-Ne and Al-Ar at groups 13-18, and f-block placeholders at group 3",
      "Added group numbers and kept lanthanides and actinides separated below the main table",
      "Preserved heatmaps, comparison mode, element profiles, OpenRouter configuration, AI routes, auth, middleware, guardrails, and solver calculations",
    ],
  },
  {
    version: "4.3.0",
    date: "Previous",
    status: "released",
    title: "Reaction Explorer / Knowledge Graph",
    changes: [
      "Added /reaction-explorer with a deterministic visual chemistry knowledge graph",
      "Added graph nodes for compounds, functional groups, reactions, mechanisms, formulas, solvers, and practice topics",
      "Added graph edges for contains, reactsTo, oxidizesTo, usesMechanism, usesFormula, solvedBy, and practiceWith relationships",
      "Added alcohol oxidation and esterification, alkene addition, acid-base, and stoichiometry pathway examples",
      "Added graph search, General Chemistry / Organic Chemistry filters, mobile pathway cards, and node detail deep links",
      "Added Reaction Explorer links to the homepage, Chemistry Hub, Tools menu, Curriculum Engine, Learning Dashboard, Roadmap, and chemistry metadata",
      "Kept OpenRouter configuration, AI routes, auth, middleware, guardrails, and solver calculations unchanged",
    ],
  },
  {
    version: "4.2.1",
    date: "Previous",
    status: "released",
    title: "Context-Aware Deep Linking",
    changes: [
      "Added formula deep links such as /formula-sheet?formula=molarity with alias fallback",
      "Added solver module deep links such as /chemistry-solver?module=molarity",
      "Added mechanism, reaction, molecular visualizer, practice, exam, and curriculum topic deep-link support",
      "Updated curriculum topic tool links to open directly to relevant formulas, solver modules, practice topics, exam topics, mechanisms, reactions, and compounds",
      "Updated Formula Sheet Try Solver buttons to open matching solver modules",
      "Updated Learning Dashboard formula, calculation, mechanism, and curriculum links to land in context",
      "Added graceful fallback behavior for invalid deep-link parameters",
      "Kept AI routes, OpenRouter configuration, auth, middleware, guardrails, API routes, and solver calculations unchanged",
    ],
  },
  {
    version: "4.2.0",
    date: "Previous",
    status: "released",
    title: "Curriculum Engine",
    changes: [
      "Added deterministic General Chemistry and Organic Chemistry roadmap views at /curriculum",
      "Added 25 roadmap topics with descriptions, difficulty labels, prerequisites, and recommended next topics",
      "Added direct links from each roadmap topic to Formula Sheet, Chemistry Solver, Practice Generator, Exam Generator, Molecular Visualizer, Mechanism Trainer, and Reaction Database",
      "Added local topic viewed and topic completed tracking with roadmap completion percentages",
      "Added current recommended roadmap topic logic",
      "Added Curriculum Progress card to the Learning Dashboard",
      "Updated homepage, Chemistry Hub, Tools menu, Roadmap, Patch Notes, and version metadata for v4.2.0",
      "Kept AI routes, OpenRouter configuration, auth, middleware, guardrails, API routes, and solver calculations unchanged",
    ],
  },
  {
    version: "4.1.0",
    date: "Previous",
    status: "released",
    title: "Formula Sheet Engine",
    changes: [
      "Added deterministic Formula Sheet route with searchable chemistry formula records",
      "Added formula categories for stoichiometry, solutions, gases, thermochemistry, acids and bases, equilibrium, electrochemistry, and organic chemistry",
      "Added variables, required units, when-to-use notes, common mistakes, and worked examples for each formula",
      "Added View Formula links from Chemistry Solver modules",
      "Added Relevant Formula links for database-generated solver practice questions",
      "Added local Formula Sheet progress tracking on the Learning Dashboard",
      "Added Formula Sheet links to the homepage, Chemistry Hub, Tools menu, Roadmap, and Patch Notes",
      "Kept AI routes, OpenRouter configuration, auth, middleware, and solver calculations unchanged",
    ],
  },
  {
    version: "4.0.0",
    date: "Previous",
    status: "released",
    title: "Chemistry Solver Engine",
    changes: [
      "Added deterministic Chemistry Solver route with step-by-step calculation walkthroughs",
      "Added molarity, dilution, percent yield, empirical formula, ideal gas law, calorimetry, pH, and stoichiometry solver modules",
      "Added Given, Formula, Substitution, Calculation, Answer, and Unit Check panels for each solver",
      "Added Solver Practice mode through database-generated calculation questions and worked examples",
      "Added solver mastery, calculation achievements, and Chemistry Calculations tracking hooks",
      "Added Chemistry Solver links to the homepage, Chemistry Hub, Tools menu, Roadmap, and Patch Notes",
      "Kept AI routes, OpenRouter configuration, and free-model guardrails unchanged",
    ],
  },
  {
    version: "3.8.1",
    date: "Previous",
    status: "released",
    title: "Mechanism Trainer Polish",
    changes: [
      "Improved Organic Mechanism Trainer step readability with clearer structure, electron-flow, and explanation panels",
      "Made highlighted atoms and bonds more visually obvious in mechanism views",
      "Expanded Predict Next Step feedback with selected-choice reasoning, correct-answer explanation, and distractor explanations",
      "Added compact mechanism summary cards for mechanism type, reagents and conditions, key intermediate, and product pattern",
      "Improved mobile layout and button alignment for the Mechanism Trainer",
      "Kept Organic Mechanisms practice and exam generation in Database Only mode with no AI route changes",
    ],
  },
  {
    version: "3.8.0",
    date: "Previous",
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
