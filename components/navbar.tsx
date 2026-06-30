"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Atom,
  Beaker,
  BookOpen,
  ChevronDown,
  FlaskConical,
  Home,
  Info,
  User,
  FileText,
  Menu,
  Map,
  X,
  Layers,
  Radio,
  Orbit,
  PlayCircle,
  ScrollText,
  TableProperties,
  GraduationCap,
  History,
  Waves,
  LogOut,
  Bot,
  Calculator,
  Sparkles,
  BarChart3,
  FileQuestion,
  BookOpenCheck,
  ClipboardCheck,
  ClipboardList,
  Target,
  Database,
  ListChecks,
  Gauge,
  Route,
  ArrowRightLeft,
  Network,
  ScanSearch,
  MousePointer2,
} from "lucide-react"
import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const primaryNavItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/chemistry-hub", label: "Chemistry Hub", icon: GraduationCap },
  { href: "/periodic-table", label: "Periodic Table", icon: TableProperties },
  { href: "/electron-configurations", label: "Electron Configs", icon: Atom },
  { href: "/molecule-builder", label: "Molecule Builder", icon: Atom },
  { href: "/reaction-lab", label: "Reaction Lab", icon: FlaskConical },
]

const chemistryToolItems = [
  { href: "/ai-assistant", label: "AI Assistant", icon: Bot },
  { href: "/formula-sheet", label: "Formula Sheet", icon: BookOpenCheck },
  { href: "/chemistry-solver", label: "Chemistry Solver", icon: Calculator },
  { href: "/chemistry-database", label: "Chemistry Database", icon: Database },
  { href: "/structure-scanner", label: "Structure Scanner", icon: ScanSearch },
  { href: "/lab-explorer", label: "Lab Explorer", icon: ClipboardList },
  { href: "/synthesis-explorer", label: "Synthesis Explorer", icon: Route },
  { href: "/molecular-visualizer", label: "Molecular Visualizer", icon: Network },
  { href: "/reaction-explorer", label: "Reaction Explorer", icon: Network },
  { href: "/mechanism-trainer", label: "Mechanism Trainer", icon: FlaskConical },
  { href: "/reaction-database", label: "Reaction Database", icon: ArrowRightLeft },
  { href: "/reaction-database?query=reagent", label: "Reaction Conditions", icon: Beaker },
  { href: "/question-engine", label: "Question Engine", icon: ListChecks },
  { href: "/exam-engine", label: "Exam Engine", icon: FileQuestion },
  { href: "/curriculum", label: "Curriculum Engine", icon: GraduationCap },
  { href: "/learning-dashboard", label: "Learning Dashboard", icon: Gauge },
  { href: "/study-plan", label: "Study Plan", icon: Route },
  { href: "/diagnostic", label: "Diagnostic", icon: ClipboardCheck },
  { href: "/study", label: "Study Mode", icon: BookOpenCheck },
  { href: "/recovery", label: "Recovery Mode", icon: Target },
  { href: "/practice-generator", label: "Practice Generator", icon: Sparkles },
  { href: "/exam-generator", label: "Exam Generator", icon: FileQuestion },
  { href: "/progress", label: "My Progress", icon: BarChart3 },
  { href: "/bonding-explorer", label: "Bonding Explorer", icon: Waves },
  { href: "/hybridization-builder", label: "Hybridization Builder", icon: Orbit },
  { href: "/interactive-learning", label: "Interactive Learning", icon: Orbit },
  { href: "/interactive-learning/explorer", label: "Molecular Explorer", icon: MousePointer2 },
  { href: "/interactive-learning/mechanisms", label: "Mechanism Simulator", icon: FlaskConical },
  { href: "/interactive-learning/conjugation", label: "Conjugation Learning", icon: Waves },
  { href: "/functional-groups", label: "Functional Groups", icon: Layers },
  { href: "/spectroscopy-explorer", label: "Spectroscopy Explorer", icon: Waves },
  { href: "/spectroscopy", label: "Spectroscopy Reference", icon: Waves },
  { href: "/spectroscopy-lab", label: "Spectroscopy Lab", icon: Radio },
  { href: "/orbital-viewer", label: "Orbital Viewer", icon: Orbit },
  { href: "/periodic-trends-quiz", label: "Trend Quiz", icon: GraduationCap },
  { href: "/history", label: "History", icon: History },
]

