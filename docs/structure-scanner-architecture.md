# ARSHLAB Structure Scanner Architecture

## v8.2.0 Vision Reconstruction Pipeline

The Structure Scanner remains fully deterministic, browser-side, local-only, and database-first.
It does not call OpenRouter, LLMs, cloud OCR, Supabase functions, or external chemistry APIs.

## Pipeline

```text
Image
-> Scene Understanding and Molecule Segmentation
-> Perspective Normalizer
-> Structure Isolation
-> OCR / Chemistry OCR
-> Vision and line detection
-> Global Shape Reconstruction
-> Vision Reconstruction Pipeline
   -> Stroke Segmentation
   -> Line Merging
   -> Endpoint Clustering
   -> Junction Detection
   -> Atom-Center Estimation
   -> Bond Association
   -> Broken-Stroke Repair
   -> Crossing-Bond Filtering
   -> Primitive Confidence Scoring
-> Candidate Graph Generator
-> Global Molecular Graph Optimizer
-> Chemical Graph Validator
-> Consensus Graph Solver
-> Graph Validation Engine
-> Topology Reconstruction
-> Molecular Compiler
   -> Visual Tokens
   -> Chemical Primitives
   -> Chemical AST
   -> Semantic Validation
   -> Canonical Compiler IR
   -> Optimization Pass Manager
   -> Optimized Compiler IR
-> Ring Closure evidence
-> Evidence Fusion
-> Canonical Molecular Graph
-> Candidate Generation
-> Chemical Contradiction Engine
-> Remaining Candidates
-> Chemistry Intelligence Engine
-> ARSHLAB Knowledge Graph
-> User Interface
-> Scanner-to-Learning Bridge
-> Interactive Learning Lessons
-> Interactive Molecular Explorer
```

## Molecular Compiler Design

The v8 layer treats molecule recognition like a deterministic compiler pipeline. Pixels and graph geometry first become visual tokens: lines, double-lines, triple-lines, circles, atom labels, text-like marks, and other drawing tokens. Tokens then become chemical primitives such as atoms, single/double/triple bonds, aromatic hints, charges, lone pairs, fragments, and reaction arrows.

The primitive builder produces a chemical AST that stores only connectivity: atom nodes, bond edges, connected components, cycles, branches, fragments, reaction participants, charge map, valence map, and confidence values. Semantic validation runs compiler-like checks for valence errors, duplicate atoms, duplicate bonds, self-edges, crossing bonds, impossible cycles, floating fragments, disconnected components, and unsupported charges.

Only a semantic pass or pass-with-warnings can produce compiler IR. The IR contains a canonical graph, canonical adjacency list, stable node ordering, stable edge ordering, fingerprint, deterministic graph hash, canonical graph ID, valence map, charge map, cycles, components, and confidence ceiling. Downstream scanner chemistry now consumes optimized compiler IR instead of raw pixels or pre-validation topology.

Confidence propagates downward through the compiler. Weak tokens can create weak primitives, which can create a weak AST and weak canonical graph, but no downstream stage may raise confidence above the ceiling established by its inputs.

## Vision Reconstruction Pipeline Design

The v8.2 layer improves the primitive molecular graph before graph validation. Instead of sending raw line detections directly into graph construction, ARSHLAB now creates a deterministic reconstruction report: raw strokes, merged strokes, repaired strokes, endpoint clusters, junctions, estimated atom centers, associated primitive bonds, rejected crossing bonds, repaired bonds, and confidence histograms.

The reconstruction pipeline is intentionally conservative. It can snap nearby endpoints, merge collinear fragmented strokes, bridge short gaps, associate strokes to nearest atom centers, estimate simple condensed-chain atom centers such as C-C-O from ethanol-like text, remove clear X-crossing bonds, and carry primitive confidence into the graph validator. It does not create new chemistry identities or change downstream chemistry engines.

The Structure Scanner UI exposes this as the Vision Reconstruction Pipeline panel so students and developers can inspect raw strokes, merged strokes, detected junctions, atom centers, accepted bonds, rejected bonds, repaired bonds, primitive confidence scores, and the final primitive graph before validation.

