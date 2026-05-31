"use client"

import { motion } from "framer-motion"
import {
  User,
  Github,
  Youtube,
  MessageCircle,
  Linkedin,
  Mail,
  Heart,
  Cpu,
  Calculator,
  FlaskConical,
  BookOpen,
  GraduationCap,
} from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const YOUTUBE_URL = "https://www.youtube.com/@arshyiamehran9113"

const interests = [
  {
    icon: GraduationCap,
    title: "Biomedical Engineering",
    description: "Applying engineering principles to biological and medical systems.",
  },
  {
    icon: FlaskConical,
    title: "Chemistry Visualization",
    description: "Making molecular structures and reactions intuitive through interactive tools.",
  },
  {
    icon: Calculator,
    title: "Mathematics Education",
    description: "Teaching reasoning and derivation over rote memorization.",
  },
  {
    icon: Cpu,
    title: "Computational Systems",
    description: "Building software architectures that scale with educational content.",
  },
  {
    icon: BookOpen,
    title: "Educational Technology",
    description: "Designing tools that help students develop genuine understanding.",
  },
  {
    icon: Heart,
    title: "Open Learning Resources",
    description: "Creating freely accessible educational materials for all learners.",
  },
]

const socialLinks = [
  { label: "GitHub", icon: Github, href: "#", placeholder: true },
  { label: "YouTube", icon: Youtube, href: YOUTUBE_URL, placeholder: false },
  { label: "Discord", icon: MessageCircle, href: "#", placeholder: true },
  { label: "LinkedIn", icon: Linkedin, href: "#", placeholder: true },
  { label: "Email", icon: Mail, href: "#", placeholder: true },
]

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
}

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
}

export default function AboutCreatorPage() {
  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <User className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">About the Creator</h1>
              <p className="text-muted-foreground">The person behind ARSHLAB</p>
            </div>
          </div>
        </motion.div>

        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="rounded-2xl mb-6 overflow-hidden">
            <div className="bg-primary p-8 text-primary-foreground">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary-foreground/10 border border-primary-foreground/20">
                  <User className="h-10 w-10" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Arshyia Mehran</h2>
                  <p className="text-primary-foreground/80 mt-1">
                    Biomedical Engineering Student
                  </p>
                </div>
              </div>
            </div>
            <CardContent className="p-6 sm:p-8 space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">Biography</h3>
                <p className="text-muted-foreground leading-relaxed">
                  As of 2026, I am a third-year Biomedical Engineering undergraduate at the
                  University of British Columbia (UBC).
                </p>
                <p className="text-muted-foreground leading-relaxed mt-4">My interests include:</p>
                <ul className="mt-2 space-y-1.5 text-muted-foreground">
                  {[
                    "Chemistry visualization",
                    "Mathematics",
                    "Computational systems",
                    "Software development",
                    "Educational technology",
                    "Engineering design",
                  ].map((interest) => (
                    <li key={interest} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                      {interest}
                    </li>
                  ))}
                </ul>
                <p className="text-muted-foreground leading-relaxed mt-4">
                  I created ARSHLAB to make chemistry and STEM learning more visual, interactive,
                  and intuitive.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-secondary/30 p-5">
                <h3 className="text-lg font-semibold mb-2">Mission Statement</h3>
                <p className="text-muted-foreground leading-relaxed">
                  ARSHLAB was created to help students learn through visualization, exploration,
                  derivation, and problem solving rather than memorization alone.
                </p>
                <p className="text-muted-foreground leading-relaxed mt-3">
                  The long-term vision is to build educational tools, question generators, learning
                  resources, and content that help students develop genuine understanding.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Interest Cards */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8"
        >
          {interests.map((interest) => (
            <motion.div key={interest.title} variants={item}>
              <Card className="h-full rounded-2xl border-border/50 bg-card/80 backdrop-blur-sm transition-all hover:shadow-lg hover:border-accent/30">
                <CardContent className="p-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground mb-3">
                    <interest.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-foreground">{interest.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                    {interest.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Social Links */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="rounded-2xl mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Connect</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {socialLinks.map((link) => {
                  const Icon = link.icon
                  if (link.placeholder) {
                    return (
                      <Button
                        key={link.label}
                        variant="outline"
                        className="rounded-xl gap-2"
                        disabled
                      >
                        <Icon className="h-4 w-4" />
                        {link.label}
                      </Button>
                    )
                  }
                  return (
                    <Button key={link.label} variant="outline" className="rounded-xl gap-2" asChild>
                      <Link href={link.href} target="_blank" rel="noopener noreferrer">
                        <Icon className="h-4 w-4" />
                        {link.label}
                      </Link>
                    </Button>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Legal Disclaimer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center text-xs text-muted-foreground leading-relaxed max-w-3xl mx-auto"
        >
          ARSHLAB is an independent educational project and is not affiliated with or endorsed by
          the International Baccalaureate Organization (IBO), College Board, Cambridge Assessment
          International Education, the University of British Columbia, or any other examination
          board or institution.
        </motion.p>
      </div>
    </div>
  )
}
