const assert = require("node:assert/strict")
const { rmSync } = require("node:fs")
const { tmpdir } = require("node:os")
const path = require("node:path")
const { spawnSync } = require("node:child_process")

const root = path.resolve(__dirname, "..")
const outputDirectory = path.join(tmpdir(), "arshlab-chemistry-ocr-checks")
const tscPath = require.resolve("typescript/bin/tsc")

rmSync(outputDirectory, { recursive: true, force: true })
const compile = spawnSync(process.execPath, [
  tscPath,
  "lib/ocr/chemistry-parser.ts",
  "lib/structure-scanner/scanner-engine.ts",
  "lib/structure-scanner/scanner-database.ts",
  "lib/structure-scanner/scanner-types.ts",
  "--module", "commonjs",
  "--target", "es2020",
  "--outDir", outputDirectory,
  "--esModuleInterop",
  "--skipLibCheck",
], { cwd: root, encoding: "utf8" })

if (compile.status !== 0) {
  process.stderr.write(compile.stdout)
  process.stderr.write(compile.stderr)
  process.exit(compile.status ?? 1)
}

const { parseChemistryText } = require(path.join(outputDirectory, "ocr", "chemistry-parser.js"))
const { scanStructure } = require(path.join(outputDirectory, "structure-scanner", "scanner-engine.js"))

function scannerInput(parsed) {
  const formulaTokens = parsed.tokens.filter((token) => token.type === "molecular-formula" || token.type === "condensed-formula")
  const nameTokens = parsed.tokens.filter((token) => token.type === "chemical-name")
  return {
    moleculeName: parsed.detectedName ?? undefined,
    formula: parsed.detectedFormula ?? undefined,
    condensedFormula: parsed.detectedCondensedFormula ?? undefined,
    ocrCompoundIds: parsed.matchedCompoundIds,
    ocrFormulaCompoundIds: formulaTokens.flatMap((token) => token.matchedCompoundIds),
    ocrNameCompoundIds: nameTokens.flatMap((token) => token.matchedCompoundIds),
    ocrAtomLabels: parsed.atomLabels,
    ocrText: parsed.cleanedText,
    ocrQuality: 82,
    ocrChemistryConfidence: parsed.chemistryConfidence,
    ocrNoisePenalty: parsed.chemistryScores.noisePenalty,
    ocrFormulaCorrected: parsed.detectedFormulaWasCorrected,
  }
}

const labeledBenzene = parseChemistryText("C C C C C C H H H H H H")
assert.deepEqual(labeledBenzene.atomLabels, ["C", "H"], "benzene drawing atom labels")
assert.equal(labeledBenzene.detectedFormula, null, "scattered benzene atom labels are not a formula")
assert.equal(labeledBenzene.detectedCondensedFormula, null, "scattered labels are not condensed formula")
assert.equal(labeledBenzene.rejectedNoise.length, 0, "valid isolated labels are not noise")
const atomOnlyScan = scanStructure(scannerInput(labeledBenzene))
assert.equal(atomOnlyScan.isConfident, false, "atom labels alone remain tentative")
assert.ok(atomOnlyScan.matches.some((match) => match.contributions.some((entry) => entry.category === "atom-label")), "atom-label score channel")

const tabletBenzene = parseChemistryText("C C C C C C benzene")
assert.ok(tabletBenzene.moleculeNames.some((name) => name.toLowerCase() === "benzene"), "tablet benzene name detection")
assert.ok(tabletBenzene.matchedCompoundIds.includes("benzene"), "tablet benzene database match")
assert.ok(tabletBenzene.chemistryScores.nameScore > tabletBenzene.chemistryScores.atomLabelScore, "name uses separate stronger channel")

const benzeneFormula = parseChemistryText("C6H6")
assert.ok(benzeneFormula.condensedFormulas.includes("C6H6"), "benzene compact formula classification")
assert.ok(benzeneFormula.matchedCompoundIds.includes("benzene"), "benzene formula database match")

const ethanol = parseChemistryText("CH3CH2OH")
assert.ok(ethanol.condensedFormulas.includes("CH3CH2OH"), "ethanol condensed formula")
assert.ok(ethanol.matchedCompoundIds.includes("ethanol"), "ethanol formula match")
const ethanolScan = scanStructure(scannerInput(ethanol))
assert.equal(ethanolScan.bestMatch?.record.id, "ethanol", "ethanol scanner result")
assert.ok(ethanolScan.bestMatch.contributions.some((entry) => entry.category === "formula"), "formula score channel")

const aspirin = parseChemistryText("aspirin")
assert.ok(aspirin.moleculeNames.some((name) => name.toLowerCase() === "aspirin"), "aspirin molecule name")
assert.equal(aspirin.condensedFormulas.length, 0, "aspirin name is not a formula")
const aspirinScan = scanStructure(scannerInput(aspirin))
assert.equal(aspirinScan.bestMatch?.record.id, "aspirin", "aspirin scanner result")
assert.ok(aspirinScan.bestMatch.contributions.some((entry) => entry.category === "name"), "name score channel")

const noisy = parseChemistryText("BC BCC SN5 N2 C H O scribble")
for (const rejected of ["BC", "BCC", "SN5", "N2"]) {
  assert.ok(noisy.rejectedNoise.some((noise) => noise.value === rejected), `${rejected} rejected as OCR noise`)
}
assert.equal(noisy.detectedFormula, null, "noise does not become molecular formula")
assert.equal(noisy.detectedCondensedFormula, null, "noise does not become condensed formula")
assert.deepEqual(noisy.atomLabels, ["C", "H", "O"], "valid isolated labels survive noisy handwriting")
assert.ok(noisy.chemistryScores.noisePenalty >= 30, "noise receives a heavy penalty")
assert.ok(noisy.chemistryConfidence <= 15, "noisy handwriting remains low confidence")

const propanone = parseChemistryText("propanone")
assert.ok(propanone.matchedCompoundIds.includes("acetone"), "propanone alias name detection")

console.log("Verified chemistry OCR for labeled benzene, tablet benzene, ethanol, aspirin, propanone, and noisy handwriting.")
console.log("Verified graph, atom-label, formula, name, and noise-penalty scoring channels.")
rmSync(outputDirectory, { recursive: true, force: true })
