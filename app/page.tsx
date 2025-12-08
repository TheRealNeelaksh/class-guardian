import Link from "next/link";

const ROUTES = [
  { href: "/today", label: "Today" },
  { href: "/overview", label: "Overview" },
  { href: "/study", label: "Study" },
  { href: "/planner", label: "Planner" },
  { href: "/settings", label: "Settings" },
];

export default function Home() {
  return (
    <section className="space-y-8">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
          Welcome to
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-primary sm:text-5xl">
          ClassGuard
        </h1>
        <p className="max-w-2xl text-base text-muted-foreground">
          The foundational scaffolding is ready. Use the tabs below or these quick links to
          explore each placeholder page as we prepare to layer in study flows, schedules, and
          local data.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {ROUTES.map((route) => (
          <Link
            key={route.href}
            href={route.href}
            className="rounded-xl border bg-card p-6 text-card-foreground transition hover:border-primary/40 hover:bg-card/60"
          >
            <p className="text-lg font-medium">{route.label}</p>
            <p className="text-sm text-muted-foreground">Placeholder layout ready.</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
