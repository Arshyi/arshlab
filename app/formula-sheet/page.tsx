import { Suspense } from "react"
import { FormulaSheetClient } from "./formula-sheet-client"

export default function FormulaSheetPage() {
  return (
    <Suspense fallback={null}>
      <FormulaSheetClient />
    </Suspense>
  )
}
