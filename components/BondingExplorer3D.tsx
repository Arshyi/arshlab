"use client"

import { useMemo, useRef } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { OrbitControls, Text } from "@react-three/drei"
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib"
import * as THREE from "three"
import type {
  BondInteractionType,
  BondPreset,
  BondVisualizationMode,
  OrbitalOverlapType,
} from "@/lib/chemistry/database/bonding"
import {
  classifyInteractionRegime,
  getAtomVisual,
} from "@/lib/chemistry/database/bonding"
import { useWebGLSupport, WebGLFallback } from "@/components/webgl-fallback"

export type BondingViewerSettings = {
  visualizationMode: BondVisualizationMode
  showNuclei: boolean
  showElectronClouds: boolean
  showOrbitalLobes: boolean
  showOverlapRegion: boolean
  showForceArrows: boolean
  showBondLengthMarker: boolean
  showLabels: boolean
}

export const DEFAULT_BONDING_VIEWER_SETTINGS: BondingViewerSettings = {
  visualizationMode: "electron-cloud",
  showNuclei: true,
  showElectronClouds: true,
  showOrbitalLobes: true,
  showOverlapRegion: true,
  showForceArrows: true,
  showBondLengthMarker: true,
  showLabels: true,
}

const phasePositive = "#14b8a6"
const phaseNegative = "#8b5cf6"
const overlapColor = "#f59e0b"

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function SceneSphere({
  position,
  scale,
  color,
  opacity = 1,
  wireframe = false,
}: {
  position: [number, number, number]
  scale: [number, number, number]
  color: string
  opacity?: number
  wireframe?: boolean
}) {
  return (
    <mesh position={position} scale={scale}>
      <sphereGeometry args={[1, 40, 40]} />
      <meshStandardMaterial
        color={color}
        transparent={opacity < 1}
        opacity={opacity}
        wireframe={wireframe}
        roughness={0.34}
        metalness={0.05}
        side={THREE.DoubleSide}
        depthWrite={opacity > 0.35}
      />
    </mesh>
  )
}

function Nucleus({
  position,
  color,
  label,
  showLabel,
}: {
  position: [number, number, number]
  color: string
  label: string
  showLabel: boolean
}) {
  return (
    <group>
      <mesh position={position}>
        <sphereGeometry args={[0.13, 24, 24]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.35} roughness={0.2} />
      </mesh>
      {showLabel && (
        <Text position={[position[0], 1.38, 0]} fontSize={0.22} color="#e2e8f0" anchorX="center" anchorY="middle">
          {label}
        </Text>
      )}
    </group>
  )
}

function CylinderX({
  position,
  length,
  radius,
  color,
  opacity = 1,
}: {
  position: [number, number, number]
  length: number
  radius: number
  color: string
  opacity?: number
}) {
  return (
    <mesh position={position} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[radius, radius, length, 12]} />
      <meshStandardMaterial color={color} transparent={opacity < 1} opacity={opacity} />
    </mesh>
  )
}

function CylinderY({
  position,
  length,
  radius,
  color,
  opacity = 1,
}: {
  position: [number, number, number]
  length: number
  radius: number
  color: string
  opacity?: number
}) {
  return (
    <mesh position={position}>
      <cylinderGeometry args={[radius, radius, length, 12]} />
      <meshStandardMaterial color={color} transparent={opacity < 1} opacity={opacity} />
    </mesh>
  )
}

function ForceArrow({
  side,
  direction,
  color,
  label,
}: {
  side: "left" | "right"
  direction: -1 | 1
  color: string
  label: string
}) {
  const startX = side === "left" ? -2.65 : 2.65
  const length = 0.78
  const shaftCenterX = startX + direction * length * 0.45
  const tipX = startX + direction * length
  const rotation = direction > 0 ? -Math.PI / 2 : Math.PI / 2

  return (
    <group>
      <mesh position={[shaftCenterX, 0.88, 0]} rotation={[0, 0, rotation]}>
        <cylinderGeometry args={[0.035, 0.035, length * 0.72, 12]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.22} />
      </mesh>
      <mesh position={[tipX, 0.88, 0]} rotation={[0, 0, rotation]}>
        <coneGeometry args={[0.11, 0.24, 18]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.22} />
      </mesh>
      {side === "right" && (
        <Text position={[0, 1.65, 0]} fontSize={0.18} color={color} anchorX="center" anchorY="middle">
          {label}
        </Text>
      )}
    </group>
  )
}

