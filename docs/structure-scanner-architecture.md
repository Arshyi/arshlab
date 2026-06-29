# ARSHLAB Structure Scanner Architecture

## v6.1.0 Global Shape Reconstruction Engine

The Structure Scanner remains fully deterministic, browser-side, local-only, and database-first.
It does not call OpenRouter, LLMs, cloud OCR, Supabase functions, or external chemistry APIs.

## Pipeline

```text
Image
-> Perspective Normalizer
-> Structure Isolation
-> OCR / Chemistry OCR
-> Vision and line detection
-> Global Shape Reconstruction
-> Candidate Graph Generator
-> Global Molecular Graph Optimizer
-> Chemical Graph Validator
-> Ring Closure evidence
-> Evidence Fusion
-> Local compound database lookup
```

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

## Key Files

- `lib/structure-vision/candidate-graph-generator.ts`
- `lib/structure-vision/global-shape-reconstruction.ts`
- `lib/structure-vision/global-graph-optimizer.ts`
- `lib/structure-vision/bond-angle-engine.ts`
- `lib/structure-vision/canonical-molecular-graph.ts`
- `components/chemistry/GlobalShapeReconstructionDebugPanel.tsx`
- `components/chemistry/GlobalGraphOptimizerDebugPanel.tsx`

## Safety

All image processing, shape reconstruction, graph hypotheses, optimizer moves, canonical graph hashes, debug panels, and overlay exports stay in the browser. Images, reconstructed strokes, polygon hypotheses, and graph hypotheses are not uploaded to ARSHLAB servers or stored permanently.
