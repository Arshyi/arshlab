import type { Metadata } from "next"
import { RecoveryClient } from "./recovery-client"

export const metadata: Metadata = {
  title: "Recovery Mode | ARSHLAB",
  description: "Generate adaptive chemistry recovery sessions from weak topic detection.",
}

export default function RecoveryPage() {
  return <RecoveryClient />
}
