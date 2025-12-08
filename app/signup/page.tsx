"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { getDb, type ToneMode } from "@/lib/db";
import { similarityScore } from "@/lib/levenshtein";
import { useAuthStore } from "@/lib/stores/auth-store";
import { signupAction, type SignupResult } from "./actions";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PIN_REGEX = /^\d{4}$/;

type PendingUser = {
  email: string;
  pin: string;
  toneMode: ToneMode;
};

export default function SignupPage() {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);

  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [enableConfirm, setEnableConfirm] = useState(false);
  const [pin, setPin] = useState("");
  const [toneMode, setToneMode] = useState<ToneMode>("standard");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [similarEmail, setSimilarEmail] = useState<string | null>(null);
  const [pendingUser, setPendingUser] = useState<PendingUser | null>(null);
  const [showSimilarityModal, setShowSimilarityModal] = useState(false);

  const normalizeEmail = (value: string) => value.trim().toLowerCase();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setStatus("");
    setSimilarEmail(null);

    const normalizedEmail = normalizeEmail(email);

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    if (enableConfirm && normalizeEmail(confirmEmail) !== normalizedEmail) {
      setError("Emails do not match.");
      return;
    }

    if (!PIN_REGEX.test(pin)) {
      setError("PIN must be exactly 4 digits.");
      return;
    }

    setIsSubmitting(true);

    try {
      const db = getDb();
      const existing = await db.users.where("email").equals(normalizedEmail).first();

      if (existing) {
        setError("This email is already linked to an account. Log in instead.");
        return;
      }

      const users = await db.users.toArray();
      const similar = users.find((user) => similarityScore(normalizedEmail, user.email) > 75);

      if (similar) {
        setSimilarEmail(similar.email);
        setPendingUser({ email: normalizedEmail, pin, toneMode });
        setShowSimilarityModal(true);
        return;
      }

      await finalizeSignup({ email: normalizedEmail, pin, toneMode });
    } catch (err) {
      console.error(err);
      setError("Could not complete signup. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const finalizeSignup = async ({
    email: normalizedEmail,
    pin: pinValue,
    toneMode: selectedTone,
  }: PendingUser) => {
    const result: SignupResult = await signupAction(normalizedEmail, pinValue, selectedTone);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setUser(result.user);
    setStatus("Account created. Redirecting...");
    router.push("/onboarding");
  };

  const handleContinueAnyway = async () => {
    if (!pendingUser) return;
    setIsSubmitting(true);
    try {
      await finalizeSignup(pendingUser);
    } catch (err) {
      console.error(err);
      setError("Could not complete signup. Please try again.");
    } finally {
      setShowSimilarityModal(false);
      setIsSubmitting(false);
    }
  };

  const handleLoginInstead = () => {
    router.push(`/login?email=${encodeURIComponent(email)}`);
  };

  return (
    <section className="space-y-8">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Create account</p>
        <h1 className="text-3xl font-semibold tracking-tight">Sign up</h1>
        <p className="text-muted-foreground">
          Secure your account with a 4-digit PIN. Keep it memorable.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border p-6 shadow-sm">
        <div className="space-y-2">
          <label className="text-sm font-medium">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            required
            autoComplete="email"
            placeholder="you@example.com"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            id="enableConfirm"
            type="checkbox"
            checked={enableConfirm}
            onChange={(e) => setEnableConfirm(e.target.checked)}
            className="h-4 w-4 rounded border"
          />
          <label htmlFor="enableConfirm" className="text-sm text-muted-foreground">
            Add email confirmation
          </label>
        </div>

        {enableConfirm && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Confirm Email</label>
            <input
              type="email"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              autoComplete="email"
            />
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium">PIN (4 digits)</label>
          <input
            type="password"
            inputMode="numeric"
            pattern="\d{4}"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            placeholder="••••"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Tone mode</label>
          <select
            value={toneMode}
            onChange={(e) => setToneMode(e.target.value as ToneMode)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
            <option value="standard">Standard</option>
            <option value="roast">Roast</option>
            <option value="auto">Auto</option>
          </select>
          <p className="text-xs text-muted-foreground">
            Choose how playful or direct your messages should be.
          </p>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {status && <p className="text-sm text-emerald-600">{status}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Working..." : "Continue"}
        </button>

        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Log in
          </Link>
        </p>
      </form>

      {showSimilarityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-lg">
            <h3 className="text-lg font-semibold">Similar account detected</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              A similar account exists ({similarEmail ?? "another email"}). Are you sure you&apos;re
              not trying to log in instead?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleLoginInstead}
                className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
              >
                Log in Instead
              </button>
              <button
                type="button"
                onClick={handleContinueAnyway}
                className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Continue Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

