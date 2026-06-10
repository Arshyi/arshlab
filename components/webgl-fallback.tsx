"use client"

import { useEffect, useState } from "react"
import { AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

export function useWebGLSupport() {
  const [supported, setSupported] = useState<boolean | null>(null)

  useEffect(() => {
    try {
      const canvas = document.createElement("canvas")
      const hasWebGL =
        typeof window !== "undefined" &&
        Boolean(
          window.WebGLRenderingContext &&
            (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")),
        )
      setSupported(hasWebGL)
    } catch {
      setSupported(false)
    }
  }, [])

  return supported
}

export function WebGLFallback({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-secondary/30 p-6 text-center",
        className,
      )}
      role="status"
    >
      <AlertTriangle className="mb-3 h-8 w-8 text-muted-foreground" />
      <p className="max-w-sm text-sm font-medium text-foreground">
        3D visualization requires WebGL support.
      </p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Try another browser or device.
      </p>
    </div>
  )
}
