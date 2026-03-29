"use client"

import { ArrowLeft, Lock, Shield, Sparkles } from "lucide-react"
import Link from "next/link"
import { signIn } from "next-auth/react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function LoginPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="hero-orbit" />
        <div className="grid-overlay" />
      </div>

      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="page-enter w-full space-y-8">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-[11px] font-medium hover:border-sky-500/70 hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Back to overview
          </Link>
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/40 bg-sky-500/5 px-3 py-1 text-[11px] text-sky-200/80">
            <Shield className="size-3" />
            <span>Private by default</span>
          </div>
        </div>

        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/40 bg-sky-500/5 px-3 py-1 text-[11px] text-sky-200/80">
              <Sparkles className="size-3" />
              <span>LooksmaxAI account</span>
            </div>
            <div className="space-y-3">
              <h1 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl lg:text-[2rem]">
                Sign in to sync your harmony reports securely.
              </h1>
              <p className="max-w-xl text-sm text-muted-foreground">
                Use your Google account so your measurements and improvement plans stay with you across devices. We
                don&apos;t post anything publicly or access your photos without consent.
              </p>
            </div>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li className="flex items-center gap-2">
                <Lock className="size-3 text-emerald-400" />
                <span>Read-only access to your basic Google profile details.</span>
              </li>
              <li className="flex items-center gap-2">
                <Shield className="size-3 text-sky-400" />
                <span>No social features, followers, or public feed.</span>
              </li>
            </ul>
          </div>

          <Card className="border-border/70 bg-card/90 shadow-[0_24px_70px_rgba(15,23,42,0.9)] backdrop-blur-xl card-raise">
            <CardHeader className="space-y-1">
              <CardTitle className="text-base">Sign in to LooksmaxAI</CardTitle>
              <CardDescription className="text-xs">
                Continue with Google to unlock saved reports, comparison views, and personalized improvement roadmaps.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <Button
                size="lg"
                className="w-full justify-center gap-2 border border-border/70 bg-background/80 text-foreground shadow-[0_14px_35px_rgba(15,23,42,0.9)] transition-all hover:border-sky-500/70 hover:bg-accent/40"
                type="button"
                onClick={() => signIn("google", { callbackUrl: "/onboarding" })}
              >
                <span className="inline-flex size-5 items-center justify-center rounded-full bg-white shadow-sm">
                  <span className="text-[11px] font-semibold text-[#4285F4]">G</span>
                </span>
                Continue with Google
              </Button>

              <div className="space-y-2 text-[11px] text-muted-foreground">
                <p>
                  By continuing, you agree to the processing of your data in accordance with our
                  <button className="ml-1 underline underline-offset-2 hover:text-foreground">Privacy Policy</button>
                  .
                </p>
                <p className="text-[10px]">
                  We do not post to your Google account or access your contacts. Integration is only used for
                  authentication.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  </div>
  )
}
