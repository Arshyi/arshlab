/**
 * ARSHLAB Master Chemistry Database
 * Central entry point for all chemistry data and engines.
 */

export * from "./types"
export * from "./registry"
export * from "./compounds"
export * from "./ions"
export * from "./periodic-table"
export * from "./bonding"
export * from "./functional-groups"
export * from "./orbitals"
export * from "./spectroscopy"
export * from "./reactions/families"
export * from "./lewis/engine"
export * from "./lewis/types"
export * from "./vsepr/engine"
export * from "./vsepr/shapes"
export * from "./search/engine"
export * from "./questions/topics"
export * from "./questions/hierarchy"
export * from "./users/schema"
export * from "./analytics/tracker"
export * from "./education/hub"

// Placeholder modules — extend with data as platform grows
export const THERMODYNAMICS_MODULE = { status: "planned" as const, path: "thermodynamics" }
export const ELECTROCHEMISTRY_MODULE = { status: "planned" as const, path: "electrochemistry" }
export const KINETICS_MODULE = { status: "planned" as const, path: "kinetics" }
export const ACID_BASE_MODULE = { status: "planned" as const, path: "acid-base" }
export const EQUILIBRIUM_MODULE = { status: "planned" as const, path: "equilibrium" }
