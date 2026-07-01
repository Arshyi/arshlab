"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  Atom,
  CheckCircle2,
  History,
  Lock,
  LogIn,
  LogOut,
  Mail,
  ShieldCheck,
  User,
} from "lucide-react"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { getClientAuthCallbackUrl } from "@/lib/auth/app-url"
import { createClient } from "@/lib/supabase/client"
import { getUserHistory } from "@/lib/supabase/history"

export interface AccountUser {
  id: string
  email: string
  createdAt: string | null
}

type AuthMode = "login" | "signup" | "logout" | null
type MessageKind = "success" | "error" | "info"
export type AuthPanel = "login" | "signup"

export interface AuthMessage {
  kind: MessageKind
  title: string
  body: string
}

interface AccountAuthClientProps {
  initialUser: AccountUser | null
  isConfigured: boolean
  initialPanel?: AuthPanel
  initialMessage?: AuthMessage | null
  title?: string
  subtitle?: string
  description?: string
}

interface HistoryStats {
  loading: boolean
  molecules: number
  reactions: number
  total: number
  error: string | null
}

function mapSupabaseUser(user: SupabaseUser | null): AccountUser | null {
  if (!user) return null

  return {
    id: user.id,
    email: user.email ?? "No email available",
    createdAt: user.created_at ?? null,
  }
}

function formatDate(value: string | null): string {
  if (!value) return "Not available"
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value))
}

function formatAuthError(message: string): string {
  const normalized = message.toLowerCase()
  if (normalized.includes("invalid login") || normalized.includes("invalid credentials")) {
    return "That email and password did not match an account. Check your details and try again."
  }
  if (normalized.includes("email not confirmed")) {
    return "Please confirm your email address before signing in. Check your inbox for the ARSHLAB confirmation link."
  }
  if (normalized.includes("expired") || normalized.includes("invalid token")) {
    return "That confirmation link has expired or is no longer valid. Request a new sign-up or sign-in link from ARSHLAB."
  }
  if (normalized.includes("password")) {
    return message
  }
  return message || "Authentication could not be completed. Please try again."
}

export function AccountAuthClient({
  initialUser,
  isConfigured,
  initialPanel = "signup",
  initialMessage = null,
  title = "Account",
  subtitle = "ARSHLAB account",
  description = "Create or sign in to an ARSHLAB account. Supabase Auth securely handles email/password sessions behind the scenes.",
}: AccountAuthClientProps) {
  const router = useRouter()
  const [user, setUser] = useState<AccountUser | null>(initialUser)
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [signupEmail, setSignupEmail] = useState("")
  const [signupPassword, setSignupPassword] = useState("")
  const [loading, setLoading] = useState<AuthMode>(null)
  const [message, setMessage] = useState<AuthMessage | null>(initialMessage)
  const [historyStats, setHistoryStats] = useState<HistoryStats>({
    loading: false,
    molecules: 0,
    reactions: 0,
    total: 0,
    error: null,
  })

  const supabase = useMemo(() => {
    if (!isConfigured) return null
    return createClient()
  }, [isConfigured])

  useEffect(() => {
    if (!supabase) return

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(mapSupabaseUser(session?.user ?? null))
      router.refresh()
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router, supabase])

  useEffect(() => {
    if (!user || !supabase) {
      setHistoryStats({ loading: false, molecules: 0, reactions: 0, total: 0, error: null })
      return
    }

    let mounted = true
    setHistoryStats((current) => ({ ...current, loading: true, error: null }))

    getUserHistory().then((result) => {
      if (!mounted) return
      if (!result.ok) {
        setHistoryStats({
          loading: false,
          molecules: 0,
          reactions: 0,
          total: 0,
          error: result.error,
        })
        return
      }

      const molecules = result.data.filter((entry) => entry.type === "molecule").length
      const reactions = result.data.filter((entry) => entry.type === "reaction").length
      setHistoryStats({
        loading: false,
        molecules,
        reactions,
        total: result.data.length,
        error: null,
      })
    })

    return () => {
      mounted = false
    }
  }, [supabase, user])

  async function handleSignUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return

    setLoading("signup")
    setMessage(null)

    const { data, error } = await supabase.auth.signUp({
      email: signupEmail,
      password: signupPassword,
      options: {
        emailRedirectTo: getClientAuthCallbackUrl(),
      },
    })

    setLoading(null)

    if (error) {
      setMessage({
        kind: "error",
        title: "Could not create account",
        body: formatAuthError(error.message),
      })
      return
    }

    if (data.session && data.user) {
      setUser(mapSupabaseUser(data.user))
      setMessage({
        kind: "success",
        title: "Account created",
        body: "You are signed in to ARSHLAB. Permanent saved history is now enabled.",
      })
      router.replace("/account")
      router.refresh()
      return
    }

    setMessage({
      kind: "success",
      title: "Check your email to confirm your account.",
      body: "If email confirmation is enabled, use the ARSHLAB confirmation link in your inbox to finish account setup.",
    })
    router.replace("/account")
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return

    setLoading("login")
    setMessage(null)

    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    })

    setLoading(null)

    if (error) {
      setMessage({
        kind: "error",
        title: "Could not sign in",
        body: formatAuthError(error.message),
      })
      return
    }

    setUser(mapSupabaseUser(data.user))
    setMessage({
      kind: "success",
      title: "Signed in",
      body: "Welcome back to ARSHLAB.",
    })
    router.replace("/account")
    router.refresh()
  }

  async function handleLogout() {
    if (!supabase) return

    setLoading("logout")
    setMessage(null)
    const { error } = await supabase.auth.signOut()
    setLoading(null)

    if (error) {
      setMessage({
        kind: "error",
        title: "Could not log out",
        body: formatAuthError(error.message),
      })
      return
    }

    setUser(null)
    setMessage({
      kind: "success",
      title: "Logged out",
      body: "Your Supabase session has been cleared on this browser.",
    })
    router.replace("/account")
    router.refresh()
  }

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <User className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                {title}
              </h1>
              <p className="text-muted-foreground">{subtitle}</p>
            </div>
          </div>
          <p className="max-w-2xl text-lg text-muted-foreground">
            {description}
          </p>
        </motion.div>

        {!isConfigured && (
          <Alert className="mb-6 rounded-2xl border-amber-500/30 bg-amber-500/10">
            <ShieldCheck className="h-4 w-4" />
            <AlertTitle>Supabase is not configured</AlertTitle>
            <AlertDescription>
              Add NEXT_PUBLIC_SUPABASE_URL and either NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or
              NEXT_PUBLIC_SUPABASE_ANON_KEY to enable authentication.
            </AlertDescription>
          </Alert>
        )}

        {message && (
          <Alert
            className="mb-6 rounded-2xl"
            variant={message.kind === "error" ? "destructive" : "default"}
          >
            {message.kind === "success" ? <CheckCircle2 className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
            <AlertTitle>{message.title}</AlertTitle>
            <AlertDescription>{message.body}</AlertDescription>
          </Alert>
        )}

        {user ? (
          <SignedInPanel
            user={user}
            loading={loading === "logout"}
            historyStats={historyStats}
            onLogout={handleLogout}
          />
        ) : (
          <SignedOutPanel
            isConfigured={isConfigured}
            loginEmail={loginEmail}
            loginPassword={loginPassword}
            signupEmail={signupEmail}
            signupPassword={signupPassword}
            loading={loading}
            onLoginEmailChange={setLoginEmail}
            onLoginPasswordChange={setLoginPassword}
            onSignupEmailChange={setSignupEmail}
            onSignupPasswordChange={setSignupPassword}
            onLogin={handleLogin}
            onSignUp={handleSignUp}
            initialPanel={initialPanel}
          />
        )}
      </div>
    </div>
  )
}

