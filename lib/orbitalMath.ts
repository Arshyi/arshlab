import type { OrbitalData, OrbitalFamily } from "@/data/orbitals"

export const PHASE_POSITIVE = "#3b82f6"
export const PHASE_NEGATIVE = "#f97316"
export const RADIAL_NODE_COLOR = "#a855f7"
export const ANGULAR_NODE_COLOR = "#22c55e"

export function getAngularMomentum(family: OrbitalFamily): number {
  switch (family) {
    case "s":
      return 0
    case "p":
      return 1
    case "d":
      return 2
    case "f":
      return 3
  }
}

export function getRadialNodes(n: number, l: number): number {
  return Math.max(0, n - l - 1)
}

export function getAngularNodes(l: number): number {
  return l
}

export function getTotalNodes(n: number): number {
  return n - 1
}

export function isValidOrbitalCombination(family: OrbitalFamily, n: number): boolean {
  switch (family) {
    case "s":
      return n >= 1
    case "p":
      return n >= 2
    case "d":
      return n >= 3
    case "f":
      return n >= 4
  }
}

/** Display scale for orbital size based on principal quantum number */
export function getOrbitalScale(n: number): number {
  return 0.85 + n * 0.38
}

/** Approximate radial node shell radii for hydrogen-like orbitals (display units) */
export function getRadialNodeRadii(n: number, l: number): number[] {
  const count = getRadialNodes(n, l)
  if (count === 0) return []

  const outer = getOrbitalScale(n) * 1.35
  const radii: number[] = []

  for (let i = 1; i <= count; i++) {
    radii.push((outer * i) / (count + 1))
  }

  return radii
}

export type LobeSpec = {
  position: [number, number, number]
  scale: [number, number, number]
  phase: 1 | -1
}

export type TorusSpec = {
  position: [number, number, number]
  radius: number
  tube: number
  phase: 1 | -1
}

export type AngularNodeSpec = {
  type: "plane"
  normal: [number, number, number]
  label: string
}

function lobeDistance(n: number, family: OrbitalFamily): number {
  const base = family === "f" ? 0.55 : family === "d" ? 0.65 : 0.75
  return base + (n - getMinN(family)) * 0.28
}

function getMinN(family: OrbitalFamily): number {
  switch (family) {
    case "s":
      return 1
    case "p":
      return 2
    case "d":
      return 3
    case "f":
      return 4
  }
}

function lobeSize(n: number, family: OrbitalFamily): number {
  return (family === "f" ? 0.32 : family === "d" ? 0.38 : 0.42) + n * 0.04
}

