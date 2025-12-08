"use client";

import { useRouter } from "next/navigation";

import { useAuthStore } from "@/lib/stores/auth-store";

export default function SettingsPage() {
  const clearUser = useAuthStore((state) => state.clearUser);
  const router = useRouter();

  const handleLogout = () => {
    clearUser();
    router.push("/login");
  };

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Controls</p>
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Appearance toggles, notification preferences, and sync options will be configured here.
        </p>
      </header>
      <div className="space-y-4 rounded-2xl border border-dashed border-muted-foreground/30 p-6 text-muted-foreground">
        <p>Settings placeholder.</p>
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center justify-center rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition hover:brightness-95"
        >
          Log Out
        </button>
      </div>
    </section>
  );
}

