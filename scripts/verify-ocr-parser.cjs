const assert = require("node:assert/strict")
const { rmSync } = require("node:fs")
const { tmpdir } = require("node:os")
const path = require("node:path")
const { spawnSync } = require("node:child_process")

const root = path.resolve(__dirname, "..")
const outputDirectory = path.join(tmpdir(), "arshlab-ocr-parser-checks")
const tscPath = require.resolve("typescript/bin/tsc")

rmSync(outputDirectory, { recursive: true, force: true })

const compile = spawnSync(
  process.execPath,
  [
    tscPath,
    "lib/ocr/chemistry-parser.ts",
    "lib/structure-scanner/scanner-engine.ts",
    "lib/structure-scanner/scanner-database.ts",
    "lib/structure-scanner/scanner-types.ts",
    "--module",
    "commonjs",
    "--target",
    "es2020",
    "--outDir",
    outputDirectory,
    "--esModuleInterop",
    "--skipLibCheck",
  ],
  { cwd: root, encoding: "utf8" },
)

if (compile.status !== 0) {
  process.stderr.write(compile.stdout)
  process.stderr.write(compile.stderr)
  process.exit(compile.status ?? 1)
}

const { parseChemistryText } = require(path.join(outputDirectory, "ocr", "chemistry-parser.js"))
const { scanStructure } = require(path.join(outputDirectory, "structure-scanner", "scanner-engine.js"))

const cases = [
  { input: "CH3CH20H", cleaned: "CH3CH2OH", compoundId: "ethanol" },
  { input: "C6HG", cleaned: "C6H6", compoundId: "benzene" },
  { input: "H2C=O", cleaned: "H2CO", compoundId: "methanal" },
  { input: "CH3COOH", cleaned: "CH3COOH", compoundId: "ethanoic-acid" },
  { input: "CH3COCH3", cleaned: "CH3COCH3", compoundId: "acetone" },
  { input: "C6H5OH", cleaned: "C6H5OH", compoundId: "phenol" },
  { input: "C6H5CH3", cleaned: "C6H5CH3", compoundId: "toluene" },
]

for (const testCase of cases) {
  const parsed = parseChemistryText(testCase.input)
  assert.equal(parsed.cleanedText, testCase.cleaned, `${testCase.input} cleanup`)
  assert.ok(parsed.matchedCompoundIds.includes(testCase.compoundId), `${testCase.input} parser match`)

  const scan = scanStructure({
    formula: parsed.detectedFormula ?? undefined,
    condensedFormula: parsed.detectedCondensedFormula ?? undefined,
    moleculeName: parsed.detectedName ?? undefined,
    ocrCompoundIds: parsed.matchedCompoundIds,
    ocrText: parsed.cleanedText,
    ocrQuality: 82,
    ocrFormulaCorrected: parsed.detectedFormulaWasCorrected,
  })
  assert.equal(scan.bestMatch?.record.id, testCase.compoundId, `${testCase.input} scanner match`)
  console.log(`${testCase.input} -> ${parsed.cleanedText} -> ${scan.bestMatch.record.name} (${scan.bestMatch.confidence}%)`)
}

const cleanupCases = [
  { input: "H20H", cleaned: "H2OH" },
  { input: "CH20H", cleaned: "CH2OH" },
  { input: "C0OH", cleaned: "COOH" },
  { input: "HO0H", cleaned: "HOOH" },
  { input: "HCI", cleaned: "HCl" },
  { input: "B r", cleaned: "Br" },
  { input: "N a", cleaned: "Na" },
]

for (const testCase of cleanupCases) {
  const parsed = parseChemistryText(testCase.input)
  assert.equal(parsed.cleanedText, testCase.cleaned, `${testCase.input} cleanup`)
}

const filenameOnly = scanStructure({ fileName: "benzene-sketch.png" })
assert.equal(filenameOnly.bestMatch?.record.id, "benzene", "filename aromatic hint")
assert.equal(filenameOnly.isConfident, false, "filename-only match remains tentative")

const lowQuality = scanStructure({
  formula: "C6H6",
  ocrCompoundIds: ["benzene"],
  ocrText: "C6H6",
  ocrQuality: 20,
})
assert.equal(lowQuality.isConfident, false, "very-low-quality OCR is not overconfident")
assert.ok(
  lowQuality.bestMatch?.contributions.some((contribution) => contribution.points < 0),
  "OCR quality penalty is recorded",
)

rmSync(outputDirectory, { recursive: true, force: true })
console.log(`Verified ${cases.length} parser/scanner matches and ${cleanupCases.length} cleanup cases.`)
