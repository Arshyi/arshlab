"use client"

import { useRef, useMemo, useEffect } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { OrbitControls, Text, Grid, Html } from "@react-three/drei"
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib"
import * as THREE from "three"
import type { OrbitalData } from "@/data/orbitals"
import {
  getLobeLayout,
  getRadialNodeRadii,
  getAngularNodeSurfaces,
  getOrbitalScale,
  PHASE_POSITIVE,
  PHASE_NEGATIVE,
  RADIAL_NODE_COLOR,
  ANGULAR_NODE_COLOR,
  type LobeSpec,
} from "@/lib/orbitalMath"
import { useWebGLSupport, WebGLFallback } from "@/components/webgl-fallback"

export type OrbitalViewerSettings = {
  showPhaseColors: boolean
  showRadialNodes: boolean
  showAngularNodes: boolean
  showNodeAsymptotes: boolean
  showAxes: boolean
  showNucleus: boolean
  showLabels: boolean
  showWireframe: boolean
  showDensityShell: boolean
  autoRotate: boolean
}

export const DEFAULT_ORBITAL_SETTINGS: OrbitalViewerSettings = {
  showPhaseColors: true,
  showRadialNodes: true,
  showAngularNodes: true,
  showNodeAsymptotes: true,
  showAxes: true,
  showNucleus: true,
  showLabels: true,
  showWireframe: false,
  showDensityShell: true,
  autoRotate: false,
}

function Nucleus({ visible }: { visible: boolean }) {
  if (!visible) return null
  return (
    <mesh>
      <sphereGeometry args={[0.12, 24, 24]} />
      <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.4} roughness={0.2} />
    </mesh>
  )
}

function CoordinateAxes({ visible }: { visible: boolean }) {
  if (!visible) return null
  const len = 3.2
  const axisProps = [
    { dir: [len, 0, 0] as const, color: "#ef4444", label: "x" },
    { dir: [0, len, 0] as const, color: "#22c55e", label: "y" },
    { dir: [0, 0, len] as const, color: "#3b82f6", label: "z" },
  ]

  return (
    <group>
      {axisProps.map(({ dir, color, label }) => {
        const isX = label === "x"
        const isY = label === "y"
        return (
          <group key={label}>
            <mesh
              position={[dir[0] / 2, dir[1] / 2, dir[2] / 2]}
              rotation={isX ? [0, 0, -Math.PI / 2] : isY ? [0, 0, 0] : [Math.PI / 2, 0, 0]}
            >
              <cylinderGeometry args={[0.02, 0.02, len, 8]} />
              <meshBasicMaterial color={color} />
            </mesh>
            <Text
              position={[dir[0] * 1.05, dir[1] * 1.05, dir[2] * 1.05]}
              fontSize={0.22}
              color={color}
              anchorX="center"
              anchorY="middle"
            >
              {label}
            </Text>
          </group>
        )
      })}
    </group>
  )
}

function OrbitalLobe({
  lobe,
  showPhase,
  wireframe,
}: {
  lobe: LobeSpec
  showPhase: boolean
  wireframe: boolean
}) {
  const color = showPhase ? (lobe.phase > 0 ? PHASE_POSITIVE : PHASE_NEGATIVE) : "#64748b"
  return (
    <mesh position={lobe.position} scale={lobe.scale}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshStandardMaterial
        color={color}
        transparent
        opacity={0.62}
        roughness={0.35}
        metalness={0.05}
        wireframe={wireframe}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  )
}

function OrbitalTorus({
  torus,
  showPhase,
  wireframe,
}: {
  torus: NonNullable<ReturnType<typeof getLobeLayout>["torus"]>
  showPhase: boolean
  wireframe: boolean
}) {
  const color = showPhase ? (torus.phase > 0 ? PHASE_POSITIVE : PHASE_NEGATIVE) : "#64748b"
  return (
    <mesh position={torus.position} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[torus.radius, torus.tube, 24, 48]} />
      <meshStandardMaterial
        color={color}
        transparent
        opacity={0.58}
        roughness={0.35}
        wireframe={wireframe}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  )
}

