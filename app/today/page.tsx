export default function TodayPage() {
  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
          Daily briefing
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Today</h1>
        <p className="text-muted-foreground">
          A focused view for urgent classes, tasks, and quick wins. Widgets, cards, and alerts
          will land here in later phases.
        </p>
      </header>
      <div className="rounded-2xl border border-dashed border-muted-foreground/30 p-6 text-muted-foreground">
        Daily metrics and reminders placeholder.
      </div>
    </section>
  );
}