function SignedOutPanel({
  isConfigured,
  loginEmail,
  loginPassword,
  signupEmail,
  signupPassword,
  loading,
  onLoginEmailChange,
  onLoginPasswordChange,
  onSignupEmailChange,
  onSignupPasswordChange,
  onLogin,
  onSignUp,
  initialPanel,
}: {
  isConfigured: boolean
  loginEmail: string
  loginPassword: string
  signupEmail: string
  signupPassword: string
  loading: AuthMode
  onLoginEmailChange: (value: string) => void
  onLoginPasswordChange: (value: string) => void
  onSignupEmailChange: (value: string) => void
  onSignupPasswordChange: (value: string) => void
  onLogin: (event: FormEvent<HTMLFormElement>) => void
  onSignUp: (event: FormEvent<HTMLFormElement>) => void
  initialPanel: AuthPanel
}) {
  const loginForm = (
    <AuthFormCard
      title="Sign in to ARSHLAB"
      description="Log in with an existing ARSHLAB account. Sessions persist across refreshes."
      icon={LogIn}
      submitLabel={loading === "login" ? "Signing in..." : "Log in"}
      email={loginEmail}
      password={loginPassword}
      disabled={!isConfigured || loading !== null}
      onEmailChange={onLoginEmailChange}
      onPasswordChange={onLoginPasswordChange}
      onSubmit={onLogin}
    />
  )
  const signupForm = (
    <AuthFormCard
      title="Create your ARSHLAB account"
      description="Use email and password to create an ARSHLAB account. This does not create Supabase dashboard or project access."
      icon={User}
      submitLabel={loading === "signup" ? "Creating account..." : "Sign up"}
      email={signupEmail}
      password={signupPassword}
      disabled={!isConfigured || loading !== null}
      onEmailChange={onSignupEmailChange}
      onPasswordChange={onSignupPasswordChange}
      onSubmit={onSignUp}
    />
  )

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {initialPanel === "login" ? (
        <>
          {loginForm}
          {signupForm}
        </>
      ) : (
        <>
          {signupForm}
          {loginForm}
        </>
      )}

      <Card className="rounded-2xl border-dashed lg:col-span-2">
        <CardContent className="grid gap-4 p-5 sm:grid-cols-3">
          <AuthNote icon={Atom} title="Chemistry stays open" text="All current ARSHLAB tools remain usable without auth." />
          <AuthNote icon={History} title="Saved history" text="Sign in to save molecule and reaction history permanently." />
          <AuthNote icon={ShieldCheck} title="ARSHLAB account only" text="Signing up creates an ARSHLAB user account, not Supabase dashboard access." />
        </CardContent>
      </Card>
    </div>
  )
}

