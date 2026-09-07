import type { ReactNode } from "react";

/**
 * Standard page frame. Every top-level route renders inside this so container
 * width, horizontal padding and vertical rhythm are identical app-wide.
 *
 * Do NOT add `min-h-screen` here or in consumers — __root.tsx already owns
 * full-height layout. Nesting a second one produces phantom scroll on mobile.
 */
export function PageShell({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</div>;
}

/**
 * Page title block.
 *
 * There is deliberately no metric-tile slot. Collection statistics
 * ("115 SPOTS · 18 LOOT TABLES") are diagnostics, not content, and belong in
 * /data-check. If a page needs to lead with a figure, that figure should be
 * something the player acts on, not a row count.
 *
 * `eyebrow` carries section context on nested pages (e.g. "Compendium").
 * `actions` sits top-right on desktop and wraps under the title on mobile.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="border-b border-border pb-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">{eyebrow}</p>
          ) : null}
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
          {description ? (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </div>
      {children ? <div className="mt-5">{children}</div> : null}
    </header>
  );
}

/**
 * Major block within a page. `id` is required when `title` is set so the
 * aria-labelledby link resolves.
 */
export function PageSection({
  title,
  id,
  description,
  actions,
  children,
}: {
  title?: string;
  id?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mt-8" aria-labelledby={title && id ? id : undefined}>
      {title ? (
        <div className="mb-3 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <h2 id={id} className="text-lg font-bold">
              {title}
            </h2>
            {description ? (
              <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/** Empty-state block for filtered lists that return nothing. */
export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center">
      <p className="text-sm font-semibold">{title}</p>
      {body ? <p className="mt-1 text-sm text-muted-foreground">{body}</p> : null}
    </div>
  );
}
