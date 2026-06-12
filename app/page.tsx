"use client"

import { motion } from "framer-motion"
import { ArrowRight, Atom, FlaskConical, Zap, Eye, Sparkles, BookOpen, BookOpenCheck, Beaker, Layers, Radio, FileText, PlayCircle, Map, User, Waves, Orbit, FileQuestion, Target, ClipboardCheck, GraduationCap, Database } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { FloatingAtoms } from "@/components/floating-atoms"

const learningEcosystem = [
  {
    icon: User,
    title: "About the Creator",
    description: "Meet the engineering student behind ARSHLAB and learn about the mission.",
    href: "/about-creator",
  },
  {
    icon: FileText,
    title: "Practice Papers",
    description: "Original practice sets designed to promote understanding over memorization.",
    href: "/past-papers",
  },
  {
    icon: PlayCircle,
    title: "Video Solutions",
    description: "Step-by-step walkthroughs focused on reasoning, derivations, and visualization.",
    href: "/video-solutions",
  },
  {
    icon: Map,
    title: "Roadmap",
    description: "See what's completed, in development, and planned for the platform.",
    href: "/roadmap",
  },
]

const features = [
  {
    icon: Atom,
    title: "Molecule Builder",
    description: "Search by IUPAC name, formula, or functional group category. Visualize 2D/3D with symmetry and study mode.",
  },
  {
    icon: Atom,
    title: "Electron Configuration Builder",
    description: "Search elements, animate orbital filling, and study Aufbau, Hund, Pauli, and d-block exceptions.",
  },
  {
    icon: Sparkles,
    title: "Practice Generator",
    description: "Generate original chemistry practice questions with answer reveal, explanations, and printable PDFs.",
    href: "/practice-generator",
  },
  {
    icon: BookOpenCheck,
    title: "Study Mode",
    description: "Work through adaptive chemistry sessions with streaks, XP, mastery, feedback, and PDF exports.",
    href: "/study",
  },
  {
    icon: GraduationCap,
    title: "Curriculum Engine",
    description: "Choose IB, AP, A-Level, CHEM 121, or first-year chemistry paths and track unit mastery.",
    href: "/curriculum",
  },
  {
    icon: Database,
    title: "Chemistry Database",
    description: "Browse ARSHLAB's local chemistry knowledge core for compounds, ions, functional groups, and reaction templates.",
    href: "/chemistry-database",
  },
  {
    icon: ClipboardCheck,
    title: "Diagnostic Assessment",
    description: "Take a placement-style chemistry checkup, then get targeted study order, reports, and recovery actions.",
    href: "/diagnostic",
  },
  {
    icon: Target,
    title: "Recovery Mode",
    description: "Generate targeted recovery sessions from weak concepts, then export printable PDFs with mastery summaries.",
    href: "/recovery",
  },
  {
    icon: FileQuestion,
    title: "Exam Generator",
    description: "Generate full chemistry practice exams, answer keys, and clean printable PDF handouts.",
    href: "/exam-generator",
  },
  {
    icon: Waves,
    title: "Bonding Explorer",
    description: "Move atoms together, inspect sigma and pi overlap, and connect bond length to potential energy.",
  },
  {
    icon: Orbit,
    title: "Hybridization Builder",
    description: "Build hybrid orbitals, add outer atoms, and compare electron geometry with molecular geometry.",
    href: "/hybridization-builder",
  },
  {
    icon: Layers,
    title: "Functional Groups",
    description: "Explore all 9 IB HL functional groups with properties, naming rules, and spectroscopy hints.",
  },
  {
    icon: Radio,
    title: "Spectroscopy Lab",
    description: "Educational IR, mass spectrometry, and proton NMR data for common molecules.",
  },
  {
    icon: FlaskConical,
    title: "Reaction Lab",
    description: "Input chemical equations with proper syntax, balance them, and predict products.",
  },
  {
    icon: Eye,
    title: "Structure Visualization",
    description: "See 2D text-art and 3D models with lone pairs, functional group tags, and classifications.",
  },
  {
    icon: Beaker,
    title: "IB HL Study Tools",
    description: "Study mode, primary/secondary classification, and functional-group-aware search.",
  },
  {
    icon: BookOpen,
    title: "Periodic Trend Practice",
    description: "Use heatmaps, comparison mode, and quiz questions to reason through periodic trends.",
  },
]

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <FloatingAtoms />
      
      {/* Hero Section */}
      <section className="relative px-4 pt-16 pb-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground shadow-sm mb-8">
              <Sparkles className="h-4 w-4 text-accent" />
              Interactive chemistry, without the encyclopedia scroll
            </div>

            <h1 className="text-4xl font-black tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl text-balance">
              ARSHLAB
            </h1>
            <p className="mt-2 text-sm sm:text-base font-medium text-muted-foreground tracking-wide">
              Atom Resonance Structure Hypervalency Labelling And Building
            </p>

            <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              A chemistry-first educational platform for students and curious learners. Build molecules, 
              visualize structures, analyze reactions, and explore STEM concepts interactively.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button asChild size="lg" className="rounded-xl px-8 h-12 text-base">
                <Link href="/molecule-builder">
                  Try Molecule Builder
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-xl px-8 h-12 text-base">
                <Link href="/functional-groups">
                  Functional Groups
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-xl px-8 h-12 text-base">
                <Link href="/spectroscopy-lab">
                  Spectroscopy Lab
                </Link>
              </Button>
            </div>

            <p className="mt-6 text-sm text-muted-foreground">
              No login required to explore. Sign in later to save your work.
            </p>
          </motion.div>

          {/* Preview Card */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mx-auto mt-16 max-w-3xl"
          >
            <Card className="overflow-hidden rounded-2xl border-border/50 bg-card/50 backdrop-blur-sm shadow-xl">
              <CardContent className="p-0">
                <div className="bg-primary p-6 sm:p-8 text-primary-foreground">
                  <p className="text-sm opacity-80">Structure Preview</p>
                  <h3 className="mt-2 text-2xl sm:text-3xl font-bold">propan-1-ol</h3>
                  <div className="mt-6 rounded-xl border border-primary-foreground/20 bg-primary-foreground/10 p-4 sm:p-6 font-mono text-lg sm:text-xl text-center">
                    CH₃—CH₂—CH₂—OH
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 sm:p-6">
                  {[
                    { icon: Eye, label: "2D/3D View" },
                    { icon: Zap, label: "Polarity" },
                    { icon: Atom, label: "Lone Pairs" },
                    { icon: FlaskConical, label: "Reactions" },
                  ].map((feature) => (
                    <div
                      key={feature.label}
                      className="flex flex-col items-center gap-2 rounded-xl border border-border bg-secondary/50 p-4 text-center"
                    >
                      <feature.icon className="h-5 w-5 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground">{feature.label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Learning Ecosystem Section */}
      <section className="relative px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Learning Ecosystem
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Explore the creator story, practice resources, video solutions, and platform roadmap
            </p>
          </motion.div>

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
          >
            {learningEcosystem.map((ecosystemItem) => (
              <motion.div key={ecosystemItem.title} variants={item}>
                <Link href={ecosystemItem.href} className="block h-full group">
                  <Card className="h-full rounded-2xl border-border/50 bg-card/80 backdrop-blur-sm transition-all hover:shadow-lg hover:border-accent/30 group-hover:-translate-y-0.5">
                    <CardContent className="p-6">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground mb-4">
                        <ecosystemItem.icon className="h-6 w-6" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground">{ecosystemItem.title}</h3>
                      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                        {ecosystemItem.description}
                      </p>
                      <span className="mt-4 inline-flex items-center text-sm font-medium text-accent group-hover:gap-2 transition-all">
                        Explore
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative px-4 py-24 sm:px-6 lg:px-8 bg-secondary/30">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Everything you need to explore chemistry
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Built for first-year university and high school students
            </p>
          </motion.div>

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {features.map((feature) => {
              const card = (
                <Card className="h-full rounded-2xl border-border/50 bg-card/80 backdrop-blur-sm transition-all hover:shadow-lg hover:border-accent/30">
                  <CardContent className="p-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground mb-4">
                      <feature.icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">{feature.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              )

              return (
                <motion.div key={feature.title} variants={item}>
                  {"href" in feature && feature.href ? (
                    <Link href={feature.href} className="block h-full">
                      {card}
                    </Link>
                  ) : (
                    card
                  )}
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-6" />
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Ready to start exploring?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Jump right into the molecule builder or reaction lab - no account needed.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button asChild size="lg" className="rounded-xl px-8 h-12">
                <Link href="/molecule-builder">
                  Start Building
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-xl px-8 h-12">
                <Link href="/patch-notes">
                  View Development Progress
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