function BondLengthMarker({ distance }: { distance: number }) {
  const y = -1.18
  const tickHeight = 0.28

  return (
    <group>
      <CylinderX position={[0, y, 0]} length={distance} radius={0.015} color="#94a3b8" opacity={0.86} />
      <CylinderY position={[-distance / 2, y, 0]} length={tickHeight} radius={0.012} color="#94a3b8" opacity={0.86} />
      <CylinderY position={[distance / 2, y, 0]} length={tickHeight} radius={0.012} color="#94a3b8" opacity={0.86} />
      <Text position={[0, y - 0.28, 0]} fontSize={0.16} color="#cbd5e1" anchorX="center" anchorY="middle">
        {distance.toFixed(2)} A
      </Text>
    </group>
  )
}

function ElectronClouds({
  leftPosition,
  rightPosition,
  leftCloud,
  rightCloud,
  leftColor,
  rightColor,
  visible,
}: {
  leftPosition: [number, number, number]
  rightPosition: [number, number, number]
  leftCloud: number
  rightCloud: number
  leftColor: string
  rightColor: string
  visible: boolean
}) {
  if (!visible) return null

  return (
    <group>
      <SceneSphere position={leftPosition} scale={[leftCloud, leftCloud, leftCloud]} color={leftColor} opacity={0.18} />
      <SceneSphere position={rightPosition} scale={[rightCloud, rightCloud, rightCloud]} color={rightColor} opacity={0.18} />
    </group>
  )
}

function AtomSpheres({
  leftPosition,
  rightPosition,
  leftRadius,
  rightRadius,
  leftColor,
  rightColor,
  mode,
}: {
  leftPosition: [number, number, number]
  rightPosition: [number, number, number]
  leftRadius: number
  rightRadius: number
  leftColor: string
  rightColor: string
  mode: BondVisualizationMode
}) {
  if (mode !== "space-filling" && mode !== "simple-spheres") return null
  const opacity = mode === "simple-spheres" ? 0.72 : 0.9
  const multiplier = mode === "simple-spheres" ? 0.52 : 0.75

  return (
    <group>
      <SceneSphere
        position={leftPosition}
        scale={[Math.max(0.22, leftRadius * multiplier), Math.max(0.22, leftRadius * multiplier), Math.max(0.22, leftRadius * multiplier)]}
        color={leftColor}
        opacity={opacity}
      />
      <SceneSphere
        position={rightPosition}
        scale={[Math.max(0.22, rightRadius * multiplier), Math.max(0.22, rightRadius * multiplier), Math.max(0.22, rightRadius * multiplier)]}
        color={rightColor}
        opacity={opacity}
      />
    </group>
  )
}

function SigmaLobes({
  leftX,
  rightX,
  overlapType,
  visible,
}: {
  leftX: number
  rightX: number
  overlapType: OrbitalOverlapType
  visible: boolean
}) {
  if (!visible) return null

  if (overlapType === "s-s") {
    return (
      <group>
        <SceneSphere position={[leftX, 0, 0]} scale={[0.58, 0.58, 0.58]} color={phasePositive} opacity={0.48} />
        <SceneSphere position={[rightX, 0, 0]} scale={[0.58, 0.58, 0.58]} color={phasePositive} opacity={0.48} />
      </group>
    )
  }

  if (overlapType === "s-p") {
    return (
      <group>
        <SceneSphere position={[leftX, 0, 0]} scale={[0.5, 0.5, 0.5]} color={phasePositive} opacity={0.48} />
        <SceneSphere position={[rightX - 0.38, 0, 0]} scale={[0.55, 0.35, 0.35]} color={phasePositive} opacity={0.52} />
        <SceneSphere position={[rightX + 0.42, 0, 0]} scale={[0.48, 0.3, 0.3]} color={phaseNegative} opacity={0.32} />
      </group>
    )
  }

  return (
    <group>
      <SceneSphere position={[leftX + 0.42, 0, 0]} scale={[0.58, 0.33, 0.33]} color={phasePositive} opacity={0.52} />
      <SceneSphere position={[leftX - 0.46, 0, 0]} scale={[0.48, 0.28, 0.28]} color={phaseNegative} opacity={0.3} />
      <SceneSphere position={[rightX - 0.42, 0, 0]} scale={[0.58, 0.33, 0.33]} color={phasePositive} opacity={0.52} />
      <SceneSphere position={[rightX + 0.46, 0, 0]} scale={[0.48, 0.28, 0.28]} color={phaseNegative} opacity={0.3} />
    </group>
  )
}

