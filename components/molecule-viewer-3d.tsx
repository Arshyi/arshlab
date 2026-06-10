"use client"

import { useEffect, useRef, useState, useMemo } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { OrbitControls, Text, Html } from "@react-three/drei"
import * as THREE from "three"
import { motion, AnimatePresence } from "framer-motion"
import { Eye, EyeOff, Tag, Ruler, Circle, Box, Atom as AtomIcon, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Molecule3D, Atom3D, Bond3D, LonePair } from "@/lib/chemistry/molecules3d"
import { ATOM_COLORS, ATOM_RADII, VDW_RADII, getBondLength } from "@/lib/chemistry/molecules3d"
import { useWebGLSupport, WebGLFallback } from "@/components/webgl-fallback"

interface MoleculeViewer3DProps {
  molecule: Molecule3D
  className?: string
  showLonePairs?: boolean
  onShowLonePairsChange?: (value: boolean) => void
}

type ViewMode = "ball-and-stick" | "space-filling" | "wireframe"

interface ViewerSettings {
  showHydrogens: boolean
  showLonePairs: boolean
  showBondAngles: boolean
  showAtomLabels: boolean
  showBondLengths: boolean
  showDipole: boolean
  viewMode: ViewMode
  /** @deprecated use viewMode === 'space-filling' */
  spaceFillingMode: boolean
}

