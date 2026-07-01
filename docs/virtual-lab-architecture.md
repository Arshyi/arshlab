# ARSHLAB Virtual Chemistry Laboratory Architecture

## v12.0.0 Virtual Chemistry Laboratory

The Virtual Lab is an educational simulation layer. It is deterministic, local, SVG-first, and built for first- and second-year undergraduate chemistry practice.

It does not modify OCR, vision reconstruction, the Structure Scanner, the molecular compiler, graph validation, the consensus solver, chemistry intelligence, Knowledge Graph internals, AI/OpenRouter, Supabase/auth, middleware, existing chemistry database internals, or solver calculations.

## Pipeline

```text
Experiment Library
-> Experiment Engine
-> Guided Lab Mode / Free Lab Mode
-> Reaction Progress
-> Observations
-> Measurements
-> Spectroscopy
-> Safety
-> Lab Notebook
-> Assessment
-> Printable Report
```

## Design

Experiments are local TypeScript records containing chemicals, equipment, techniques, steps, observations, measurements, spectra, safety, and assessment questions.

Guided Lab Mode exposes only the next valid action and blocks impossible actions. Free Lab Mode exposes the same action set but lets out-of-order choices reduce simulated yield, purity, and technique score.

Glassware and equipment are rendered as programmatic SVG paths from `lab-equipment.ts`. No images, videos, GIFs, physics engines, external APIs, or AI are used.

Spectroscopy records map peaks to deterministic atom/bond labels so hovering a peak can explain the associated functional group or structural feature.

The lab notebook is generated from the procedure, measurements, observations, yield, purity, and conclusion state. Reports are printable Markdown-style text generated entirely client-side.

## Initial Coverage

The starter library includes experiment coverage for esterification, alkene qualitative testing, aspirin recrystallization, caffeine spectroscopy, and ammonia pH observation. The initial compound coverage list includes acetone, ethanol, acetic acid, benzene, phenol, aniline, cyclohexane, cyclohexene, ethene, ethyne, acetylsalicylic acid, caffeine, glucose, water, and ammonia.

## Key Files

- `app/virtual-lab/page.tsx`
- `app/virtual-lab/virtual-lab-client.tsx`
- `lib/virtual-lab/experiment-types.ts`
- `lib/virtual-lab/experiment-engine.ts`
- `lib/virtual-lab/experiment-library.ts`
- `lib/virtual-lab/lab-equipment.ts`
- `lib/virtual-lab/measurement-engine.ts`
- `lib/virtual-lab/observation-engine.ts`
- `lib/virtual-lab/reaction-engine.ts`
- `lib/virtual-lab/safety-engine.ts`
- `lib/virtual-lab/spectroscopy-engine.ts`
- `scripts/verify-virtual-lab.cjs`
