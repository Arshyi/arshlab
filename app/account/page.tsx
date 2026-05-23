"use client"

import { motion } from "framer-motion"
import { User, Mail, Lock, Atom, History, Star, Trash2, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

const accountFeatures = [
  {
    icon: Atom,
    title: "Saved Molecules",
    description: "Keep structures you generated and revisit them anytime.",
  },
  {
    icon: History,
    title: "Reaction History",
    description: "Track equations, balanced versions, and predicted products.",
  },
  {
    icon: Star,
    title: "Favorite Compounds",
    description: "Mark frequently used molecules for quick access.",
  },
  {
    icon: BookOpen,
    title: "Study Collections",
    description: "Group molecules by topic: alcohols, acids, esters, and more.",
  },
  {
    icon: Trash2,
    title: "Delete History",
    description: "Full control over your saved chemistry data.",
  },
]

export default function AccountPage() {
  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Account
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Sign up to save your work and access it from anywhere.
          </p>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          {/* Auth Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="rounded-2xl">
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground mb-4">
                  <User className="h-6 w-6" />
                </div>
                <CardTitle className="text-2xl">Create your account</CardTitle>
                <p className="text-muted-foreground">
                  Accounts are optional. You can explore all tools without signing up.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      className="h-12 rounded-xl pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="••••••••"
                      className="h-12 rounded-xl pl-10"
                    />
                  </div>
                </div>

                <Button className="w-full h-12 rounded-xl text-base">
                  Sign Up
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">or</span>
                  </div>
                </div>

                <Button variant="outline" className="w-full h-12 rounded-xl text-base">
                  Continue as Guest
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <button className="font-medium text-foreground hover:underline">
                    Sign in
                  </button>
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Features */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            <h2 className="text-lg font-semibold text-foreground">
              Why create an account?
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {accountFeatures.map((feature) => (
                <Card key={feature.title} className="rounded-2xl border-border/50 bg-card/80">
                  <CardContent className="p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary mb-3">
                      <feature.icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <h3 className="font-medium text-foreground">{feature.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Privacy Note */}
            <Card className="rounded-2xl bg-secondary/50 border-0">
              <CardContent className="p-5">
                <h3 className="font-medium text-foreground mb-2">Privacy First</h3>
                <p className="text-sm text-muted-foreground">
                  Your data is yours. We only store what you explicitly save, and you can 
                  delete everything at any time. No tracking, no ads, just chemistry.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