// Atom sphere component
function AtomSphere({ 
  atom, 
  index,
  showLabel,
  spaceFilling,
  wireframe = false,
  visible = true,
}: { 
  atom: Atom3D
  index: number
  showLabel: boolean
  spaceFilling: boolean
  wireframe?: boolean
  visible?: boolean
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const color = ATOM_COLORS[atom.element] || "#888888"
  const radius = spaceFilling
    ? (VDW_RADII[atom.element] || 1.5) * 0.5
    : (ATOM_RADII[atom.element] || 0.3)
  if (!visible) return null
  
  return (
    <group position={[atom.x, atom.y, atom.z]}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[radius, 32, 32]} />
        <meshStandardMaterial 
          color={color} 
          roughness={0.3}
          metalness={0.1}
          wireframe={wireframe}
        />
      </mesh>
      {showLabel && (
        <Html
          center
          distanceFactor={8}
          style={{
            color: atom.element === "H" ? "#333" : "#fff",
            fontSize: "12px",
            fontWeight: "bold",
            textShadow: "0 1px 2px rgba(0,0,0,0.5)",
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          {atom.element}
        </Html>
      )}
    </group>
  )
}

// Bond cylinder component
function BondCylinder({
  atom1,
  atom2,
  order,
  showLength,
  visible = true,
}: {
  atom1: Atom3D
  atom2: Atom3D
  order: 1 | 2 | 3
  showLength: boolean
  visible?: boolean
}) {
  if (!visible) return null
  
  const start = new THREE.Vector3(atom1.x, atom1.y, atom1.z)
  const end = new THREE.Vector3(atom2.x, atom2.y, atom2.z)
  const direction = new THREE.Vector3().subVectors(end, start)
  const length = direction.length()
  const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5)
  
  // Calculate rotation to point cylinder from start to end
  const quaternion = new THREE.Quaternion()
  const up = new THREE.Vector3(0, 1, 0)
  quaternion.setFromUnitVectors(up, direction.clone().normalize())
  
  const bondRadius = 0.08
  const spacing = 0.2
  
  // Generate bond positions for double/triple bonds
  const bondPositions: THREE.Vector3[] = []
  if (order === 1) {
    bondPositions.push(new THREE.Vector3(0, 0, 0))
  } else if (order === 2) {
    // Perpendicular offset for double bond
    const perpendicular = new THREE.Vector3(1, 0, 0)
    if (Math.abs(direction.x) > 0.9) {
      perpendicular.set(0, 1, 0)
    }
    const offset = new THREE.Vector3().crossVectors(direction, perpendicular).normalize().multiplyScalar(spacing / 2)
    bondPositions.push(offset)
    bondPositions.push(offset.clone().negate())
  } else if (order === 3) {
    bondPositions.push(new THREE.Vector3(0, 0, 0))
    const perpendicular = new THREE.Vector3(1, 0, 0)
    if (Math.abs(direction.x) > 0.9) {
      perpendicular.set(0, 1, 0)
    }
    const offset = new THREE.Vector3().crossVectors(direction, perpendicular).normalize().multiplyScalar(spacing)
    bondPositions.push(offset)
    bondPositions.push(offset.clone().negate())
  }
  
  const bondLengthText = getBondLength(atom1.element, atom2.element, order)
  
  return (
    <group>
      {bondPositions.map((offset, i) => (
        <mesh
          key={i}
          position={[midpoint.x + offset.x, midpoint.y + offset.y, midpoint.z + offset.z]}
          quaternion={quaternion}
        >
          <cylinderGeometry args={[bondRadius, bondRadius, length, 16]} />
          <meshStandardMaterial color="#666666" roughness={0.5} />
        </mesh>
      ))}
      {showLength && (
        <Html
          position={[midpoint.x, midpoint.y + 0.3, midpoint.z]}
          center
          distanceFactor={10}
          style={{
            color: "#888",
            fontSize: "10px",
            fontFamily: "monospace",
            pointerEvents: "none",
            userSelect: "none",
            whiteSpace: "nowrap",
          }}
        >
          {bondLengthText}
        </Html>
      )}
    </group>
  )
}

// Lone pair visualization
function LonePairDots({
  atom,
  count,
  visible = true,
}: {
  atom: Atom3D
  count: number
  visible?: boolean
}) {
  if (!visible || count === 0) return null
  
  const dotRadius = 0.1
  const distance = 0.6
  
  // Position lone pairs opposite to likely bonding directions
  // This is approximate - real placement would need bond analysis
  const positions: [number, number, number][] = []
  
  if (count >= 1) {
    positions.push([atom.x, atom.y + distance, atom.z + 0.15])
    positions.push([atom.x, atom.y + distance, atom.z - 0.15])
  }
  if (count >= 2) {
    positions.push([atom.x, atom.y + distance * 0.7, atom.z + distance * 0.7])
    positions.push([atom.x, atom.y + distance * 0.7, atom.z + distance * 0.7 - 0.3])
  }
  
  return (
    <group>
      {positions.slice(0, count * 2).map((pos, i) => (
        <mesh key={i} position={pos}>
          <sphereGeometry args={[dotRadius, 16, 16]} />
          <meshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={0.3} />
        </mesh>
      ))}
    </group>
  )
}

// Bond angle arc visualization
function BondAngleArc({
  atoms,
  allAtoms,
  angle,
  visible = true,
}: {
  atoms: [number, number, number]
  allAtoms: Atom3D[]
  angle: string
  visible?: boolean
}) {
  if (!visible) return null
  
  const [i1, center, i2] = atoms
  const a1 = allAtoms[i1]
  const ac = allAtoms[center]
  const a2 = allAtoms[i2]
  
  if (!a1 || !ac || !a2) return null
  
  const v1 = new THREE.Vector3(a1.x - ac.x, a1.y - ac.y, a1.z - ac.z).normalize()
  const v2 = new THREE.Vector3(a2.x - ac.x, a2.y - ac.y, a2.z - ac.z).normalize()
  
  // Create arc points
  const arcRadius = 0.5
  const numPoints = 20
  const points: THREE.Vector3[] = []
  
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints
    const interpolated = new THREE.Vector3().lerpVectors(v1, v2, t).normalize().multiplyScalar(arcRadius)
    points.push(new THREE.Vector3(ac.x + interpolated.x, ac.y + interpolated.y, ac.z + interpolated.z))
  }
  
  const midpoint = new THREE.Vector3().lerpVectors(v1, v2, 0.5).normalize().multiplyScalar(arcRadius * 1.3)
  
  return (
    <group>
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={points.length}
            array={new Float32Array(points.flatMap(p => [p.x, p.y, p.z]))}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#22c55e" linewidth={2} />
      </line>
      <Html
        position={[ac.x + midpoint.x, ac.y + midpoint.y, ac.z + midpoint.z]}
        center
        distanceFactor={10}
        style={{
          color: "#22c55e",
          fontSize: "11px",
          fontWeight: "500",
          fontFamily: "monospace",
          pointerEvents: "none",
          userSelect: "none",
          background: "rgba(0,0,0,0.5)",
          padding: "2px 6px",
          borderRadius: "4px",
        }}
      >
        {angle}
      </Html>
    </group>
  )
}