## Optimization Pass Pipeline Design

The v8.1 layer adds a compiler-style optimization pass manager after canonical compiler IR and before chemistry intelligence. Every optimization is an isolated `OptimizationPass` with an id, description, and deterministic `run(ir)` method. Passes return a proposed IR, metrics, warnings, errors, and semantic validation state.

The pass manager executes registered passes in stable order, validates after each pass, records before/after graph hashes, measures timing, and rolls back any pass that lowers graph validity or fails semantic validation. This means new cleanup ideas can be added as small, testable passes without spreading scanner logic across OCR, graph reconstruction, evidence fusion, or chemistry intelligence.

Initial passes include Dead Node Elimination, Dead Edge Elimination, Component Simplification, Ring Optimization, Bond Order Cleanup, Valence Cleanup, Confidence Propagation, and Canonical Ordering. These passes may remove unsupported noise, normalize deterministic ordering, and propagate uncertainty, but they are not allowed to hallucinate new rings or raise confidence above upstream compiler evidence.

The optimizer produces an `OptimizationReport` with passes executed, successful passes, rolled-back passes, nodes removed, edges removed, valence fixes, confidence changes, graph hash before/after, optimization time, warnings, and errors. The scanner UI exposes this in the Compiler Optimizer debug panel.

## Chemistry Intelligence Design

The v7/v8 intelligence layer starts after the scanner compiles and optimizes a validated molecular graph into compiler IR. It treats that optimized canonical graph as the input to a chemistry knowledge engine rather than as the end of the recognition workflow. The engine canonicalizes graph topology, matches equivalent rotated, mirrored, or renumbered molecular graphs, then builds a compound intelligence object from local deterministic records.

The intelligence object includes identity, graph matches, hierarchical functional groups, scaffold recognition, compound-family classification, chemical property summaries, spectroscopy links, known reactions, mechanism families, curriculum links, learning resources, safety notes, confidence channels, and an explainable "why ARSHLAB recognized this" trace.

Confidence is split into vision confidence, graph confidence, chemistry confidence, knowledge confidence, and overall confidence. OCR and image evidence can support a result, but the v7 interpretation is driven by the selected canonical graph plus local chemistry databases.

## Scanner-to-Learning Bridge

The v8.5 layer starts after scanner recognition and chemistry intelligence have already produced a selected compound. It is a UI and routing bridge, not a recognition engine. It reads the detected compound id, formula, functional groups, aromaticity flag, ring count, and deterministic intelligence summaries, then recommends a local lesson in `/interactive-learning`.

The bridge maps aromatic compounds such as benzene to conjugation and Huckel aromaticity, alcohols such as ethanol to hybridization and lone-pair lessons, alkenes/alkynes/carbonyls to sigma/pi bonding lessons, and supported diatomic molecules such as O2 and N2 to the molecular-orbital builder. These decisions are deterministic link-generation rules. They do not modify OCR, graph validation, the molecular compiler, evidence fusion, chemistry intelligence, database records, authentication, Supabase, middleware, or AI routes.

The bridge also provides reusable explanation cards for sigma bonds, pi electrons, aromaticity, HOMO/LUMO reactivity, and sp/sp2/sp3 hybridization. The cards are short educational summaries that link into existing interactive SVG lessons rather than generated AI text.

## Interactive Molecular Explorer

The v9.0 layer adds `/interactive-learning/explorer` as an educational visualization consumer of deterministic molecular graph data. It does not modify OCR, vision reconstruction, scanner graph reconstruction, graph validation, the molecular compiler, candidate optimization, chemistry intelligence, AI routes, authentication, Supabase, middleware, or solver calculations.

The explorer accepts a known compound id or a serialized graph query parameter, then renders an SVG-only learning surface with clickable atoms and bonds. Atom inspectors show element data, formal charge, hybridization, electron domains, geometry, sigma/pi/lone-pair counts, aromatic and conjugation flags, HOMO/LUMO contribution, electronegativity, confidence, and deterministic reasoning. Bond inspectors show bond order, sigma/pi components, rotatability, ring membership, delocalization, orbital overlap, and confidence.