/** Educational lobe layouts — stylized, not exact isosurfaces */
export function getLobeLayout(orbital: OrbitalData): { lobes: LobeSpec[]; torus?: TorusSpec } {
  const { family, n, orientation, id } = orbital
  const d = lobeDistance(n, family)
  const s = lobeSize(n, family)
  const lobes: LobeSpec[] = []

  if (family === "s") {
    const outer = getOrbitalScale(n)
    const nodeCount = getRadialNodes(n, 0)

    lobes.push({ position: [0, 0, 0], scale: [outer, outer, outer], phase: 1 })

    if (nodeCount >= 1) {
      lobes.push({
        position: [0, 0, 0],
        scale: [outer * 0.38, outer * 0.38, outer * 0.38],
        phase: 1,
      })
    }
    if (nodeCount >= 2) {
      lobes.push({
        position: [0, 0, 0],
        scale: [outer * 0.68, outer * 0.68, outer * 0.68],
        phase: -1,
      })
    }
    if (nodeCount >= 3) {
      lobes.push({
        position: [0, 0, 0],
        scale: [outer * 0.52, outer * 0.52, outer * 0.52],
        phase: 1,
      })
    }

    return { lobes }
  }

  if (family === "p") {
    const axis = orientation ?? "z"
    const offset: [number, number, number] =
      axis === "x" ? [d, 0, 0] : axis === "y" ? [0, d, 0] : [0, 0, d]
    const elong: [number, number, number] =
      axis === "x" ? [1.35, 0.75, 0.75] : axis === "y" ? [0.75, 1.35, 0.75] : [0.75, 0.75, 1.35]

    lobes.push(
      {
        position: offset,
        scale: [s * elong[0], s * elong[1], s * elong[2]],
        phase: 1,
      },
      {
        position: [-offset[0], -offset[1], -offset[2]],
        scale: [s * elong[0], s * elong[1], s * elong[2]],
        phase: -1,
      },
    )
    return { lobes }
  }

  if (family === "d") {
    const variant = id.split("_").slice(1).join("_")

    if (variant === "z2") {
      lobes.push(
        { position: [0, 0, d * 1.1], scale: [s * 0.85, s * 0.85, s * 1.2], phase: 1 },
        { position: [0, 0, -d * 1.1], scale: [s * 0.85, s * 0.85, s * 1.2], phase: 1 },
      )
      return {
        lobes,
        torus: {
          position: [0, 0, 0],
          radius: d * 0.95,
          tube: s * 0.35,
          phase: -1,
        },
      }
    }

    const cloverConfigs: Record<string, [number, number, number][]> = {
      xy: [
        [d, d, 0],
        [-d, d, 0],
        [-d, -d, 0],
        [d, -d, 0],
      ],
      xz: [
        [d, 0, d],
        [-d, 0, d],
        [-d, 0, -d],
        [d, 0, -d],
      ],
      yz: [
        [0, d, d],
        [0, -d, d],
        [0, -d, -d],
        [0, d, -d],
      ],
      "x2-y2": [
        [d, 0, 0],
        [-d, 0, 0],
        [0, d, 0],
        [0, -d, 0],
      ],
    }

    const positions = cloverConfigs[variant] ?? cloverConfigs.xy
    const phases: (1 | -1)[] = [1, -1, 1, -1]

    positions.forEach((pos, i) => {
      lobes.push({
        position: pos,
        scale: [s, s, s],
        phase: phases[i],
      })
    })

    return { lobes }
  }

  // f orbitals — distinct stylized multi-lobe layouts
  const fVariant = orientation ?? id.replace(/^\d+f_/, "f_")
  const fd = d * 0.9
  const fs = s * 0.85

  const fLayouts: Record<string, { positions: [number, number, number][]; phases: (1 | -1)[] }> = {
    f_z3: {
      positions: [
        [0, 0, fd * 1.3],
        [0, 0, -fd * 1.3],
        [fd * 0.6, 0, fd * 0.4],
        [-fd * 0.6, 0, -fd * 0.4],
      ],
      phases: [1, -1, 1, -1],
    },
    f_xz2: {
      positions: [
        [fd, 0, fd],
        [-fd, 0, fd],
        [fd, 0, -fd],
        [-fd, 0, -fd],
        [0, 0, fd * 1.2],
      ],
      phases: [1, -1, -1, 1, 1],
    },
    f_yz2: {
      positions: [
        [0, fd, fd],
        [0, -fd, fd],
        [0, fd, -fd],
        [0, -fd, -fd],
        [0, 0, fd * 1.2],
      ],
      phases: [1, -1, -1, 1, 1],
    },
    f_xyz: {
      positions: [
        [fd, fd, fd],
        [-fd, -fd, fd],
        [-fd, fd, -fd],
        [fd, -fd, -fd],
      ],
      phases: [1, 1, -1, -1],
    },
    f_z_x2_y2: {
      positions: [
        [0, 0, fd * 1.1],
        [fd, fd, 0],
        [-fd, fd, 0],
        [-fd, -fd, 0],
        [fd, -fd, 0],
      ],
      phases: [1, 1, -1, 1, -1],
    },
    f_x_x2_3y2: {
      positions: [
        [fd * 1.2, 0, 0],
        [-fd * 0.7, fd, 0],
        [-fd * 0.7, -fd, 0],
        [fd * 0.5, fd * 0.8, fd * 0.5],
        [fd * 0.5, -fd * 0.8, -fd * 0.5],
      ],
      phases: [1, 1, 1, -1, -1],
    },
    f_y_3x2_y2: {
      positions: [
        [0, fd * 1.2, 0],
        [fd, -fd * 0.7, 0],
        [-fd, -fd * 0.7, 0],
        [fd * 0.8, fd * 0.5, fd * 0.5],
        [-fd * 0.8, fd * 0.5, -fd * 0.5],
      ],
      phases: [1, 1, 1, -1, -1],
    },
  }

  const layout = fLayouts[fVariant] ?? fLayouts.f_xyz
  layout.positions.forEach((pos, i) => {
    lobes.push({
      position: pos,
      scale: [fs, fs, fs],
      phase: layout.phases[i],
    })
  })

  return { lobes }
}

