import type {
  RealWorldBenchmarkDifficulty,
  RealWorldBenchmarkManifest,
  RealWorldBenchmarkManifestSample,
} from "./real-world-benchmark-types"

export const REAL_WORLD_DIFFICULTIES: RealWorldBenchmarkDifficulty[] = [
  "clean_scan",
  "camera_photo",
  "tablet_photo",
  "handwritten",
  "printed",
  "cropped",
  "rotated",
  "perspective",
  "low_light",
  "glare",
  "shadow",
  "blur",
  "low_resolution",
  "partial_structure",
  "multiple_structures",
  "clutter",
  "reaction_page",
  "lab_notebook",
  "whiteboard",
  "lecture_slide",
]

const difficultySet = new Set<string>(REAL_WORLD_DIFFICULTIES)

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value))
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
}

export function validateRealWorldBenchmarkSample(value: unknown): string[] {
  const issues: string[] = []
  if (!isRecord(value)) return ["Sample must be an object."]
  const requiredStrings = ["id", "image", "expectedName", "expectedFormula", "notes"]
  for (const key of requiredStrings) {
    if (typeof value[key] !== "string" || !String(value[key]).trim()) {
      issues.push(`${key} is required.`)
    }
  }
  if (!Array.isArray(value.expectedFunctionalGroups) || !value.expectedFunctionalGroups.every((item) => typeof item === "string")) {
    issues.push("expectedFunctionalGroups must be an array of strings.")
  }
  if (typeof value.expectedRingCount !== "number" || value.expectedRingCount < 0) {
    issues.push("expectedRingCount must be a non-negative number.")
  }
  if (typeof value.expectedAromaticity !== "boolean") {
    issues.push("expectedAromaticity must be a boolean.")
  }
  if (typeof value.difficulty !== "string" || !difficultySet.has(value.difficulty)) {
    issues.push(`difficulty must be one of: ${REAL_WORLD_DIFFICULTIES.join(", ")}.`)
  }
  if (!Array.isArray(value.tags) || !value.tags.every((item) => typeof item === "string")) {
    issues.push("tags must be an array of strings.")
  }
  return issues
}

export function normalizeRealWorldBenchmarkSample(value: unknown): {
  sample: RealWorldBenchmarkManifestSample | null
  issues: string[]
} {
  const issues = validateRealWorldBenchmarkSample(value)
  if (!isRecord(value) || issues.length) return { sample: null, issues }
  return {
    sample: {
      id: String(value.id),
      image: String(value.image),
      expectedName: String(value.expectedName),
      expectedFormula: String(value.expectedFormula),
      expectedFunctionalGroups: stringArray(value.expectedFunctionalGroups),
      expectedRingCount: Number(value.expectedRingCount),
      expectedAromaticity: Boolean(value.expectedAromaticity),
      expectedAtomCounts: isRecord(value.expectedAtomCounts) ? Object.fromEntries(
        Object.entries(value.expectedAtomCounts)
          .filter((entry): entry is [string, number] => typeof entry[1] === "number"),
      ) : undefined,
      expectedBondCounts: isRecord(value.expectedBondCounts) ? {
        single: typeof value.expectedBondCounts.single === "number" ? value.expectedBondCounts.single : undefined,
        double: typeof value.expectedBondCounts.double === "number" ? value.expectedBondCounts.double : undefined,
        triple: typeof value.expectedBondCounts.triple === "number" ? value.expectedBondCounts.triple : undefined,
        aromatic: typeof value.expectedBondCounts.aromatic === "number" ? value.expectedBondCounts.aromatic : undefined,
      } : undefined,
      difficulty: value.difficulty as RealWorldBenchmarkDifficulty,
      tags: stringArray(value.tags),
      notes: String(value.notes),
      scannerInput: isRecord(value.scannerInput) ? value.scannerInput as RealWorldBenchmarkManifestSample["scannerInput"] : undefined,
    },
    issues: [],
  }
}

export function parseRealWorldBenchmarkManifest(content: string): {
  manifest: RealWorldBenchmarkManifest
  issues: string[]
} {
  const issues: string[] = []
  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch (error) {
    return {
      manifest: { samples: [] },
      issues: [error instanceof Error ? error.message : "Manifest JSON could not be parsed."],
    }
  }

  const rawSamples = Array.isArray(parsed)
    ? parsed
    : isRecord(parsed) && Array.isArray(parsed.samples)
      ? parsed.samples
      : isRecord(parsed) && typeof parsed.id === "string"
        ? [parsed]
        : []

  if (!rawSamples.length && !(isRecord(parsed) && Array.isArray(parsed.samples) && parsed.samples.length === 0)) {
    issues.push("Manifest must contain a sample object, an array of samples, or a { samples: [] } object.")
  }

  const samples: RealWorldBenchmarkManifestSample[] = []
  rawSamples.forEach((sampleValue, index) => {
    const normalized = normalizeRealWorldBenchmarkSample(sampleValue)
    if (normalized.sample) {
      samples.push(normalized.sample)
    } else {
      issues.push(...normalized.issues.map((issue) => `Sample ${index + 1}: ${issue}`))
    }
  })

  return {
    manifest: {
      version: isRecord(parsed) && typeof parsed.version === "string" ? parsed.version : undefined,
      samples,
    },
    issues,
  }
}