The visualization layer includes toggles for atom labels, bond order, sigma framework, pi framework, lone pairs, formal charges, hybridization, aromatic atoms, conjugated atoms, delocalized electrons, HOMO, LUMO, ring systems, functional groups, electron domains, and orbital orientation. These overlays are programmatic SVG primitives and use no images, canvas dependency, AI, or external APIs.

## Reference Graph Library

The v7.1 layer expands the known canonical graph library from a small proof-of-concept set to 100+ undergraduate structures. Coverage includes hydrocarbons, alkenes, alkynes, alcohols, aldehydes, ketones, carboxylic acids, esters, amides, amines, haloalkanes, benzene derivatives, heterocycles, amino acids, sugars, common solvents, and common lab reagents.

Each seeded compound provides a canonical heavy-atom molecular graph plus standardized local annotations: formula, family, functional groups, polarity estimate, physical-state estimate, curriculum topic, formula sheet mapping, practice/exam topic, mechanism links, reaction hooks, spectroscopy hook, and safety notes where useful. The graph matcher can therefore identify more structures before the UI asks the rest of ARSHLAB what is known about them.

## Chemical Contradiction Design

The v7.2 layer changes candidate ranking from positive-evidence-only scoring to chemistry-first elimination. Every reference candidate exposes deterministic identity requirements derived from its canonical graph and local metadata: carbon count, heteroatom counts, ring count, ring size, aromaticity, double-bond count, triple-bond count, branch count, terminal OH count, carbonyl count, amine/nitrogen count, halogen count, connected components, allowed functional groups, and forbidden functional groups.

Hard contradictions eliminate a candidate before database ranking. For example, benzene fails against an ethanol-like graph because oxygen is present, carbon count is wrong, no aromatic six-member ring exists, and the functional-group topology is incompatible. Soft contradictions are retained as score penalties and debug context when they are informative but not identity-breaking.

Chemistry Intelligence only receives candidates that survived the contradiction report. The scanner UI shows the Chemical Contradiction Report so students can see which alternatives were rejected and why.

## Graph Validation Design

The v7.3 layer moves chemistry reasoning behind a deterministic graph-validation gate. ARSHLAB first treats the scanner output as a primitive graph, then validates the graph like a small CAD kernel before any visual chemistry evidence is allowed to influence a result.

Every reconstructed edge is scored as accepted, weak, recovered, or rejected. The validator rejects duplicate bonds, crossing bonds, edge loops, extreme endpoint distances, compressed branch geometry, and over-valent atoms. Recovered bridge edges are separately classified as guaranteed, likely, possible, or unsafe, and unsafe bridges are withheld from selected topology variants.

Rings now pass through a cycle gate before aromatic reasoning. A candidate ring must be backed by a true graph cycle, unique nodes, plausible internal angles, consistent bond lengths, non-crossing edges, and connected-component consistency. Rejected cycles do not continue toward aromatic, arene, or benzene candidates.

The graph sanity pass produces a deterministic structural fingerprint before chemistry begins: connected components, node count, edge count, cycle count, branch count, terminal atoms, average degree, maximum path length, average bond length, and a candidate topology label such as "open chain alcohol/ether-like topology" or "aromatic ring topology." This lets ARSHLAB reject impossible interpretations before touching the chemistry database.

The topology reconstructor compares named graph variants: no repairs, rejected-edge pruning, safe bridges only, conservative topology, and bridge-free topology. Each receives a topology score, chemical-legality score, and visual-agreement score. Chemistry interpretation from the visual graph is allowed only when Graph Validation passed or passed with warnings. If validation fails, the scanner says graph reconstruction is unreliable and intentionally skips chemistry interpretation from that graph.

## Scene Understanding Design