/** Conceptual angular nodal surfaces for the selected orbital */
export function getAngularNodeSurfaces(orbital: OrbitalData): AngularNodeSpec[] {
  const { family, orientation, id } = orbital
  const surfaces: AngularNodeSpec[] = []

  if (family === "p") {
    const axis = orientation ?? "z"
    const normal: [number, number, number] =
      axis === "x" ? [1, 0, 0] : axis === "y" ? [0, 1, 0] : [0, 0, 1]
    surfaces.push({ type: "plane", normal, label: "Angular node" })
    return surfaces
  }

  if (family === "d") {
    const variant = id.split("_").slice(1).join("_")
    if (variant === "xy") {
      surfaces.push({ type: "plane", normal: [0, 0, 1], label: "Angular node" })
      surfaces.push({ type: "plane", normal: [0, 0, 1], label: "Angular node" })
    } else if (variant === "xz") {
      surfaces.push({ type: "plane", normal: [0, 1, 0], label: "Angular node" })
      surfaces.push({ type: "plane", normal: [0, 1, 0], label: "Angular node" })
    } else if (variant === "yz") {
      surfaces.push({ type: "plane", normal: [1, 0, 0], label: "Angular node" })
      surfaces.push({ type: "plane", normal: [1, 0, 0], label: "Angular node" })
    } else if (variant === "z2") {
      surfaces.push({ type: "plane", normal: [0, 0, 1], label: "Angular node" })
      surfaces.push({ type: "plane", normal: [1, 0, 0], label: "Angular node" })
      surfaces.push({ type: "plane", normal: [0, 1, 0], label: "Angular node" })
    } else if (variant === "x2-y2") {
      surfaces.push({ type: "plane", normal: [0, 0, 1], label: "Angular node" })
      surfaces.push({ type: "plane", normal: [1, 1, 0], label: "Angular node" })
    }
    return surfaces
  }

  if (family === "f") {
    surfaces.push({ type: "plane", normal: [0, 0, 1], label: "Angular node" })
    surfaces.push({ type: "plane", normal: [1, 0, 0], label: "Angular node" })
    surfaces.push({ type: "plane", normal: [0, 1, 0], label: "Angular node" })
    return surfaces
  }

  return surfaces
}

/** Simplified hydrogen-like wavefunction for optional density sampling */
export function evaluateWavefunction(orbital: OrbitalData, x: number, y: number, z: number): number {
  const r = Math.sqrt(x * x + y * y + z * z) || 1e-6
  const { n, l, family, orientation, id } = orbital
  const rho = (2 * r) / n

  let radial = Math.exp(-rho / 2) * Math.pow(rho, l)
  if (n - l - 1 === 1) radial *= 2 - rho
  if (n - l - 1 === 2) radial *= (6 - 6 * rho + rho * rho) / 2
  if (n - l - 1 === 3) radial *= (24 - 36 * rho + 12 * rho * rho - rho * rho * rho) / 6

  if (family === "s") return radial

  const nx = x / r
  const ny = y / r
  const nz = z / r

  if (family === "p") {
    const axis = orientation ?? "z"
    const angular = axis === "x" ? nx : axis === "y" ? ny : nz
    return radial * angular
  }

  if (family === "d") {
    const variant = id.split("_").slice(1).join("_")
    const angularMap: Record<string, number> = {
      xy: nx * ny,
      xz: nx * nz,
      yz: ny * nz,
      z2: 3 * nz * nz - 1,
      "x2-y2": nx * nx - ny * ny,
    }
    return radial * (angularMap[variant] ?? nx * ny)
  }

  const fVariant = orientation ?? id.replace(/^\d+f_/, "f_")
  const fMap: Record<string, number> = {
    f_z3: nz * (5 * nz * nz - 3),
    f_xz2: nx * nz * nz,
    f_yz2: ny * nz * nz,
    f_xyz: nx * ny * nz,
    f_z_x2_y2: nz * (nx * nx - ny * ny),
    f_x_x2_3y2: nx * (nx * nx - 3 * ny * ny),
    f_y_3x2_y2: ny * (3 * nx * nx - ny * ny),
  }
  return radial * (fMap[fVariant] ?? nx * ny * nz)
}