// Auto-rotate the molecule slightly
function AutoRotate({ children }: { children: React.ReactNode }) {
  const groupRef = useRef<THREE.Group>(null)
  
  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.2
    }
  })
  
  return <group ref={groupRef}>{children}</group>
}

// Main 3D scene
function MoleculeScene({ 
  molecule, 
  settings,
}: { 
  molecule: Molecule3D
  settings: ViewerSettings
}) {
  const {
    showHydrogens,
    showLonePairs,
    showBondAngles,
    showAtomLabels,
    showBondLengths,
    showDipole,
    viewMode,
    spaceFillingMode,
  } = settings
  const spaceFilling = viewMode === "space-filling" || spaceFillingMode
  const wireframe = viewMode === "wireframe"
  
  // Filter atoms based on hydrogen visibility
  const visibleAtomIndices = useMemo(() => {
    return molecule.atoms.map((atom, i) => ({
      index: i,
      visible: showHydrogens || atom.element !== "H"
    }))
  }, [molecule.atoms, showHydrogens])
  
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <directionalLight position={[-10, -10, -5]} intensity={0.3} />
      
      <AutoRotate>
        {/* Atoms */}
        {molecule.atoms.map((atom, i) => (
          <AtomSphere
            key={`atom-${i}`}
            atom={atom}
            index={i}
            showLabel={showAtomLabels}
            spaceFilling={spaceFilling}
            wireframe={wireframe}
            visible={visibleAtomIndices[i].visible}
          />
        ))}
        
        {/* Bonds */}
        {showDipole && (
          <group>
            <mesh position={[0, 0, 0.6]}>
              <cylinderGeometry args={[0.04, 0.04, 1.2, 8]} />
              <meshBasicMaterial color="#f97316" />
            </mesh>
            <mesh position={[0, 0, 1.3]}>
              <coneGeometry args={[0.12, 0.25, 8]} />
              <meshBasicMaterial color="#f97316" />
            </mesh>
          </group>
        )}

        {!spaceFilling && molecule.bonds.map((bond, i) => {
          const atom1 = molecule.atoms[bond.a]
          const atom2 = molecule.atoms[bond.b]
          const visible = (showHydrogens || atom1.element !== "H") && (showHydrogens || atom2.element !== "H")
          
          return (
            <BondCylinder
              key={`bond-${i}`}
              atom1={atom1}
              atom2={atom2}
              order={bond.order}
              showLength={showBondLengths}
              visible={visible}
            />
          )
        })}
        
        {/* Lone Pairs */}
        {showLonePairs && molecule.lonePairs.map((lp, i) => (
          <LonePairDots
            key={`lp-${i}`}
            atom={molecule.atoms[lp.atomIndex]}
            count={lp.count}
            visible={true}
          />
        ))}
        
        {/* Bond Angles */}
        {showBondAngles && molecule.bondAngles.slice(0, 3).map((ba, i) => (
          <BondAngleArc
            key={`angle-${i}`}
            atoms={ba.atoms}
            allAtoms={molecule.atoms}
            angle={ba.angle}
            visible={true}
          />
        ))}
      </AutoRotate>
      
      <OrbitControls 
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={3}
        maxDistance={20}
      />
    </>
  )
}

// Control toggle button
function ControlButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: React.ElementType
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className={cn(
        "h-8 gap-1.5 text-xs",
        active && "bg-accent text-accent-foreground border-accent"
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </Button>
  )
}

// Loading animation
function LoadingAnimation() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 flex flex-col items-center justify-center bg-secondary/50 backdrop-blur-sm rounded-xl z-10"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      >
        <Loader2 className="h-8 w-8 text-accent" />
      </motion.div>
      <p className="mt-3 text-sm text-muted-foreground">Generating 3D structure...</p>
    </motion.div>
  )
}