const secondaryNavItems = [
  { href: "/about-creator", label: "About", icon: Info },
  { href: "/past-papers", label: "Past Papers", icon: BookOpen },
  { href: "/video-solutions", label: "Video Solutions", icon: PlayCircle },
  { href: "/roadmap", label: "Roadmap", icon: Map },
  { href: "/privacy", label: "Privacy", icon: ScrollText },
  { href: "/terms", label: "Terms", icon: FileText },
  { href: "/patch-notes", label: "Patch Notes", icon: FileText },
]

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)
  const accountItem = { href: "/account", label: "Account", icon: User }
  const mobileNavItems = userEmail
    ? [...primaryNavItems, ...chemistryToolItems, ...secondaryNavItems]
    : [...primaryNavItems, ...chemistryToolItems, ...secondaryNavItems, accountItem]

  const isActivePath = (href: string) => {
    const cleanHref = href.split(/[?#]/)[0]
    if (cleanHref === "/") return pathname === "/"
    return pathname === cleanHref || pathname.startsWith(`${cleanHref}/`)
  }

  const toolsActive = chemistryToolItems.some((item) => isActivePath(item.href))
  const moreActive = secondaryNavItems.some((item) => isActivePath(item.href))

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

  async function handleLogout() {
    if (!isSupabaseConfigured()) return

    setLoggingOut(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      setUserEmail(null)
      setMobileMenuOpen(false)
      router.push("/account")
      router.refresh()
    } finally {
      setLoggingOut(false)
    }
  }

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
          <div className="hidden xl:flex min-w-0 items-center gap-1">
            {primaryNavItems.map((item) => {
              const isActive = isActivePath(item.href)
              const Icon = item.icon
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
                  <span className="whitespace-nowrap">{item.label}</span>
                </Link>
              )
            })}

            <NavDropdown label="Tools" active={toolsActive} items={chemistryToolItems} />
            <NavDropdown label="More" active={moreActive} items={secondaryNavItems} />

            {userEmail ? (
              <AccountDropdown
                email={userEmail}
                active={isActivePath("/account") || isActivePath("/history") || isActivePath("/progress")}
                loggingOut={loggingOut}
                onLogout={handleLogout}
              />
            ) : (
              <Link
                href="/account"
                className={cn(
                  "flex min-w-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                  isActivePath("/account")
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <User className="h-4 w-4 shrink-0" />
                <span className="whitespace-nowrap">Sign in / Account</span>
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-card text-foreground"
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileMenuOpen}
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
            className="xl:hidden border-t border-border bg-background"
          >
            <div className="max-h-[calc(100vh-4rem)] space-y-1 overflow-y-auto px-4 py-4">
              {userEmail && (
                <div className="mb-3 rounded-xl border border-border bg-secondary/20 p-3">
                  <p className="mb-2 truncate text-xs font-medium text-muted-foreground" title={userEmail}>
                    {shortenEmail(userEmail)}
                  </p>
                  <div className="grid gap-2">
                    <MobileAccountLink
                      href="/account"
                      icon={User}
                      label="Account"
                      active={isActivePath("/account")}
                      onClick={() => setMobileMenuOpen(false)}
                    />
                    <MobileAccountLink
                      href="/history"
                      icon={History}
                      label="History"
                      active={isActivePath("/history")}
                      onClick={() => setMobileMenuOpen(false)}
                    />
                    <MobileAccountLink
                      href="/progress"
                      icon={BarChart3}
                      label="My Progress"
                      active={isActivePath("/progress")}
                      onClick={() => setMobileMenuOpen(false)}
                    />
                    <button
                      type="button"
                      onClick={handleLogout}
                      disabled={loggingOut}
                      className="flex items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium text-muted-foreground transition-all hover:bg-secondary hover:text-foreground disabled:opacity-60"
                    >
                      <LogOut className="h-5 w-5 shrink-0" />
                      <span>{loggingOut ? "Logging out..." : "Logout"}</span>
                    </button>
                  </div>
                </div>
              )}
              {mobileNavItems.map((item) => {
                const isActive = isActivePath(item.href)
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
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className="min-w-0 truncate">{label}</span>
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

function NavDropdown({
  label,
  active,
  items,
}: {
  label: string
  active: boolean
  items: Array<{ href: string; label: string; icon: React.ElementType }>
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring",
          active
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
        )}
      >
        <span>{label}</span>
        <ChevronDown className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <DropdownMenuItem key={item.href} asChild>
              <Link href={item.href} className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function shortenEmail(email: string): string {
  const [name, domain] = email.split("@")
  if (!domain) return email
  const shortName = name.length > 12 ? `${name.slice(0, 10)}...` : name
  return `${shortName}@${domain}`
}

function AccountDropdown({
  email,
  active,
  loggingOut,
  onLogout,
}: {
  email: string
  active: boolean
  loggingOut: boolean
  onLogout: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex min-w-0 max-w-48 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring",
          active
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:bg-secondary hover:text-foreground",
        )}
      >
        <User className="h-4 w-4 shrink-0" />
        <span className="truncate" title={email}>
          {shortenEmail(email)}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="px-2 py-1.5 text-xs text-muted-foreground" title={email}>
          {shortenEmail(email)}
        </div>
        <DropdownMenuItem asChild>
          <Link href="/account" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span>Account</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            <span>History</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/progress" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span>My Progress</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault()
            onLogout()
          }}
          disabled={loggingOut}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          <span>{loggingOut ? "Logging out..." : "Logout"}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function MobileAccountLink({
  href,
  icon: Icon,
  label,
  active,
  onClick,
}: {
  href: string
  icon: React.ElementType
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground",
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span>{label}</span>
    </Link>
  )
}