function PiLobes({
  leftX,
  rightX,
  visible,
  bondOrder,
}: {
  leftX: number
  rightX: number
  visible: boolean
  bondOrder: number
}) {
  if (!visible) return null

  const lobe = (x: number, y: number, z: number, color: string, key: string) => (
    <SceneSphere key={key} position={[x, y, z]} scale={[0.34, y === 0 ? 0.3 : 0.55, z === 0 ? 0.3 : 0.55]} color={color} opacity={0.5} />
  )

  const lobes = [
    lobe(leftX, 0.5, 0, phasePositive, "lyp"),
    lobe(leftX, -0.5, 0, phaseNegative, "lyn"),
    lobe(rightX, 0.5, 0, phasePositive, "ryp"),
    lobe(rightX, -0.5, 0, phaseNegative, "ryn"),
  ]

  if (bondOrder >= 3) {
    lobes.push(
      lobe(leftX, 0, 0.5, phasePositive, "lzp"),
      lobe(leftX, 0, -0.5, phaseNegative, "lzn"),
      lobe(rightX, 0, 0.5, phasePositive, "rzp"),
      lobe(rightX, 0, -0.5, phaseNegative, "rzn"),
    )
  }

  return <group>{lobes}</group>
}

function OverlapRegion({
  distance,
  leftCloud,
  rightCloud,
  interactionType,
  overlapType,
  bondOrder,
  visible,
}: {
  distance: number
  leftCloud: number
  rightCloud: number
  interactionType: BondInteractionType
  overlapType: OrbitalOverlapType
  bondOrder: number
  visible: boolean
}) {
  if (!visible) return null

  const overlap = clamp((leftCloud + rightCloud - distance) / Math.max(0.2, leftCloud + rightCloud), 0.08, 0.72)
  const opacity = interactionType === "nonbonding" || interactionType === "repulsive" ? overlap * 0.22 : overlap * 0.62

  if (interactionType === "pi" || overlapType === "p-p-pi") {
    return (
      <group>
        <SceneSphere position={[0, 0.5, 0]} scale={[0.52, 0.18 + overlap * 0.24, 0.24]} color={overlapColor} opacity={opacity} />
        <SceneSphere position={[0, -0.5, 0]} scale={[0.52, 0.18 + overlap * 0.24, 0.24]} color={overlapColor} opacity={opacity} />
        {bondOrder >= 3 && (
          <>
            <SceneSphere position={[0, 0, 0.5]} scale={[0.52, 0.24, 0.18 + overlap * 0.24]} color="#22c55e" opacity={opacity * 0.9} />
            <SceneSphere position={[0, 0, -0.5]} scale={[0.52, 0.24, 0.18 + overlap * 0.24]} color="#22c55e" opacity={opacity * 0.9} />
          </>
        )}
      </group>
    )
  }

  return (
    <SceneSphere
      position={[0, 0, 0]}
      scale={[0.22 + overlap * 0.55, 0.18 + overlap * 0.38, 0.18 + overlap * 0.38]}
      color={overlapColor}
      opacity={opacity}
    />
  )
}

