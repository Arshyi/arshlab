"use client"

import { useMemo, useRef, useState } from "react"
import { Canvas } from "@react-three/fiber"
import type { ThreeEvent } from "@react-three/fiber"
import { OrbitControls, Text } from "@react-three/drei"
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib"
import * as THREE from "three"
import {
  classifyOverlap,
  getHybridizationGeometry,
  type HybridizationMode,
  type OuterHybridAtom,
} from "@/lib/chemistry/database/hybridization"
import { useWebGLSupport, WebGLFallback } from "@/components/webgl-fallback"

type Vec3 = [number, number, number]

export interface HybridizationOrbitalCounts {
  s: number
  p: number
  d: number
}

interface HybridizationBuilder3DProps {
  centralAtom: string
  mode: HybridizationMode
  orbitalCounts: HybridizationOrbitalCounts
  isHybridized: boolean
  outerAtoms: OuterHybridAtom[]
  lonePairs: number
  onOuterAtomDistanceChange: (id: string, distance: number) => void
  className?: string
}

const phasePositive = "#14b8a6"
const phaseNegative = "#8b5cf6"
const lonePairColor = "#c084fc"
const overlapColor = "#f59e0b"

const atomColors: Record<string, string> = {
  H: "#e2e8f0",
  C: "#475569",
  N: "#3b82f6",
  O: "#ef4444",
  F: "#22c55e",
  Cl: "#84cc16",
  B: "#f59e0b",
  Be: "#94a3b8",
  P: "#f97316",
  S: "#eab308",
  Xe: "#a78bfa",
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function vectorFromTuple(value: Vec3): THREE.Vector3 {
  return new THREE.Vector3(value[0], value[1], value[2]).normalize()
}

function scaledPosition(direction: Vec3, distance: number): Vec3 {
  const vector = vectorFromTuple(direction)
  return [vector.x * distance, vector.y * distance, vector.z * distance]
}

function midpoint(start: THREE.Vector3, end: THREE.Vector3): Vec3 {
  return [(start.x + end.x) / 2, (start.y + end.y) / 2, (start.z + end.z) / 2]
}

function orientationFromY(direction: THREE.Vector3): THREE.Quaternion {
  return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize())
}

function orientationFromX(direction: Vec3): THREE.Quaternion {
  return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), vectorFromTuple(direction))
}

function SceneSphere({
  position,
  scale,
  color,
  opacity = 1,
  wireframe = false,
}: {
  position: Vec3
  scale: Vec3
  color: string
  opacity?: number
  wireframe?: boolean
}) {
  return (
    <mesh position={position} scale={scale}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshStandardMaterial
        color={color}
        transparent={opacity < 1}
        opacity={opacity}
        wireframe={wireframe}
        roughness={0.35}
        metalness={0.04}
        side={THREE.DoubleSide}
        depthWrite={opacity > 0.25}
      />
    </mesh>
  )
}

function CylinderBetween({
  start,
  end,
  color,
  radius = 0.012,
  opacity = 1,
}: {
  start: Vec3
  end: Vec3
  color: string
  radius?: number
  opacity?: number
}) {
  const startVector = new THREE.Vector3(...start)
  const endVector = new THREE.Vector3(...end)
  const direction = endVector.clone().sub(startVector)
  const length = direction.length()

  if (length <= 0.001) return null

  return (
    <mesh position={midpoint(startVector, endVector)} quaternion={orientationFromY(direction)}>
      <cylinderGeometry args={[radius, radius, length, 12]} />
      <meshStandardMaterial color={color} transparent={opacity < 1} opacity={opacity} />
    </mesh>
  )
}

