"use client"

import { useEffect, useRef, useState } from "react"
import {
  Contrast,
  Crop,
  ImageIcon,
  RefreshCcw,
  RotateCcw,
  RotateCw,
  ShieldCheck,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"

interface StructurePreviewProps {
  previewUrl: string | null
  fileName: string | null
  onClear?: () => void
}

interface PreviewSettings {
  rotation: number
  zoom: number
  offsetX: number
  offsetY: number
  contrast: number
  grayscale: boolean
}

const DEFAULT_SETTINGS: PreviewSettings = {
  rotation: 0,
  zoom: 100,
  offsetX: 0,
  offsetY: 0,
  contrast: 100,
  grayscale: false,
}

export function StructurePreview({ previewUrl, fileName, onClear }: StructurePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [settings, setSettings] = useState<PreviewSettings>(DEFAULT_SETTINGS)

  useEffect(() => {
    setSettings(DEFAULT_SETTINGS)
  }, [previewUrl])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !previewUrl) return

    const context = canvas.getContext("2d")
    if (!context) return

    const image = new Image()
    image.onload = () => {
      const width = canvas.width
      const height = canvas.height
      const quarterTurn = Math.abs(settings.rotation % 180) === 90
      const rotatedWidth = quarterTurn ? image.naturalHeight : image.naturalWidth
      const rotatedHeight = quarterTurn ? image.naturalWidth : image.naturalHeight
      const baseScale = Math.min(width / rotatedWidth, height / rotatedHeight)
      const scale = baseScale * (settings.zoom / 100)

      context.save()
      context.clearRect(0, 0, width, height)
      context.fillStyle = "#ffffff"
      context.fillRect(0, 0, width, height)
      context.translate(
        width / 2 + (settings.offsetX / 100) * width * 0.28,
        height / 2 + (settings.offsetY / 100) * height * 0.28,
      )
      context.rotate((settings.rotation * Math.PI) / 180)
      context.filter = `${settings.grayscale ? "grayscale(1)" : "grayscale(0)"} contrast(${settings.contrast}%)`
      context.drawImage(
        image,
        (-image.naturalWidth * scale) / 2,
        (-image.naturalHeight * scale) / 2,
        image.naturalWidth * scale,
        image.naturalHeight * scale,
      )
      context.restore()
    }
    image.src = previewUrl

    return () => {
      image.onload = null
    }
  }, [previewUrl, settings])

  function updateSetting<Key extends keyof PreviewSettings>(key: Key, value: PreviewSettings[Key]) {
    setSettings((current) => ({ ...current, [key]: value }))
  }

  function rotateBy(degrees: number) {
    setSettings((current) => ({ ...current, rotation: (current.rotation + degrees + 360) % 360 }))
  }

  return (
    <Card className="overflow-hidden rounded-2xl border-dashed">
      <CardContent className="p-0">
        <div className="relative flex min-h-[260px] items-center justify-center overflow-hidden bg-secondary/30 sm:min-h-[340px]">
          {previewUrl ? (
            <canvas
              ref={canvasRef}
              width={900}
              height={600}
              role="img"
              aria-label={fileName ? `Preprocessed structure preview for ${fileName}` : "Preprocessed structure preview"}
              className="h-auto max-h-[480px] w-full object-contain"
            />
          ) : (
            <div className="flex flex-col items-center gap-3 p-8 text-center text-muted-foreground">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-background">
                <ImageIcon className="h-7 w-7" />
              </div>
              <div>
                <p className="font-medium text-foreground">Upload a structure image to begin</p>
                <p className="mt-1 text-sm">PNG, JPG, JPEG, or WEBP. Live camera is not enabled.</p>
              </div>
            </div>
          )}
          {previewUrl && onClear && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClear}
              className="absolute right-3 top-3 rounded-full"
            >
              <X className="h-4 w-4" />
              Clear
            </Button>
          )}
        </div>

        {previewUrl && (
          <div className="space-y-5 border-t border-border bg-background p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">Image preprocessing preview</p>
                <p className="text-sm text-muted-foreground">Adjust the local preview before matching.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => rotateBy(-90)}>
                  <RotateCcw className="h-4 w-4" />
                  Left
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => rotateBy(90)}>
                  <RotateCw className="h-4 w-4" />
                  Right
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setSettings(DEFAULT_SETTINGS)}>
                  <RefreshCcw className="h-4 w-4" />
                  Reset
                </Button>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <PreviewSlider
                icon={Crop}
                label="Crop / zoom"
                value={settings.zoom}
                min={100}
                max={220}
                suffix="%"
                onChange={(value) => updateSetting("zoom", value)}
              />
              <PreviewSlider
                icon={Contrast}
                label="Contrast"
                value={settings.contrast}
                min={60}
                max={180}
                suffix="%"
                onChange={(value) => updateSetting("contrast", value)}
              />
              <PreviewSlider
                icon={Crop}
                label="Horizontal crop position"
                value={settings.offsetX}
                min={-100}
                max={100}
                onChange={(value) => updateSetting("offsetX", value)}
              />
              <PreviewSlider
                icon={Crop}
                label="Vertical crop position"
                value={settings.offsetY}
                min={-100}
                max={100}
                onChange={(value) => updateSetting("offsetY", value)}
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
              <div>
                <Label htmlFor="scanner-grayscale" className="font-medium">Grayscale</Label>
                <p className="text-xs text-muted-foreground">Reduce color noise in photographed structures.</p>
              </div>
              <Switch
                id="scanner-grayscale"
                checked={settings.grayscale}
                onCheckedChange={(checked) => updateSetting("grayscale", checked)}
              />
            </div>
          </div>
        )}

        <div className="flex items-start gap-2 border-t border-border bg-background p-4 text-sm text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
          <p>Uploaded images are previewed and adjusted locally in this browser. They are not permanently stored.</p>
        </div>
      </CardContent>
    </Card>
  )
}

function PreviewSlider({
  icon: Icon,
  label,
  value,
  min,
  max,
  suffix = "",
  onChange,
}: {
  icon: React.ElementType
  label: string
  value: number
  min: number
  max: number
  suffix?: string
  onChange: (value: number) => void
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="flex items-center gap-2 font-medium">
          <Icon className="h-4 w-4" />
          {label}
        </span>
        <span className="font-mono text-xs text-muted-foreground">{value}{suffix}</span>
      </div>
      <Slider value={[value]} min={min} max={max} step={1} onValueChange={([next]) => onChange(next)} />
    </div>
  )
}
