export default function SettingsPage() {
  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
          Controls
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Appearance toggles, notification preferences, and sync options will be configured here.
        </p>
      </header>
      <div className="rounded-2xl border border-dashed border-muted-foreground/30 p-6 text-muted-foreground">
        Settings placeholder.
      </div>
    </section>
  );
}

