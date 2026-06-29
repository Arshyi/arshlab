# ARSHLAB Structure Scanner Architecture

## v7.2.0 Chemical Contradiction and Candidate Elimination Engine

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
-> Candidate Graph Generator
-> Global Molecular Graph Optimizer
-> Chemical Graph Validator
-> Consensus Graph Solver
-> Ring Closure evidence
-> Evidence Fusion
-> Canonical Molecular Graph
-> Candidate Generation
-> Chemical Contradiction Engine
-> Remaining Candidates
-> Chemistry Intelligence Engine
-> ARSHLAB Knowledge Graph
-> User Interface
```

## Chemistry Intelligence Design

The v7 layer starts after the scanner selects a consensus molecular graph. It treats that graph as the input to a chemistry knowledge engine rather than as the end of the recognition workflow. The engine canonicalizes graph topology, matches equivalent rotated, mirrored, or renumbered molecular graphs, then builds a compound intelligence object from local deterministic records.

The intelligence object includes identity, graph matches, hierarchical functional groups, scaffold recognition, compound-family classification, chemical property summaries, spectroscopy links, known reactions, mechanism families, curriculum links, learning resources, safety notes, confidence channels, and an explainable "why ARSHLAB recognized this" trace.

Confidence is split into vision confidence, graph confidence, chemistry confidence, knowledge confidence, and overall confidence. OCR and image evidence can support a result, but the v7 interpretation is driven by the selected canonical graph plus local chemistry databases.

## Reference Graph Library

The v7.1 layer expands the known canonical graph library from a small proof-of-concept set to 100+ undergraduate structures. Coverage includes hydrocarbons, alkenes, alkynes, alcohols, aldehydes, ketones, carboxylic acids, esters, amides, amines, haloalkanes, benzene derivatives, heterocycles, amino acids, sugars, common solvents, and common lab reagents.

Each seeded compound provides a canonical heavy-atom molecular graph plus standardized local annotations: formula, family, functional groups, polarity estimate, physical-state estimate, curriculum topic, formula sheet mapping, practice/exam topic, mechanism links, reaction hooks, spectroscopy hook, and safety notes where useful. The graph matcher can therefore identify more structures before the UI asks the rest of ARSHLAB what is known about them.

## Chemical Contradiction Design

The v7.2 layer changes candidate ranking from positive-evidence-only scoring to chemistry-first elimination. Every reference candidate exposes deterministic identity requirements derived from its canonical graph and local metadata: carbon count, heteroatom counts, ring count, ring size, aromaticity, double-bond count, triple-bond count, branch count, terminal OH count, carbonyl count, amine/nitrogen count, halogen count, connected components, allowed functional groups, and forbidden functional groups.

Hard contradictions eliminate a candidate before database ranking. For example, benzene fails against an ethanol-like graph because oxygen is present, carbon count is wrong, no aromatic six-member ring exists, and the functional-group topology is incompatible. Soft contradictions are retained as score penalties and debug context when they are informative but not identity-breaking.

Chemistry Intelligence only receives candidates that survived the contradiction report. The scanner UI shows the Chemical Contradiction Report so students can see which alternatives were rejected and why.

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
- `lib/structure-vision/bond-angle-engine.ts`
- `lib/structure-vision/canonical-molecular-graph.ts`
- `components/chemistry/GlobalShapeReconstructionDebugPanel.tsx`
- `components/chemistry/SceneUnderstandingDebugPanel.tsx`
- `components/chemistry/GlobalGraphOptimizerDebugPanel.tsx`
- `components/chemistry/ConsensusGraphSolverDebugPanel.tsx`
- `components/chemistry/ChemicalContradictionReport.tsx`
- `components/chemistry/ChemistryIntelligencePanel.tsx`
- `scripts/verify-contradiction-engine.cjs`
- `scripts/verify-chemistry-intelligence.cjs`

## Safety

All image processing, scene graphs, semantic region labels, molecule crops, arrow detection, text-region separation, border/reflection/human suppression, shape reconstruction, graph hypotheses, optimizer moves, consensus repairs, canonical graph hashes, contradiction reports, chemistry intelligence reasoning, knowledge graph links, debug panels, and overlay exports stay in the browser. Images, reconstructed strokes, polygon hypotheses, graph hypotheses, consensus graph histories, scene graphs, semantic region boxes, repair histories, contradiction traces, and chemistry intelligence traces are not uploaded to ARSHLAB servers or stored permanently.
