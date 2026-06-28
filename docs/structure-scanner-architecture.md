# ARSHLAB Structure Scanner Architecture

## v6.0.0 Global Molecular Graph Optimizer

The Structure Scanner remains fully deterministic, browser-side, local-only, and database-first.
It does not call OpenRouter, LLMs, cloud OCR, Supabase functions, or external chemistry APIs.

## Pipeline

```text
Image
-> Perspective Normalizer
-> Structure Isolation
-> OCR / Chemistry OCR
-> Vision and line detection
-> Candidate Graph Generator
-> Global Molecular Graph Optimizer
-> Chemical Graph Validator
-> Ring Closure evidence
-> Evidence Fusion
-> Local compound database lookup
```

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
- `lib/structure-vision/global-graph-optimizer.ts`
- `lib/structure-vision/bond-angle-engine.ts`
- `lib/structure-vision/canonical-molecular-graph.ts`
- `components/chemistry/GlobalGraphOptimizerDebugPanel.tsx`

## Safety

All image processing, graph hypotheses, optimizer moves, canonical graph hashes, debug panels, and overlay exports stay in the browser. Images and graph hypotheses are not uploaded to ARSHLAB servers or stored permanently.
