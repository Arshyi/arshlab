const { spawnSync } = require("child_process")
const path = require("path")

const root = path.resolve(__dirname, "..")
const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next")
const readlinkPatch = path.join(__dirname, "patch-readlink.cjs")
const wasmDir = path.join(root, "node_modules", "@next", "swc-wasm-nodejs")

const env = {
  ...process.env,
  NEXT_TEST_WASM: "1",
  NEXT_TEST_WASM_DIR: wasmDir,
}

const args = ["--require", readlinkPatch, nextBin, "dev", "--webpack", ...process.argv.slice(2)]
const result = spawnSync(process.execPath, args, {
  cwd: root,
  env,
  stdio: "inherit",
})

process.exit(result.status ?? 1)
