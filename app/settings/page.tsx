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
    <div className="container py-8 h-full overflow-y-auto">
      <section className="space-y-8 max-w-2xl mx-auto">
        <header className="space-y-1">
          <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Controls</p>
          <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account and application preferences.
          </p>
        </header>

        {/* Profile Section */}
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">Profile</h2>
          </div>
          <div className="p-6 flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-xl font-bold text-neutral-500 dark:text-neutral-400">
              {useAuthStore.getState().user?.name?.[0]?.toUpperCase() || '?'}
            </div>
            <div>
              <h3 className="text-lg font-medium">{useAuthStore.getState().user?.name || 'Guest'}</h3>
              <p className="text-sm text-muted-foreground">{useAuthStore.getState().user?.email || 'No email linked'}</p>
            </div>
          </div>
        </div>

        {/* Schedule Management */}
        <div
          className="group rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden shadow-sm cursor-pointer hover:border-primary/50 transition-all"
          onClick={() => router.push('/settings/schedule')}
        >
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                {/* Calendar Icon */}
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-calendar-cog"><path d="M21 10.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h5.5" /><path d="M16 2v4" /><path d="M3 10h18" /><circle cx="18" cy="18" r="3" /><path d="m19.5 14.3-.4.9" /><path d="m16.9 20.8-.4.9" /><path d="m21.7 19.5-.9.4" /><path d="m15.2 16.9-.9.4" /><path d="m21.7 16.5-.9-.4" /><path d="m15.2 19.1-.9-.4" /><path d="m19.5 21.7-.4-.9" /><path d="m16.9 15.2-.4-.9" /></svg>
              </div>
              <div>
                <h3 className="text-lg font-medium group-hover:text-primary transition-colors">Calendar & Schedule</h3>
                <p className="text-sm text-muted-foreground">Manage holidays and exam blocks</p>
              </div>
            </div>
            <div className="text-muted-foreground group-hover:translate-x-1 transition-transform">
              →
            </div>
          </div>
        </div>

        {/* App Info Section */}
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">About</h2>
          </div>
          <div className="p-6 space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Version</span>
              <span className="font-mono">v0.1.0 (Alpha)</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Build</span>
              <span className="font-mono">Development</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-4">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-8 py-3 text-sm font-semibold transition-all hover:bg-red-200 dark:hover:bg-red-900/50 hover:shadow-sm"
          >
            Log Out
          </button>
        </div>
      </section>
    </div>
  );
}