function CoordinateAxes() {
  const axes = [
    { label: "x", end: [3, 0, 0] as Vec3, color: "#ef4444" },
    { label: "y", end: [0, 3, 0] as Vec3, color: "#22c55e" },
    { label: "z", end: [0, 0, 3] as Vec3, color: "#3b82f6" },
  ]

  return (
    <group>
      {axes.map((axis) => (
        <group key={axis.label}>
          <CylinderBetween start={[0, 0, 0]} end={axis.end} color={axis.color} radius={0.01} opacity={0.62} />
          <Text
            position={[axis.end[0] * 1.08, axis.end[1] * 1.08, axis.end[2] * 1.08]}
            fontSize={0.18}
            color={axis.color}
            anchorX="center"
            anchorY="middle"
          >
            {axis.label}
          </Text>
        </group>
      ))}
    </group>
  )
}

function CentralAtom({ symbol }: { symbol: string }) {
  const color = atomColors[symbol] ?? "#14b8a6"

  return (
    <group>
      <SceneSphere position={[0, 0, 0]} scale={[0.25, 0.25, 0.25]} color={color} opacity={0.96} />
      <SceneSphere position={[0, 0, 0]} scale={[0.52, 0.52, 0.52]} color={color} opacity={0.12} />
      <Text position={[0, 0.58, 0]} fontSize={0.24} color="#e2e8f0" anchorX="center" anchorY="middle">
        {symbol}
      </Text>
    </group>
  )
}

function SOrbital({ visible }: { visible: boolean }) {
  if (!visible) return null

  return (
    <group>
      <SceneSphere position={[0, 0, 0]} scale={[1.05, 1.05, 1.05]} color={phasePositive} opacity={0.16} wireframe />
      <Text position={[0, -1.22, 0]} fontSize={0.15} color="#99f6e4" anchorX="center" anchorY="middle">
        s orbital
      </Text>
    </group>
  )
}

function POrbital({ axis, label }: { axis: Vec3; label: string }) {
  const direction = vectorFromTuple(axis)
  const positive = [direction.x * 0.82, direction.y * 0.82, direction.z * 0.82] as Vec3
  const negative = [-direction.x * 0.82, -direction.y * 0.82, -direction.z * 0.82] as Vec3
  const quaternion = orientationFromX(axis)

  return (
    <group>
      <group quaternion={quaternion}>
        <SceneSphere position={[0.82, 0, 0]} scale={[0.72, 0.28, 0.28]} color={phasePositive} opacity={0.42} />
        <SceneSphere position={[-0.82, 0, 0]} scale={[0.72, 0.28, 0.28]} color={phaseNegative} opacity={0.36} />
      </group>
      <Text
        position={[positive[0] * 1.28, positive[1] * 1.28 + 0.1, positive[2] * 1.28]}
        fontSize={0.14}
        color="#dbeafe"
        anchorX="center"
        anchorY="middle"
      >
        {label}
      </Text>
      <Text
        position={[negative[0] * 1.28, negative[1] * 1.28 - 0.1, negative[2] * 1.28]}
        fontSize={0.13}
        color="#c4b5fd"
        anchorX="center"
        anchorY="middle"
      >
        pi overlap ready
      </Text>
    </group>
  )
}

function HybridOrbital({
  direction,
  label,
  occupied,
  lonePair,
}: {
  direction: Vec3
  label: string
  occupied: boolean
  lonePair: boolean
}) {
  const vector = vectorFromTuple(direction)
  const quaternion = orientationFromX(direction)
  const end = [vector.x * 1.55, vector.y * 1.55, vector.z * 1.55] as Vec3
  const color = lonePair ? lonePairColor : occupied ? phasePositive : "#38bdf8"
  const opacity = lonePair ? 0.46 : occupied ? 0.58 : 0.3

  return (
    <group>
      <group quaternion={quaternion}>
        <SceneSphere position={[0.86, 0, 0]} scale={[0.88, 0.3, 0.3]} color={color} opacity={opacity} />
        <SceneSphere position={[-0.34, 0, 0]} scale={[0.28, 0.18, 0.18]} color={phaseNegative} opacity={0.22} />
      </group>
      <CylinderBetween start={[0, 0, 0]} end={end} color={color} radius={0.008} opacity={0.45} />
      <Text
        position={[end[0] * 1.06, end[1] * 1.06, end[2] * 1.06]}
        fontSize={0.13}
        color={lonePair ? "#f3e8ff" : "#cffafe"}
        anchorX="center"
        anchorY="middle"
      >
        {lonePair ? "lone pair" : label}
      </Text>
    </group>
  )
}

