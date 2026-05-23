"use client"

import { motion } from "framer-motion"

const atoms = [
  { size: 8, x: "10%", y: "20%", delay: 0, duration: 20 },
  { size: 6, x: "85%", y: "15%", delay: 2, duration: 25 },
  { size: 10, x: "75%", y: "70%", delay: 4, duration: 22 },
  { size: 5, x: "20%", y: "80%", delay: 1, duration: 18 },
  { size: 7, x: "50%", y: "30%", delay: 3, duration: 24 },
  { size: 4, x: "30%", y: "60%", delay: 5, duration: 21 },
  { size: 6, x: "90%", y: "45%", delay: 2.5, duration: 19 },
  { size: 8, x: "5%", y: "50%", delay: 1.5, duration: 23 },
]

export function FloatingAtoms() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {atoms.map((atom, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-accent/10"
          style={{
            width: atom.size,
            height: atom.size,
            left: atom.x,
            top: atom.y,
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, 15, 0],
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: atom.duration,
            delay: atom.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
      
      {/* Molecule-like connections */}
      <svg className="absolute inset-0 w-full h-full opacity-5">
        <motion.line
          x1="10%" y1="20%"
          x2="50%" y2="30%"
          stroke="currentColor"
          strokeWidth="1"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.3 }}
          transition={{ duration: 2, delay: 1 }}
        />
        <motion.line
          x1="50%" y1="30%"
          x2="85%" y2="15%"
          stroke="currentColor"
          strokeWidth="1"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.3 }}
          transition={{ duration: 2, delay: 1.5 }}
        />
        <motion.line
          x1="20%" y1="80%"
          x2="30%" y2="60%"
          stroke="currentColor"
          strokeWidth="1"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.3 }}
          transition={{ duration: 2, delay: 2 }}
        />
      </svg>
    </div>
  )
}