The scene layer runs before perspective normalization. It builds a deterministic `SceneGraph` from connected stroke regions, low-contrast page ruling suppression, reaction-arrow detection, semantic text/condition grouping, reflection masks, human-object masks, and border suppression. Later scanner stages operate on the selected molecule crop instead of assuming that every dark pixel in the original image belongs to one molecule.

Scene regions can represent molecule regions, multiple-molecule regions, reaction arrows, curved mechanism-arrow-like strokes, reaction conditions, chemical text, atom labels, charges, page/tablet/phone borders, reflections, hands/fingers, shadows, watermarks, noise, and background. The debug output reports separate confidence for scene understanding, segmentation, graph, chemistry, OCR, and overall scanner confidence.

## Shape Reconstruction Design

The global shape layer repairs the intended molecular skeleton while the image evidence is still rich. It clusters fragmented line segments into reconstructed strokes, bridges only short supported gaps, infers chemically plausible corners, fits 3- to 8-member polygon hypotheses, rejects tablet/paper border artifacts, and reports shape confidence, polygon confidence, bridge confidence, corner confidence, symmetry, and closure metrics.

Every inferred edge carries a reason and confidence. Distance-only edge invention is intentionally forbidden; a recovered edge must be supported by stroke continuity, polygon evidence, or geometry evidence before it can enter graph construction.

## Optimizer Design

The optimizer is intentionally generic. It operates on molecular graph hypotheses, legal graph moves, and score functions rather than hard-coded compound names. Chemistry appears through scoring constraints such as valence, bond length consistency, bond angle consistency, ring template fit, aromatic stability, functional-group consistency, and database similarity.

This separation lets future modules reuse the same search pattern for:

- SMILES generation
- InChI generation
- Reaction atom mapping
- Retrosynthesis
- Spectroscopy simulation
- Crystal or pathway graph reasoning

## Consensus Graph Solver Design

The consensus layer collects every graph hypothesis created by the scanner: the raw reconstructed graph, candidate graph generator outputs, global optimizer winner and runner-ups, the chemically validated graph, and legal repair variants. It canonicalizes and hashes each graph so duplicate hypotheses are merged instead of counted twice.

Each surviving graph is scored across independent evidence channels: perspective/isolation support, stroke continuity, atom-label support, ring and polygon evidence, bond-angle geometry, valence legality, database similarity, optimizer agreement, validator agreement, OCR support, and source consensus. OCR is supportive but intentionally low-weight, so a noisy token cannot destroy a strong molecular topology.

The repair pass is deterministic and legal-only. It can remove long inconsistent edges, downgrade unsupported multiple bonds, recover a short selected ring-closure gap, or test aromatic six-ring promotion when double-bond evidence exists. A repair is accepted only if it improves the total consensus score.

The selected graph exposes calibrated visual, graph, chemical, database, OCR, and overall confidence values, plus a graph history, repair history, runner-ups, and ring conflict explanations for debugging.

## Knowledge Graph Design

The chemistry intelligence graph connects a recognized compound to functional groups, scaffolds, reactions, mechanisms, spectroscopy, curriculum topics, lab skills, practice, exams, synthesis, and molecule visualization. These links are deterministic deep links into existing ARSHLAB modules, so a scanner result can become a study pathway without making an AI request.

## Key Files

