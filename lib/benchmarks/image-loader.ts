import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"
import { parseRealWorldBenchmarkManifest } from "./real-world-manifest"
import type { LoadedRealWorldBenchmarkSample } from "./real-world-benchmark-types"

export const DEFAULT_REAL_WORLD_BENCHMARK_DIR = path.join(process.cwd(), "benchmarks", "real-world")

const mimeTypes: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".bmp": "image/bmp",
}

function findManifestFiles(directory: string): string[] {
  if (!existsSync(directory)) return []
  const manifestFiles: string[] = []
  const visit = (current: string) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name)
      if (entry.isDirectory()) {
        visit(fullPath)
      } else if (entry.isFile() && entry.name === "manifest.json") {
        manifestFiles.push(fullPath)
      }
    }
  }
  visit(directory)
  return manifestFiles.sort((left, right) => left.localeCompare(right))
}

function imageDataUrl(imagePath: string, maxBytes: number): string | undefined {
  if (!existsSync(imagePath)) return undefined
  const stats = statSync(imagePath)
  if (stats.size > maxBytes) return undefined
  const extension = path.extname(imagePath).toLowerCase()
  const mimeType = mimeTypes[extension] ?? "application/octet-stream"
  return `data:${mimeType};base64,${readFileSync(imagePath).toString("base64")}`
}

export function loadRealWorldBenchmarkSamples(options: {
  datasetDirectory?: string
  includeImageData?: boolean
  maxImageDataBytes?: number
} = {}): LoadedRealWorldBenchmarkSample[] {
  const datasetDirectory = options.datasetDirectory ?? DEFAULT_REAL_WORLD_BENCHMARK_DIR
  const includeImageData = options.includeImageData ?? false
  const maxImageDataBytes = options.maxImageDataBytes ?? 450_000
  const manifestFiles = findManifestFiles(datasetDirectory)
  const loaded: LoadedRealWorldBenchmarkSample[] = []

  for (const manifestPath of manifestFiles) {
    const manifestDirectory = path.dirname(manifestPath)
    const parsed = parseRealWorldBenchmarkManifest(readFileSync(manifestPath, "utf8"))
    for (const sample of parsed.manifest.samples) {
      const imagePath = path.resolve(manifestDirectory, sample.image)
      const imageExists = existsSync(imagePath)
      const imageSizeBytes = imageExists ? statSync(imagePath).size : 0
      loaded.push({
        ...sample,
        manifestPath,
        sampleDirectory: manifestDirectory,
        imagePath,
        imageExists,
        imageSizeBytes,
        imageDataUrl: includeImageData ? imageDataUrl(imagePath, maxImageDataBytes) : undefined,
        manifestIssues: parsed.issues,
      })
    }
  }

  return loaded.sort((left, right) => left.id.localeCompare(right.id))
}