function DensityShell({ orbital, visible }: { orbital: OrbitalData; visible: boolean }) {
  if (!visible) return null
  const radius = getOrbitalScale(orbital.n) * 1.55
  return (
    <mesh>
      <sphereGeometry args={[radius, 32, 32]} />
      <meshStandardMaterial
        color="#94a3b8"
        transparent
        opacity={0.08}
        wireframe={false}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  )
}

function RadialNodeShell({
  radius,
  visible,
  showAsymptote,
}: {
  radius: number
  visible: boolean
  showAsymptote: boolean
}) {
  if (!visible && !showAsymptote) return null

  return (
    <group>
      {visible && (
        <mesh>
          <sphereGeometry args={[radius, 32, 32]} />
          <meshBasicMaterial
            color={RADIAL_NODE_COLOR}
            transparent
            opacity={0.12}
            wireframe
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
      {showAsymptote && (
        <>
          <mesh>
            <sphereGeometry args={[radius, 32, 32]} />
            <meshStandardMaterial
              color={RADIAL_NODE_COLOR}
              transparent
              opacity={0.06}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
          <Html position={[radius + 0.15, 0.2, 0]} distanceFactor={8} style={{ pointerEvents: "none" }}>
            <span className="rounded bg-background/80 px-1.5 py-0.5 text-[10px] font-medium text-purple-600">
              radial node
            </span>
          </Html>
        </>
      )}
    </group>
  )
}

function AngularNodePlane({
  normal,
  visible,
  showAsymptote,
  label,
  size,
}: {
  normal: [number, number, number]
  visible: boolean
  showAsymptote: boolean
  label: string
  size: number
}) {
  if (!visible && !showAsymptote) return null

  const n = new THREE.Vector3(...normal).normalize()
  const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n)

  return (
    <group quaternion={quaternion}>
      {showAsymptote && (
        <Grid
          args={[size * 2, size * 2]}
          cellSize={size / 5}
          cellThickness={0.6}
          cellColor={ANGULAR_NODE_COLOR}
          sectionSize={size / 2.5}
          sectionThickness={1.2}
          sectionColor={ANGULAR_NODE_COLOR}
          fadeDistance={size * 3}
          fadeStrength={1}
          infiniteGrid={false}
          position={[0, 0, 0]}
        />
      )}
      {visible && !showAsymptote && (
        <mesh>
          <planeGeometry args={[size * 2, size * 2]} />
          <meshStandardMaterial
            color={ANGULAR_NODE_COLOR}
            transparent
            opacity={0.12}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}
      {showAsymptote && (
        <Html position={[size * 0.6, size * 0.6, 0.01]} distanceFactor={8} style={{ pointerEvents: "none" }}>
          <span className="rounded bg-background/80 px-1.5 py-0.5 text-[10px] font-medium text-green-600">
            {label}
          </span>
        </Html>
      )}
    </group>
  )
}

function OrbitalLabel({ orbital, visible }: { orbital: OrbitalData; visible: boolean }) {
  if (!visible) return null
  const y = getOrbitalScale(orbital.n) * 1.7
  return (
    <Text position={[0, y, 0]} fontSize={0.35} color="#e2e8f0" anchorX="center" anchorY="middle">
      {orbital.label}
    </Text>
  )
}

function CameraResetter({
  resetToken,
  controlsRef,
}: {
  resetToken: number
  controlsRef: React.RefObject<OrbitControlsImpl | null>
}) {
  const { camera } = useThree()

  useEffect(() => {
    if (resetToken === 0) return
    camera.position.set(0, 1.5, 7.5)
    camera.lookAt(0, 0, 0)
    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0, 0)
      controlsRef.current.update()
    }
  }, [resetToken, camera, controlsRef])

  return null
}