function SceneContent({
  preset,
  distance,
  interactionType,
  overlapType,
  settings,
}: {
  preset: BondPreset
  distance: number
  interactionType: BondInteractionType
  overlapType: OrbitalOverlapType
  settings: BondingViewerSettings
}) {
  const groupRef = useRef<THREE.Group>(null)
  const leftVisual = getAtomVisual(preset.atoms[0])
  const rightVisual = getAtomVisual(preset.atoms[1])
  const leftPosition: [number, number, number] = [-distance / 2, 0, 0]
  const rightPosition: [number, number, number] = [distance / 2, 0, 0]
  const leftCloud = leftVisual.cloudRadius
  const rightCloud = rightVisual.cloudRadius
  const regime = classifyInteractionRegime(distance, preset.equilibriumDistance)
  const showClouds = settings.showElectronClouds || settings.visualizationMode === "electron-cloud"
  const showLobes = settings.showOrbitalLobes || settings.visualizationMode === "orbital-lobes"
  const sigmaVisible = showLobes && (interactionType !== "pi" || preset.bondOrder >= 2)
  const piVisible = showLobes && (interactionType === "pi" || overlapType === "p-p-pi")

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.04
    }
  })

  return (
    <>
      <ambientLight intensity={0.65} />
      <directionalLight position={[5, 6, 4]} intensity={1.15} />
      <directionalLight position={[-6, -4, -5]} intensity={0.42} />

      <group ref={groupRef}>
        <ElectronClouds
          leftPosition={leftPosition}
          rightPosition={rightPosition}
          leftCloud={leftCloud}
          rightCloud={rightCloud}
          leftColor={leftVisual.color}
          rightColor={rightVisual.color}
          visible={showClouds}
        />
        <AtomSpheres
          leftPosition={leftPosition}
          rightPosition={rightPosition}
          leftRadius={leftVisual.covalentRadius}
          rightRadius={rightVisual.covalentRadius}
          leftColor={leftVisual.color}
          rightColor={rightVisual.color}
          mode={settings.visualizationMode}
        />
        <SigmaLobes leftX={leftPosition[0]} rightX={rightPosition[0]} overlapType={overlapType} visible={sigmaVisible} />
        <PiLobes leftX={leftPosition[0]} rightX={rightPosition[0]} visible={piVisible} bondOrder={preset.bondOrder} />
        <OverlapRegion
          distance={distance}
          leftCloud={leftCloud}
          rightCloud={rightCloud}
          interactionType={interactionType}
          overlapType={overlapType}
          bondOrder={preset.bondOrder}
          visible={settings.showOverlapRegion}
        />
        {settings.showNuclei && (
          <>
            <Nucleus position={leftPosition} color={leftVisual.nucleusColor} label={preset.atoms[0]} showLabel={settings.showLabels} />
            <Nucleus position={rightPosition} color={rightVisual.nucleusColor} label={preset.atoms[1]} showLabel={settings.showLabels} />
          </>
        )}
        {settings.showBondLengthMarker && <BondLengthMarker distance={distance} />}
      </group>

      {settings.showForceArrows && regime === "attractive" && (
        <>
          <ForceArrow side="left" direction={1} color="#14b8a6" label="attraction" />
          <ForceArrow side="right" direction={-1} color="#14b8a6" label="attraction" />
        </>
      )}
      {settings.showForceArrows && regime === "repulsive" && (
        <>
          <ForceArrow side="left" direction={-1} color="#f97316" label="repulsion" />
          <ForceArrow side="right" direction={1} color="#f97316" label="repulsion" />
        </>
      )}
      {settings.showForceArrows && regime === "equilibrium" && settings.showLabels && (
        <Text position={[0, 1.65, 0]} fontSize={0.18} color="#cbd5e1" anchorX="center" anchorY="middle">
          balanced forces
        </Text>
      )}
    </>
  )
}

interface BondingExplorer3DProps {
  preset: BondPreset
  distance: number
  interactionType: BondInteractionType
  overlapType: OrbitalOverlapType
  settings: BondingViewerSettings
  className?: string
}

export function BondingExplorer3D({
  preset,
  distance,
  interactionType,
  overlapType,
  settings,
  className,
}: BondingExplorer3DProps) {
  const webglSupported = useWebGLSupport()
  const cameraDistance = useMemo(() => Math.max(5.5, distance + 3.8), [distance])
  const controlsRef = useRef<OrbitControlsImpl | null>(null)

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
        <Canvas camera={{ position: [0, 1.6, cameraDistance], fov: 45 }} style={{ background: "transparent" }}>
          <SceneContent
            preset={preset}
            distance={distance}
            interactionType={interactionType}
            overlapType={overlapType}
            settings={settings}
          />
          <OrbitControls ref={controlsRef} enablePan enableZoom enableRotate minDistance={3} maxDistance={11} />
        </Canvas>

        <div className="absolute left-3 top-3 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-white shadow-sm backdrop-blur">
          <p className="text-sm font-semibold">{preset.label}</p>
          <p className="text-xs text-slate-300">{preset.orbitalDescription}</p>
        </div>
        <div className="absolute bottom-3 right-3 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-slate-300 backdrop-blur">
          drag to rotate / scroll to zoom
        </div>
      </div>
    </div>
  )
}
