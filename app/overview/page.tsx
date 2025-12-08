export default function OverviewPage() {
  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
          Week at a glance
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Overview</h1>
        <p className="text-muted-foreground">
          Progress charts, productivity summaries, and backlog signals will render inside this
          view.
        </p>
      </header>
      <div className="rounded-2xl border border-dashed border-muted-foreground/30 p-6 text-muted-foreground">
        Overview insights placeholder.
      </div>
    </section>
  );
}

