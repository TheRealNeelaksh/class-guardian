"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { loginAction, type LoginResult } from "./actions";
import { useAuthStore } from "@/lib/stores/auth-store";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setUser = useAuthStore((state) => state.setUser);

  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const presetEmail = searchParams?.get("email");
    setEmail(presetEmail ?? "");
  }, [searchParams]);

  const normalizeEmail = (value: string) => value.trim().toLowerCase();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setStatus("");

    const normalizedEmail = normalizeEmail(email);

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    if (pin.trim().length === 0) {
      setError("Enter your PIN.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result: LoginResult = await loginAction(normalizedEmail, pin);

      if (!result.ok) {
        setError(result.error ?? "Could not sign in. Please try again.");
        return;
      }

      if (!result.user) {
        setError("Could not sign in. Please try again.");
        return;
      }

      setUser(result.user);

      const hasSemesterData = Boolean(localStorage.getItem("classguard-semesters-ready"));
      setStatus("Signed in. Redirecting...");
      router.push(hasSemesterData ? "/today" : "/onboarding");
    } catch (err) {
      console.error(err);
      setError("Could not sign in. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="space-y-8">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Welcome back</p>
        <h1 className="text-3xl font-semibold tracking-tight">Log in</h1>
        <p className="text-muted-foreground">Enter your email and PIN to access your dashboard.</p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-2xl border border-border/70 bg-card/70 p-6 shadow-sm backdrop-blur"
      >
        <div className="space-y-2">
          <label className="text-sm font-medium">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-border/60 bg-background/60 px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/80 transition focus:border-primary focus:ring-2 focus:ring-primary/30 hover:border-primary/50"
            autoComplete="email"
            required
            placeholder="you@example.com"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">PIN</label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="w-full rounded-xl border border-border/60 bg-background/60 px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/80 transition focus:border-primary focus:ring-2 focus:ring-primary/30 hover:border-primary/50"
            placeholder="••••"
            required
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {status && <p className="text-sm text-emerald-600">{status}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90 hover:shadow-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Checking..." : "Sign In"}
        </button>

        <p className="text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            Create one
          </Link>
        </p>
      </form>
    </section>
  );
}
