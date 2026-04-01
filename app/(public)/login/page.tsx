"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { signInWithGoogle, signInWithMagicLink, signInWithPassword } from "@/lib/supabase/auth-actions";
import { Mail, Lock, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

// ── Google OAuth button ───────────────────────────────────────────────────────

function GoogleOAuthButton() {
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    await signInWithGoogle();
    // If we get here, OAuth redirect didn't fire (error case handled inside action)
    setPending(false);
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg border border-neutral-200 bg-white text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-card"
    >
      {pending ? (
        <Loader2 className="w-4 h-4 animate-spin text-neutral-500" />
      ) : (
        <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
      )}
      Continue with Google
    </button>
  );
}

// ── Magic link form ───────────────────────────────────────────────────────────

const magicLinkInitial = { error: null as string | null, success: false };

function MagicSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-card"
    >
      {pending && <Loader2 className="w-4 h-4 animate-spin" />}
      Send magic link
    </button>
  );
}

function MagicLinkForm() {
  const [state, action] = useFormState(signInWithMagicLink, magicLinkInitial);

  if (state.success) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <CheckCircle2 className="w-10 h-10 text-primary-600" />
        <p className="text-sm font-medium text-neutral-900">Check your inbox</p>
        <p className="text-sm text-neutral-600">
          We&rsquo;ve sent a sign-in link to your email. Click it to continue.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div>
        <label
          htmlFor="magic-email"
          className="block text-sm font-medium text-neutral-700 mb-1.5"
        >
          Email address
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
          <input
            id="magic-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@company.com"
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border border-neutral-200 bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
          />
        </div>
      </div>

      {state.error && (
        <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{state.error}</span>
        </div>
      )}

      <MagicSubmitButton />
    </form>
  );
}

// ── Password login form ───────────────────────────────────────────────────────

const passwordInitial = { error: null as string | null };

function PasswordSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-card"
    >
      {pending && <Loader2 className="w-4 h-4 animate-spin" />}
      Sign in
    </button>
  );
}

function PasswordLoginForm() {
  const [state, action] = useFormState(signInWithPassword, passwordInitial);

  return (
    <form action={action} className="space-y-4">
      <div>
        <label
          htmlFor="login-email"
          className="block text-sm font-medium text-neutral-700 mb-1.5"
        >
          Email address
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@company.com"
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border border-neutral-200 bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="login-password"
          className="block text-sm font-medium text-neutral-700 mb-1.5"
        >
          Password
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border border-neutral-200 bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
          />
        </div>
      </div>

      {state.error && (
        <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{state.error}</span>
        </div>
      )}

      <PasswordSubmitButton />
    </form>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

type Tab = "magic" | "password";

export default function LoginPage() {
  const [tab, setTab] = useState<Tab>("magic");

  return (
    <section className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-neutral-900">Welcome back</h1>
          <p className="mt-2 text-sm text-neutral-600">
            Sign in to your MakersMark account
          </p>
        </div>

        <div className="p-6 rounded-xl shadow-card border border-neutral-200 bg-white space-y-5">
          {/* Google OAuth */}
          <GoogleOAuthButton />

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-neutral-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs text-neutral-500">or continue with email</span>
            </div>
          </div>

          {/* Tab toggle */}
          <div className="flex rounded-lg border border-neutral-200 overflow-hidden p-0.5 bg-neutral-50">
            <button
              type="button"
              onClick={() => setTab("magic")}
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
                tab === "magic"
                  ? "bg-white text-neutral-900 shadow-card"
                  : "text-neutral-500 hover:text-neutral-700"
              }`}
            >
              Magic link
            </button>
            <button
              type="button"
              onClick={() => setTab("password")}
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
                tab === "password"
                  ? "bg-white text-neutral-900 shadow-card"
                  : "text-neutral-500 hover:text-neutral-700"
              }`}
            >
              Password
            </button>
          </div>

          {/* Form content */}
          {tab === "magic" ? <MagicLinkForm /> : <PasswordLoginForm />}
        </div>

        <p className="mt-5 text-sm text-neutral-600 text-center">
          No account?{" "}
          <a href="/signup" className="text-primary-600 hover:underline font-medium">
            Sign up for free
          </a>
        </p>
      </div>
    </section>
  );
}