export function MoleculeViewer3D({
  molecule,
  className,
  showLonePairs: showLonePairsProp,
  onShowLonePairsChange,
}: MoleculeViewer3DProps) {
  const webglSupported = useWebGLSupport()
  const [isLoading, setIsLoading] = useState(true)
  const [settings, setSettings] = useState<ViewerSettings>({
    showHydrogens: true,
    showLonePairs: showLonePairsProp ?? false,
    showBondAngles: false,
    showAtomLabels: true,
    showBondLengths: false,
    showDipole: false,
    viewMode: "ball-and-stick",
    spaceFillingMode: false,
  })

  const showLonePairs = showLonePairsProp ?? settings.showLonePairs
  const viewerSettings = { ...settings, showLonePairs }
  
  useEffect(() => {
    setIsLoading(true)
    const timer = setTimeout(() => setIsLoading(false), 800)
    return () => clearTimeout(timer)
  }, [molecule.name])
  
  const toggleSetting = (key: keyof ViewerSettings) => {
    if (key === "showLonePairs" && onShowLonePairsChange) {
      onShowLonePairsChange(!showLonePairs)
      return
    }
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  if (webglSupported === false) {
    return (
      <div className={cn("relative", className)}>
        <WebGLFallback className="aspect-square" />
      </div>
    )
  }
  
  return (
    <div className={cn("relative", className)}>
      {/* 3D Canvas */}
      <div className="relative aspect-square w-full rounded-xl border border-border bg-gradient-to-b from-secondary/30 to-secondary/60 overflow-hidden">
        <AnimatePresence>
          {isLoading && <LoadingAnimation />}
        </AnimatePresence>
        
        <Canvas
          camera={{ position: [0, 0, 8], fov: 50 }}
          style={{ background: "transparent" }}
          onCreated={() => setTimeout(() => setIsLoading(false), 500)}
        >
          <MoleculeScene molecule={molecule} settings={viewerSettings} />
        </Canvas>
        
        {/* Molecule name overlay */}
        <div className="absolute top-3 left-3 bg-background/80 backdrop-blur-sm rounded-lg px-3 py-1.5">
          <p className="text-sm font-medium text-foreground capitalize">{molecule.name}</p>
          <p className="text-xs text-muted-foreground font-mono">{molecule.formula}</p>
        </div>
      </div>
      
      {/* Controls */}
      <div className="mt-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          <ControlButton
            icon={settings.showHydrogens ? Eye : EyeOff}
            label="Hydrogens"
            active={settings.showHydrogens}
            onClick={() => toggleSetting("showHydrogens")}
          />
          <ControlButton
            icon={Circle}
            label="Lone Pairs"
            active={showLonePairs}
            onClick={() => toggleSetting("showLonePairs")}
          />
          <ControlButton
            icon={AtomIcon}
            label="Bond Angles"
            active={settings.showBondAngles}
            onClick={() => toggleSetting("showBondAngles")}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <ControlButton
            icon={Tag}
            label="Atom Labels"
            active={settings.showAtomLabels}
            onClick={() => toggleSetting("showAtomLabels")}
          />
          <ControlButton
            icon={Ruler}
            label="Bond Lengths"
            active={settings.showBondLengths}
            onClick={() => toggleSetting("showBondLengths")}
          />
          <ControlButton
            icon={Box}
            label="Space-Filling"
            active={viewerSettings.viewMode === "space-filling"}
            onClick={() =>
              setSettings((prev) => ({
                ...prev,
                viewMode: prev.viewMode === "space-filling" ? "ball-and-stick" : "space-filling",
                spaceFillingMode: prev.viewMode !== "space-filling",
              }))
            }
          />
          <ControlButton
            icon={Circle}
            label="Wireframe"
            active={viewerSettings.viewMode === "wireframe"}
            onClick={() =>
              setSettings((prev) => ({
                ...prev,
                viewMode: prev.viewMode === "wireframe" ? "ball-and-stick" : "wireframe",
              }))
            }
          />
        </div>
      </div>
      
      {/* Disclaimer */}
      <p className="mt-4 text-xs text-muted-foreground text-center">
        These 3D structures are approximate educational models. Future versions will use proper conformer generation.
      </p>
    </div>
  )
}
