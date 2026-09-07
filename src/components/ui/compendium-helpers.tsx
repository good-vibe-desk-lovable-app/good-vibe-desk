import type { ComponentType, ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/ui/page-header";

export function BackLink() {
  return (
    <Button asChild variant="ghost" size="sm" className="mb-5 -ml-2 min-h-[44px]">
      <Link to="/compendium">
        <ArrowLeft className="size-4" />
        Back to the compendium
      </Link>
    </Button>
  );
}

export function FilterButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-[44px] sm:min-h-0 h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-input bg-background text-foreground hover:bg-accent"
      }`}
    >
      {children}
    </button>
  );
}

export function Fact({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string | null;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={`mt-1 break-words font-medium ${mono ? "font-mono text-xs" : ""}`}>
        {value ?? "UNKNOWN"}
      </dd>
    </div>
  );
}

export function Eyebrow({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
      {icon}
      {children}
    </span>
  );
}

export function SectionHeader({
  icon,
  title,
  count,
}: {
  icon?: ReactNode;
  title: string;
  count: number;
}) {
  return (
    <div className="flex items-center gap-2 border-b pb-2">
      {icon}
      <h2 className="text-lg font-bold tracking-tight">{title}</h2>
      <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
        {count}
      </span>
    </div>
  );
}

export function PackFeedback({
  loading,
  error,
  icon: Icon,
  packName = "Compendium",
  loadingBody = "Preparing the cached offline knowledge directory.",
}: {
  loading: boolean;
  error: Error | null;
  icon?: ComponentType<{ className?: string }>;
  packName?: string;
  loadingBody?: string;
}) {
  return (
    <PageShell>
      <main className="mx-auto max-w-xl rounded-2xl border bg-card p-6 text-center shadow-sm">
        {Icon ? <Icon className="mx-auto size-7 text-primary" /> : null}
        <h1 className="mt-3 text-xl font-bold">
          {loading ? `Loading ${packName}` : `${packName} pack unavailable`}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {loading
            ? loadingBody
            : (error?.message ?? "The offline knowledge pack could not be read.")}
        </p>
        <Button asChild variant="outline" className="mt-5 min-h-[44px]">
          <Link to="/compendium">Back to the compendium</Link>
        </Button>
      </main>
    </PageShell>
  );
}