function OuterAtomMesh({
  atom,
  direction,
  draggingId,
  setDraggingId,
  onDistanceChange,
}: {
  atom: OuterHybridAtom
  direction: Vec3
  draggingId: string | null
  setDraggingId: (id: string | null) => void
  onDistanceChange: (id: string, distance: number) => void
}) {
  const unitDirection = useMemo(() => vectorFromTuple(direction), [direction])
  const position = scaledPosition(direction, atom.distance)
  const color = atomColors[atom.symbol] ?? "#e2e8f0"
  const regime = classifyOverlap(atom.distance)
  const isDragging = draggingId === atom.id

  const handlePointerMove = (event: ThreeEvent<PointerEvent>) => {
    if (!isDragging) return
    event.stopPropagation()
    const projectedDistance = event.point.dot(unitDirection)
    onDistanceChange(atom.id, clamp(projectedDistance, 0.48, 3.6))
  }

  return (
    <group>
      <CylinderBetween start={[0, 0, 0]} end={position} color="#94a3b8" radius={0.01} opacity={0.36} />
      <group
        position={position}
        onPointerDown={(event: ThreeEvent<PointerEvent>) => {
          event.stopPropagation()
          setDraggingId(atom.id)
        }}
        onPointerMove={handlePointerMove}
        onPointerUp={(event: ThreeEvent<PointerEvent>) => {
          event.stopPropagation()
          setDraggingId(null)
        }}
        onPointerLeave={() => {
          if (isDragging) setDraggingId(null)
        }}
      >
        <SceneSphere
          position={[0, 0, 0]}
          scale={[isDragging ? 0.32 : 0.27, isDragging ? 0.32 : 0.27, isDragging ? 0.32 : 0.27]}
          color={color}
          opacity={0.94}
        />
        <SceneSphere position={[0, 0, 0]} scale={[0.58, 0.58, 0.58]} color={color} opacity={0.12} />
        <Text position={[0, 0.48, 0]} fontSize={0.18} color="#e2e8f0" anchorX="center" anchorY="middle">
          {atom.symbol}
        </Text>
      </group>

      {regime === "overlap" && (
        <group position={scaledPosition(direction, atom.distance * 0.54)}>
          <SceneSphere position={[0, 0, 0]} scale={[0.34, 0.34, 0.34]} color={overlapColor} opacity={0.45} />
          <Text position={[0, 0.5, 0]} fontSize={0.14} color="#fde68a" anchorX="center" anchorY="middle">
            sigma overlap
          </Text>
        </group>
      )}

      {regime === "too-close" && (
        <group position={scaledPosition(direction, atom.distance * 0.46)}>
          <SceneSphere position={[0, 0, 0]} scale={[0.28, 0.28, 0.28]} color="#ef4444" opacity={0.32} />
          <Text position={[0, 0.46, 0]} fontSize={0.13} color="#fecaca" anchorX="center" anchorY="middle">
            repulsion
          </Text>
        </group>
      )}
    </group>
  )
}

function UnhybridizedPOrbitals({ count }: { count: number }) {
  const axes = [
    { axis: [0, 0, 1] as Vec3, label: "p orbital" },
    { axis: [0, 1, 0] as Vec3, label: "p orbital" },
    { axis: [1, 0, 0] as Vec3, label: "p orbital" },
  ]

  return (
    <group>
      {axes.slice(0, count).map((item, index) => (
        <POrbital key={`${item.label}-${index}`} axis={item.axis} label={item.label} />
      ))}
    </group>
  )
}

