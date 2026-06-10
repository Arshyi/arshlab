"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
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
import { createClient } from "@/lib/supabase/client"

export interface AccountUser {
  id: string
  email: string
  createdAt: string | null
}

type AuthMode = "login" | "signup" | "logout" | null
type MessageKind = "success" | "error" | "info"

interface AuthMessage {
  kind: MessageKind
  title: string
  body: string
}

interface AccountAuthClientProps {
  initialUser: AccountUser | null
  isConfigured: boolean
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

function getRedirectUrl() {
  if (typeof window === "undefined") return undefined
  return `${window.location.origin}/account`
}

function formatAuthError(message: string): string {
  const normalized = message.toLowerCase()
  if (normalized.includes("invalid login") || normalized.includes("invalid credentials")) {
    return "That email and password did not match an account. Check your details and try again."
  }
  if (normalized.includes("email not confirmed")) {
    return "Please confirm your email address before signing in."
  }
  if (normalized.includes("password")) {
    return message
  }
  return message || "Authentication could not be completed. Please try again."
}

export function AccountAuthClient({ initialUser, isConfigured }: AccountAuthClientProps) {
  const router = useRouter()
  const [user, setUser] = useState<AccountUser | null>(initialUser)
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [signupEmail, setSignupEmail] = useState("")
  const [signupPassword, setSignupPassword] = useState("")
  const [loading, setLoading] = useState<AuthMode>(null)
  const [message, setMessage] = useState<AuthMessage | null>(null)

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

  async function handleSignUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return

    setLoading("signup")
    setMessage(null)

    const { data, error } = await supabase.auth.signUp({
      email: signupEmail,
      password: signupPassword,
      options: {
        emailRedirectTo: getRedirectUrl(),
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
        body: "You are signed in. Permanent saved history coming later.",
      })
      router.replace("/account")
      router.refresh()
      return
    }

    setMessage({
      kind: "success",
      title: "Check your email to confirm your account.",
      body: "Supabase may require email confirmation before you can sign in.",
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
                Account
              </h1>
              <p className="text-muted-foreground">Supabase Authentication Alpha</p>
            </div>
          </div>
          <p className="max-w-2xl text-lg text-muted-foreground">
            Email/password accounts are live. Permanent saved history coming later.
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
          <SignedInPanel user={user} loading={loading === "logout"} onLogout={handleLogout} />
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
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <AuthFormCard
        title="Create your account"
        description="Use email and password. If email confirmation is enabled, Supabase will send a confirmation link."
        icon={User}
        submitLabel={loading === "signup" ? "Creating account..." : "Sign up"}
        email={signupEmail}
        password={signupPassword}
        disabled={!isConfigured || loading !== null}
        onEmailChange={onSignupEmailChange}
        onPasswordChange={onSignupPasswordChange}
        onSubmit={onSignUp}
      />
      <AuthFormCard
        title="Sign in"
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

      <Card className="rounded-2xl border-dashed lg:col-span-2">
        <CardContent className="grid gap-4 p-5 sm:grid-cols-3">
          <AuthNote icon={Atom} title="Chemistry stays open" text="All current ARSHLAB tools remain usable without auth." />
          <AuthNote icon={History} title="History later" text="Permanent saved history coming later. No chemistry history is stored yet." />
          <AuthNote icon={ShieldCheck} title="Safe key usage" text="Only the Supabase publishable key is used in the browser." />
        </CardContent>
      </Card>
    </div>
  )
}

function SignedInPanel({
  user,
  loading,
  onLogout,
}: {
  user: AccountUser
  loading: boolean
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
            <AlertTitle>Permanent saved history coming later.</AlertTitle>
            <AlertDescription>
              This release only adds authentication. Molecule history, reaction history, friends, subscriptions,
              payments, and social features are intentionally not implemented yet.
            </AlertDescription>
          </Alert>

          <Button onClick={onLogout} disabled={loading} variant="outline" className="h-12 rounded-xl">
            <LogOut className="h-4 w-4" />
            {loading ? "Logging out..." : "Log out"}
          </Button>
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
          <p>No service role key is used, and no user database tables are created in this release.</p>
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
