"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { AlertCircle, Camera, CameraOff, Check, RefreshCcw, ShieldCheck } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

type CameraStatus = "idle" | "requesting" | "preview" | "captured" | "accepted" | "unsupported" | "error"

export function CameraCapture({ onSnapshotAccepted }: { onSnapshotAccepted: (file: File) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const snapshotUrlRef = useRef<string | null>(null)
  const [status, setStatus] = useState<CameraStatus>("idle")
  const [error, setError] = useState<string | null>(null)
  const [snapshot, setSnapshot] = useState<File | null>(null)
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null)
  const [cameraActive, setCameraActive] = useState(false)

  const releaseSnapshotUrl = useCallback(() => {
    if (snapshotUrlRef.current) URL.revokeObjectURL(snapshotUrlRef.current)
    snapshotUrlRef.current = null
    setSnapshotUrl(null)
  }, [])

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setCameraActive(false)
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  const stopCamera = useCallback(() => {
    stopTracks()
    setStatus((current) => current === "captured" || current === "accepted" ? current : "idle")
  }, [stopTracks])

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop())
      if (snapshotUrlRef.current) URL.revokeObjectURL(snapshotUrlRef.current)
    }
  }, [])

  async function requestCamera() {
    setError(null)
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("unsupported")
      setError("Camera capture is not supported by this browser or requires a secure connection.")
      return
    }

    stopTracks()
    setStatus("requesting")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      })
      streamRef.current = stream
      setCameraActive(true)
      const video = videoRef.current
      if (!video) {
        stopTracks()
        throw new Error("The camera preview could not be initialized.")
      }
      video.srcObject = stream
      await video.play()
      setStatus("preview")
    } catch (cameraError) {
      stopTracks()
      setStatus("error")
      const name = cameraError instanceof DOMException ? cameraError.name : ""
      if (name === "NotAllowedError" || name === "SecurityError") {
        setError("Camera permission was denied. Allow camera access in your browser settings or use Upload Image.")
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        setError("No available camera was found on this device.")
      } else if (name === "NotReadableError" || name === "TrackStartError") {
        setError("The camera is already in use or could not be started. Close other camera apps and try again.")
      } else {
        setError(cameraError instanceof Error ? cameraError.message : "The camera could not be started.")
      }
    }
  }

  function captureSnapshot() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.videoWidth <= 0 || video.videoHeight <= 0) {
      setError("The camera is still preparing. Wait a moment, then capture again.")
      return
    }

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const context = canvas.getContext("2d")
    if (!context) {
      setError("This browser could not create a local snapshot canvas.")
      return
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob((blob) => {
      if (!blob) {
        setError("The browser could not create a camera snapshot.")
        return
      }
      releaseSnapshotUrl()
      const file = new File([blob], `arshlab-camera-${Date.now()}.jpg`, {
        type: "image/jpeg",
        lastModified: Date.now(),
      })
      const nextUrl = URL.createObjectURL(file)
      snapshotUrlRef.current = nextUrl
      setSnapshot(file)
      setSnapshotUrl(nextUrl)
      setStatus("captured")
      video.pause()
    }, "image/jpeg", 0.92)
  }

  async function retake() {
    releaseSnapshotUrl()
    setSnapshot(null)
    setError(null)
    if (streamRef.current?.getVideoTracks().some((track) => track.readyState === "live")) {
      await videoRef.current?.play()
      setStatus("preview")
    } else {
      await requestCamera()
    }
  }

  function useSnapshot() {
    if (!snapshot) return
    onSnapshotAccepted(snapshot)
    stopTracks()
    setStatus("accepted")
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold">Camera snapshot workspace</p>
          <p className="text-sm text-muted-foreground">Rear camera is preferred when the browser can provide it.</p>
        </div>
        <Badge variant="outline" className="rounded-full">Snapshot only</Badge>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-border bg-slate-950" style={{ aspectRatio: "4 / 3" }}>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          aria-label="Live camera preview for a chemistry structure snapshot"
          className={cnCameraPreview(status === "preview")}
        />
        {snapshotUrl && (status === "captured" || status === "accepted") && (
          <img src={snapshotUrl} alt="Captured chemistry structure snapshot" className="h-full w-full object-contain" />
        )}
        {!snapshotUrl && status !== "preview" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-slate-300">
            {status === "requesting" ? <Camera className="h-8 w-8 animate-pulse" /> : <CameraOff className="h-8 w-8" />}
            <p className="text-sm">
              {status === "requesting" ? "Waiting for camera permission..." : "Camera preview has not started."}
            </p>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

      <div className="sticky bottom-2 z-10 flex flex-wrap gap-2 rounded-xl border border-border bg-background/95 p-3 shadow-sm backdrop-blur">
        {(status === "idle" || status === "unsupported" || status === "error") && (
          <Button type="button" onClick={() => void requestCamera()}>
            <Camera className="h-4 w-4" />
            Request Camera Permission
          </Button>
        )}
        {status === "preview" && (
          <Button type="button" onClick={captureSnapshot}>
            <Camera className="h-4 w-4" />
            Capture Snapshot
          </Button>
        )}
        {(status === "captured" || status === "accepted") && (
          <Button type="button" variant="outline" onClick={() => void retake()}>
            <RefreshCcw className="h-4 w-4" />
            Retake
          </Button>
        )}
        {status === "captured" && (
          <Button type="button" onClick={useSnapshot}>
            <Check className="h-4 w-4" />
            Use Snapshot
          </Button>
        )}
        {cameraActive && (
          <Button type="button" variant="destructive" onClick={stopCamera}>
            <CameraOff className="h-4 w-4" />
            Stop Camera
          </Button>
        )}
      </div>

      {status === "accepted" && (
        <Alert className="rounded-xl border-teal-500/30 bg-teal-500/10">
          <Check className="h-4 w-4" />
          <AlertTitle>Snapshot sent to the local scanner</AlertTitle>
          <AlertDescription>Use the preprocessing preview above, then run OCR and matching normally.</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert className="rounded-xl border-amber-500/30 bg-amber-500/10">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Camera unavailable</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-start gap-2 rounded-xl border border-teal-500/20 bg-teal-500/5 p-4 text-sm text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
        <p>Camera frames stay in your browser. ARSHLAB does not record video, upload images, or permanently store camera snapshots.</p>
      </div>
    </div>
  )
}

function cnCameraPreview(visible: boolean): string {
  return visible
    ? "h-full w-full object-contain"
    : "pointer-events-none absolute h-px w-px opacity-0"
}