function SceneContent({
  orbital,
  settings,
  controlsRef,
  resetToken,
}: {
  orbital: OrbitalData
  settings: OrbitalViewerSettings
  controlsRef: React.RefObject<OrbitControlsImpl | null>
  resetToken: number
}) {
  const groupRef = useRef<THREE.Group>(null)
  const layout = useMemo(() => getLobeLayout(orbital), [orbital])
  const radialRadii = useMemo(() => getRadialNodeRadii(orbital.n, orbital.l), [orbital])
  const angularSurfaces = useMemo(() => getAngularNodeSurfaces(orbital), [orbital])
  const nodePlaneSize = getOrbitalScale(orbital.n) * 1.4

  useFrame((_, delta) => {
    if (settings.autoRotate && groupRef.current) {
      groupRef.current.rotation.y += delta * 0.35
    }
  })

  const showRadial = settings.showRadialNodes || settings.showNodeAsymptotes
  const showAngular = settings.showAngularNodes || settings.showNodeAsymptotes

  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[8, 10, 6]} intensity={1.1} />
      <directionalLight position={[-6, -4, -8]} intensity={0.35} />

      <Nucleus visible={settings.showNucleus} />
      <CoordinateAxes visible={settings.showAxes} />

      <group ref={groupRef}>
        <DensityShell orbital={orbital} visible={settings.showDensityShell} />

        {layout.lobes.map((lobe, i) => (
          <OrbitalLobe
            key={`lobe-${i}`}
            lobe={lobe}
            showPhase={settings.showPhaseColors}
            wireframe={settings.showWireframe}
          />
        ))}

        {layout.torus && (
          <OrbitalTorus
            torus={layout.torus}
            showPhase={settings.showPhaseColors}
            wireframe={settings.showWireframe}
          />
        )}

        {showRadial &&
          radialRadii.map((r, i) => (
            <RadialNodeShell
              key={`radial-${i}`}
              radius={r}
              visible={settings.showRadialNodes}
              showAsymptote={settings.showNodeAsymptotes}
            />
          ))}

        {showAngular &&
          angularSurfaces.map((surface, i) => (
            <AngularNodePlane
              key={`angular-${i}`}
              normal={surface.normal}
              visible={settings.showAngularNodes}
              showAsymptote={settings.showNodeAsymptotes}
              label={surface.label}
              size={nodePlaneSize}
            />
          ))}

        <OrbitalLabel orbital={orbital} visible={settings.showLabels} />
      </group>

      <OrbitControls ref={controlsRef} enablePan enableZoom enableRotate minDistance={2} maxDistance={18} />
      <CameraResetter resetToken={resetToken} controlsRef={controlsRef} />
    </>
  )
}

interface OrbitalViewer3DProps {
  orbital: OrbitalData
  settings: OrbitalViewerSettings
  resetToken?: number
  className?: string
}

export function OrbitalViewer3D({ orbital, settings, resetToken = 0, className }: OrbitalViewer3DProps) {
  const webglSupported = useWebGLSupport()
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
      <div className="relative aspect-[4/3] w-full min-h-[320px] rounded-xl border border-border bg-gradient-to-b from-secondary/30 to-secondary/60 overflow-hidden lg:aspect-square">
        <Canvas camera={{ position: [0, 1.5, 7.5], fov: 45 }} style={{ background: "transparent" }}>
          <SceneContent
            orbital={orbital}
            settings={settings}
            controlsRef={controlsRef}
            resetToken={resetToken}
          />
        </Canvas>

        <div className="absolute top-3 left-3 rounded-lg bg-background/80 px-3 py-1.5 backdrop-blur-sm">
          <p className="text-sm font-medium text-foreground">{orbital.label}</p>
          <p className="text-xs text-muted-foreground font-mono">
            n={orbital.n}, l={orbital.l}
          </p>
        </div>
      </div>
    </div>
  )
}

export function PhaseLegend() {
  const items = [
    { color: "#3b82f6", label: "Positive phase (+ψ)" },
    { color: "#f97316", label: "Negative phase (−ψ)" },
    { color: "#a855f7", label: "Radial node", dashed: true },
    { color: "#22c55e", label: "Angular node", plane: true },
  ]

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2 rounded-lg border border-border bg-card/50 px-2.5 py-2">
          <div
            className="h-4 w-4 shrink-0 rounded-full border border-border"
            style={{
              backgroundColor: item.plane ? "transparent" : item.color,
              borderColor: item.dashed || item.plane ? item.color : undefined,
              borderStyle: item.dashed ? "dashed" : item.plane ? "solid" : undefined,
              borderWidth: item.plane ? 2 : undefined,
              opacity: item.plane ? 0.5 : 0.85,
            }}
          />
          <span className="text-xs text-muted-foreground">{item.label}</span>
        </div>
      ))}
    </div>
  )
}
