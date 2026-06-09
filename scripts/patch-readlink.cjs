const fs = require("fs")

const EINVAL = -4071

function isExistingNonSymlink(target) {
  try {
    return !fs.lstatSync(target).isSymbolicLink()
  } catch {
    return false
  }
}

function mapReadlinkError(error, target) {
  if (!error || error.code !== "EISDIR" || !isExistingNonSymlink(target)) {
    return error
  }

  const mapped = new Error(`EINVAL: invalid argument, readlink '${target}'`)
  mapped.errno = EINVAL
  mapped.code = "EINVAL"
  mapped.syscall = "readlink"
  mapped.path = target
  return mapped
}

const originalReadlink = fs.readlink
fs.readlink = function patchedReadlink(target, options, callback) {
  const cb = typeof options === "function" ? options : callback
  const opts = typeof options === "function" ? undefined : options

  return originalReadlink.call(fs, target, opts, (error, linkString) => {
    cb(mapReadlinkError(error, target), linkString)
  })
}

const originalReadlinkSync = fs.readlinkSync
fs.readlinkSync = function patchedReadlinkSync(target, options) {
  try {
    return originalReadlinkSync.call(fs, target, options)
  } catch (error) {
    throw mapReadlinkError(error, target)
  }
}

if (fs.promises?.readlink) {
  const originalPromiseReadlink = fs.promises.readlink
  fs.promises.readlink = async function patchedPromiseReadlink(target, options) {
    try {
      return await originalPromiseReadlink.call(fs.promises, target, options)
    } catch (error) {
      throw mapReadlinkError(error, target)
    }
  }
}
