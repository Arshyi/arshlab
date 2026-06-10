"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Atom,
  FlaskConical,
  Home,
  User,
  FileText,
  Menu,
  X,
  Layers,
  Radio,
  Orbit,
  TableProperties,
  GraduationCap,
  History,
  Waves,
} from "lucide-react"
import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { isSupabaseConfigured } from "@/lib/supabase/env"

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/chemistry-hub", label: "Chemistry Hub", icon: GraduationCap },
  { href: "/periodic-table", label: "Periodic Table", icon: TableProperties },
  { href: "/electron-configurations", label: "Electron Configs", icon: Atom },
  { href: "/bonding-explorer", label: "Bonding Explorer", icon: Waves },
  { href: "/molecule-builder", label: "Molecule Builder", icon: Atom },
  { href: "/functional-groups", label: "Functional Groups", icon: Layers },
  { href: "/spectroscopy-lab", label: "Spectroscopy Lab", icon: Radio },
  { href: "/orbital-viewer", label: "Orbital Viewer", icon: Orbit },
  { href: "/reaction-lab", label: "Reaction Lab", icon: FlaskConical },
  { href: "/periodic-trends-quiz", label: "Trend Quiz", icon: GraduationCap },
  { href: "/history", label: "History", icon: History },
  { href: "/patch-notes", label: "Patch Notes", icon: FileText },
  { href: "/account", label: "Account", icon: User },
]

export function Navbar() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    if (!isSupabaseConfigured()) return

    const supabase = createClient()

    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user.email ?? null)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <nav className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-transform group-hover:scale-105">
              <Atom className="h-5 w-5" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold tracking-tight text-foreground">ARSHLAB</h1>
              <p className="text-[10px] leading-tight text-muted-foreground">Chemistry Sandbox</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon
              const isAccount = item.href === "/account"
              const label = isAccount && !userEmail ? "Account / Sign in" : item.label
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                  {isAccount && userEmail && (
                    <span className="max-w-24 truncate rounded-full bg-teal-500/10 px-2 py-0.5 text-[10px] text-teal-700 dark:text-teal-300">
                      {userEmail}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-foreground"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </nav>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-border bg-background"
          >
            <div className="px-4 py-4 space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href
                const Icon = item.icon
                const isAccount = item.href === "/account"
                const label = isAccount && !userEmail ? "Account / Sign in" : item.label
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{label}</span>
                    {isAccount && userEmail && (
                      <span className="ml-auto max-w-40 truncate rounded-full bg-teal-500/10 px-2 py-0.5 text-[10px] text-teal-700 dark:text-teal-300">
                        {userEmail}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