function SceneContent({
  centralAtom,
  mode,
  orbitalCounts,
  isHybridized,
  outerAtoms,
  lonePairs,
  onOuterAtomDistanceChange,
}: Omit<HybridizationBuilder3DProps, "className">) {
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const geometry = getHybridizationGeometry(mode)
  const directions = geometry.directions
  const lonePairStart = Math.min(outerAtoms.length, directions.length)
  const lonePairIndexes = new Set(
    directions
      .slice(lonePairStart, lonePairStart + lonePairs)
      .map((_, index) => lonePairStart + index),
  )
  const showHybridOrbitals = isHybridized && mode !== "unhybridized"
  const manualPCount = mode === "unhybridized" || !isHybridized ? orbitalCounts.p : geometry.unhybridizedPOrbitals

  return (
    <>
      <ambientLight intensity={0.58} />
      <directionalLight position={[5, 7, 5]} intensity={1.15} />
      <directionalLight position={[-4, -2, -5]} intensity={0.4} />

      <CoordinateAxes />
      <CentralAtom symbol={centralAtom} />

      <group>
        {!showHybridOrbitals && <SOrbital visible={orbitalCounts.s > 0} />}
        {manualPCount > 0 && <UnhybridizedPOrbitals count={manualPCount} />}

        {showHybridOrbitals &&
          directions.map((direction, index) => {
            const occupied = outerAtoms.some((atom) => atom.directionIndex % directions.length === index)
            const lonePair = lonePairIndexes.has(index)

            return (
              <HybridOrbital
                key={direction.id}
                direction={direction.vector}
                label={direction.label}
                occupied={occupied}
                lonePair={lonePair}
              />
            )
          })}

        {outerAtoms.map((atom) => {
          const direction = directions[atom.directionIndex % directions.length]?.vector ?? [1, 0, 0]

          return (
            <OuterAtomMesh
              key={atom.id}
              atom={atom}
              direction={direction}
              draggingId={draggingId}
              setDraggingId={setDraggingId}
              onDistanceChange={onOuterAtomDistanceChange}
            />
          )
        })}
      </group>
    </>
  )
}

export function HybridizationBuilder3D({
  centralAtom,
  mode,
  orbitalCounts,
  isHybridized,
  outerAtoms,
  lonePairs,
  onOuterAtomDistanceChange,
  className,
}: HybridizationBuilder3DProps) {
  const webglSupported = useWebGLSupport()
  const controlsRef = useRef<OrbitControlsImpl | null>(null)
  const geometry = getHybridizationGeometry(mode)
  const activeOverlapCount = outerAtoms.filter((atom) => classifyOverlap(atom.distance) === "overlap").length

  if (webglSupported === false) {
    return (
      <div className={className}>
        <WebGLFallback className="aspect-[4/3] lg:aspect-square" />
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="relative aspect-[4/3] min-h-[340px] overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 lg:aspect-square">
        <Canvas camera={{ position: [4.5, 3.2, 6.2], fov: 45 }} style={{ background: "transparent" }}>
          <SceneContent
            centralAtom={centralAtom}
            mode={mode}
            orbitalCounts={orbitalCounts}
            isHybridized={isHybridized}
            outerAtoms={outerAtoms}
            lonePairs={lonePairs}
            onOuterAtomDistanceChange={onOuterAtomDistanceChange}
          />
          <OrbitControls ref={controlsRef} enablePan enableZoom enableRotate minDistance={3} maxDistance={12} />
        </Canvas>

        <div className="absolute left-3 top-3 rounded-xl border border-white/10 bg-slate-950/72 px-3 py-2 text-white shadow-sm backdrop-blur">
          <p className="text-sm font-semibold">{geometry.electronGeometry}</p>
          <p className="text-xs text-slate-300">{geometry.idealBondAngles}</p>
        </div>
        <div className="absolute bottom-3 left-3 rounded-xl border border-white/10 bg-slate-950/72 px-3 py-2 text-xs text-slate-300 backdrop-blur">
          drag outer atoms / rotate to inspect
        </div>
        <div className="absolute bottom-3 right-3 rounded-xl border border-white/10 bg-slate-950/72 px-3 py-2 text-xs text-slate-300 backdrop-blur">
          {activeOverlapCount > 0 ? "Hybrid orbital overlap detected" : "Move atoms closer for overlap"}
        </div>
      </div>
    </div>
  )
}