function SignedInPanel({
  user,
  loading,
  historyStats,
  onLogout,
}: {
  user: AccountUser
  loading: boolean
  historyStats: HistoryStats
  onLogout: () => void
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <Card className="rounded-2xl border-primary/20 bg-primary/5">
        <CardHeader>
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <User className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl">You are signed in</CardTitle>
          <p className="text-muted-foreground">Your Supabase session will persist across refreshes.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <AccountField label="Email" value={user.email} />
            <AccountField label="User ID" value={user.id} />
            <AccountField label="Created" value={formatDate(user.createdAt)} />
            <div className="rounded-xl border border-border bg-card/70 px-3 py-2">
              <p className="text-[10px] uppercase text-muted-foreground">Status</p>
              <Badge className="mt-1 bg-teal-500 text-white">Authenticated</Badge>
            </div>
          </div>

          <Alert className="rounded-2xl">
            <History className="h-4 w-4" />
            <AlertTitle>Permanent saved history is now enabled.</AlertTitle>
            <AlertDescription>
              Molecule and reaction searches can now be saved to your Supabase-backed ARSHLAB account.
              Friends, subscriptions, payments, and social features are intentionally not implemented yet.
            </AlertDescription>
          </Alert>

          <Alert className="rounded-2xl">
            <ShieldCheck className="h-4 w-4" />
            <AlertTitle>Private saved history</AlertTitle>
            <AlertDescription>
              Your saved history is private and protected by Supabase Row Level Security.
            </AlertDescription>
          </Alert>

          <HistoryStatsPanel stats={historyStats} />

          <div className="flex flex-wrap gap-3">
            <Button asChild className="h-12 rounded-xl">
              <Link href="/history">
                <History className="h-4 w-4" />
                View Saved History
              </Link>
            </Button>
            <Button onClick={onLogout} disabled={loading} variant="outline" className="h-12 rounded-xl">
              <LogOut className="h-4 w-4" />
              {loading ? "Logging out..." : "Log out"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldCheck className="h-5 w-5" />
            Auth Scope
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Email/password sign up, login, logout, and persisted sessions are enabled.</p>
          <p>Accounts are for ARSHLAB users only. They do not grant Supabase project access, dashboard access, or administrative privileges.</p>
          <p>No service role key is used in the browser. Saved history rows are scoped to your authenticated user.</p>
        </CardContent>
      </Card>
    </div>
  )
}

function AuthFormCard({
  title,
  description,
  icon: Icon,
  submitLabel,
  email,
  password,
  disabled,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: {
  title: string
  description: string
  icon: typeof User
  submitLabel: string
  email: string
  password: string
  disabled: boolean
  onEmailChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  const idPrefix = title.includes("Create") ? "signup" : "login"

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="h-full rounded-2xl">
        <CardHeader>
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Icon className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl">{title}</CardTitle>
          <p className="text-muted-foreground">{description}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor={`${idPrefix}-email`} className="text-sm font-medium text-foreground">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id={`${idPrefix}-email`}
                  type="email"
                  value={email}
                  onChange={(event) => onEmailChange(event.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  className="h-12 rounded-xl pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor={`${idPrefix}-password`} className="text-sm font-medium text-foreground">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id={`${idPrefix}-password`}
                  type="password"
                  value={password}
                  onChange={(event) => onPasswordChange(event.target.value)}
                  placeholder="Password"
                  autoComplete={title.includes("Create") ? "new-password" : "current-password"}
                  minLength={6}
                  required
                  className="h-12 rounded-xl pl-10"
                />
              </div>
            </div>

            <Button disabled={disabled} className="h-12 w-full rounded-xl text-base">
              {submitLabel}
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function HistoryStatsPanel({ stats }: { stats: HistoryStats }) {
  return (
    <div className="rounded-2xl border border-border bg-card/70 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">Saved History</h3>
          <p className="text-sm text-muted-foreground">
            {stats.loading ? "Loading saved history counts..." : "Permanent account history counts"}
          </p>
        </div>
        <Badge variant="secondary">{stats.total}</Badge>
      </div>

      {stats.error ? (
        <p className="rounded-xl border border-dashed border-border bg-secondary/20 px-3 py-2 text-sm text-muted-foreground">
          History stats are unavailable until the Supabase history table is set up.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          <AccountStat label="Molecules" value={stats.molecules} />
          <AccountStat label="Reactions" value={stats.reactions} />
          <AccountStat label="Total" value={stats.total} />
        </div>
      )}
    </div>
  )
}

function AccountStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/20 px-3 py-2">
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="font-mono text-2xl font-bold">{value}</p>
    </div>
  )
}

function AuthNote({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Atom
  title: string
  text: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <div>
        <h3 className="font-medium text-foreground">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{text}</p>
      </div>
    </div>
  )
}

function AccountField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/70 px-3 py-2">
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 break-all font-mono text-sm">{value}</p>
    </div>
  )
}