- `lib/molecular-compiler/compiler.ts`
- `lib/molecular-compiler/visual-tokenizer.ts`
- `lib/molecular-compiler/primitive-builder.ts`
- `lib/molecular-compiler/chemical-ast.ts`
- `lib/molecular-compiler/semantic-validator.ts`
- `lib/molecular-compiler/canonicalizer.ts`
- `lib/molecular-compiler/compiler-report.ts`
- `lib/molecular-compiler/compiler-types.ts`
- `lib/structure-vision/stroke-segmentation.ts`
- `lib/structure-vision/line-merging.ts`
- `lib/structure-vision/endpoint-clustering.ts`
- `lib/structure-vision/junction-detector.ts`
- `lib/structure-vision/atom-center-estimator.ts`
- `lib/structure-vision/bond-association.ts`
- `lib/structure-vision/broken-stroke-repair.ts`
- `lib/structure-vision/crossing-bond-filter.ts`
- `lib/structure-vision/primitive-confidence.ts`
- `lib/structure-vision/vision-reconstruction-report.ts`
- `lib/molecular-compiler/optimization-pass.ts`
- `lib/molecular-compiler/pass-manager.ts`
- `lib/molecular-compiler/pass-registry.ts`
- `lib/molecular-compiler/optimization-report.ts`
- `lib/molecular-compiler/passes/`
- `lib/chemistry-intelligence/intelligence-engine.ts`
- `lib/chemistry-intelligence/graph-matcher.ts`
- `lib/chemistry-intelligence/reference-library.ts`
- `lib/chemistry-intelligence/contradiction-engine.ts`
- `lib/chemistry-intelligence/candidate-eliminator.ts`
- `lib/chemistry-intelligence/identity-validator.ts`
- `lib/chemistry-intelligence/chemical-requirements.ts`
- `lib/chemistry-intelligence/elimination-report.ts`
- `lib/chemistry-intelligence/functional-group-engine.ts`
- `lib/chemistry-intelligence/chemistry-intelligence-graph.ts`
- `lib/chemistry-intelligence/types.ts`
- `lib/structure-vision/candidate-graph-generator.ts`
- `lib/structure-vision/scene-understanding.ts`
- `lib/structure-vision/scene-graph.ts`
- `lib/structure-vision/reaction-arrow-detector.ts`
- `lib/structure-vision/global-shape-reconstruction.ts`
- `lib/structure-vision/global-graph-optimizer.ts`
- `lib/structure-vision/consensus-graph-solver.ts`
- `lib/structure-vision/graph-validator.ts`
- `lib/structure-vision/edge-validator.ts`
- `lib/structure-vision/bridge-validator.ts`
- `lib/structure-vision/cycle-validator.ts`
- `lib/structure-vision/graph-sanity.ts`
- `lib/structure-vision/topology-reconstructor.ts`
- `lib/structure-vision/bond-angle-engine.ts`
- `lib/structure-vision/canonical-molecular-graph.ts`
- `components/chemistry/GlobalShapeReconstructionDebugPanel.tsx`
- `components/chemistry/SceneUnderstandingDebugPanel.tsx`
- `components/chemistry/GlobalGraphOptimizerDebugPanel.tsx`
- `components/chemistry/ConsensusGraphSolverDebugPanel.tsx`
- `components/chemistry/GraphValidationPanel.tsx`
- `components/chemistry/MolecularCompilerPanel.tsx`
- `components/chemistry/CompilerOptimizerPanel.tsx`
- `components/chemistry/VisionReconstructionPanel.tsx`
- `components/chemistry/ChemicalContradictionReport.tsx`
- `components/chemistry/ChemistryIntelligencePanel.tsx`
- `scripts/verify-contradiction-engine.cjs`
- `scripts/verify-graph-validation.cjs`
- `scripts/verify-molecular-compiler.cjs`
- `scripts/verify-chemistry-intelligence.cjs`

## Safety

All image processing, scene graphs, semantic region labels, molecule crops, arrow detection, text-region separation, border/reflection/human suppression, shape reconstruction, vision reconstruction reports, endpoint clusters, junction estimates, atom-center estimates, primitive bond associations, primitive confidence histograms, graph hypotheses, optimizer moves, consensus repairs, graph validation decisions, topology variants, compiler tokens, chemical primitives, AST nodes, semantic validation traces, compiler IR, optimization pass reports, rollback traces, graph fingerprints, canonical graph hashes, contradiction reports, chemistry intelligence reasoning, knowledge graph links, debug panels, and overlay exports stay in the browser. Images, reconstructed strokes, polygon hypotheses, primitive graph traces, graph hypotheses, consensus graph histories, graph validation traces, compiler reports, optimization reports, scene graphs, semantic region boxes, repair histories, contradiction traces, and chemistry intelligence traces are not uploaded to ARSHLAB servers or stored permanently.
