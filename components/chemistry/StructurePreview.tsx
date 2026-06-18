import { ImageIcon, ShieldCheck, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface StructurePreviewProps {
  previewUrl: string | null
  fileName: string | null
  onClear?: () => void
}

export function StructurePreview({ previewUrl, fileName, onClear }: StructurePreviewProps) {
  return (
    <Card className="overflow-hidden rounded-2xl border-dashed">
      <CardContent className="p-0">
        <div className="relative flex min-h-[240px] items-center justify-center bg-secondary/30">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt={fileName ? `Uploaded structure preview for ${fileName}` : "Uploaded structure preview"}
              className="max-h-[420px] w-full object-contain p-3"
            />
          ) : (
            <div className="flex flex-col items-center gap-3 p-8 text-center text-muted-foreground">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-background">
                <ImageIcon className="h-7 w-7" />
              </div>
              <div>
                <p className="font-medium text-foreground">Upload a structure image</p>
                <p className="mt-1 text-sm">PNG, JPG, JPEG, or WEBP previewed locally.</p>
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
        <div className="flex items-start gap-2 border-t border-border bg-background p-4 text-sm text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
          <p>Images are processed locally by ARSHLAB. Images are not permanently stored.</p>
        </div>
      </CardContent>
    </Card>
  )
}
