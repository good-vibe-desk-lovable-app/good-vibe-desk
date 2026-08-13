import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, MessageSquareQuote, Split } from "lucide-react";

import {
  INACCESSIBLE_SOURCES,
  OPINION_CARDS,
  mayBeOutdated,
  type OpinionCard,
} from "@/data/opinions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TITLE = "Palworld Community Opinion — Raids, Base Pals and Known Quirks";
const DESCRIPTION =
  "What players and guide writers actually say about Palworld raid armies, base workers and buggy Pals — every claim quoted verbatim with its source, kept separate from the computed tier lists.";
const SITE = "https://good-vibe-desk.lovable.app/opinions";

export const Route = createFileRoute("/opinions")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: SITE },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: SITE }],
  }),
  component: OpinionsPage,
});

function OpinionCardView({ card }: { card: OpinionCard }) {
  return (
    <Card className="border-border/70 bg-card/80">
      <CardHeader className="space-y-2">
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          {card.disagreement ? <Split className="size-4 text-warning" /> : null}
          {card.title}
        </CardTitle>
        {card.disagreement ? (
          <p className="text-xs font-semibold text-warning">
            Sources disagree — both positions are shown; neither is averaged away.
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground">{card.context}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {card.sources.map((s) => (
          <figure
            key={s.url + s.quote.slice(0, 24)}
            className="rounded-xl border border-border/70 bg-background/40 p-3"
          >
            <blockquote className="border-l-2 border-primary/60 pl-3 text-sm italic">
              “{s.quote}”
            </blockquote>
            <figcaption className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <a
                href={s.url}
                target="_blank"
                rel="noreferrer noopener"
                className="underline underline-offset-4"
              >
                {s.name}
              </a>
              <span>{s.date ?? "undated"}</span>
              {mayBeOutdated(s.date) ? (
                <Badge variant="outline" className="text-[10px]">
                  may be outdated
                </Badge>
              ) : null}
            </figcaption>
          </figure>
        ))}
      </CardContent>
    </Card>
  );
}

const TOPICS = [
  { key: "raid", label: "Raids" },
  { key: "base", label: "Base work" },
  { key: "quirk", label: "Known quirks" },
] as const;

function OpinionsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <header className="mb-6">
        <Link to="/" className="text-xs text-muted-foreground underline underline-offset-4">
          ← Breeding pathfinder
        </Link>
        <h1 className="mt-3 flex items-center gap-2 text-3xl font-bold">
          <MessageSquareQuote className="size-6 text-primary" /> Community opinion
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Everything on this page is somebody's judgement, quoted in their own words with a link and
          a date. None of it touches the{" "}
          <Link to="/tiers" className="underline underline-offset-4">
            computed tier lists
          </Link>{" "}
          — those come only from the game's own data. Where people disagree, you get both, because
          the disagreement is the useful part.
        </p>
      </header>

      <Tabs defaultValue="raid">
        <TabsList className="w-full">
          {TOPICS.map((t) => (
            <TabsTrigger key={t.key} value={t.key}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {TOPICS.map((t) => {
          const cards = OPINION_CARDS.filter((c) => c.topic === t.key);
          return (
            <TabsContent key={t.key} value={t.key} className="space-y-4 pt-4">
              {cards.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nothing well-sourced yet for this topic. A thin page beats a padded one.
                </p>
              ) : (
                cards.map((c) => <OpinionCardView key={c.id} card={c} />)
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      <section className="mt-8 rounded-xl border border-dashed border-border/70 p-3 text-xs text-muted-foreground">
        <p className="mb-2 flex items-center gap-2 font-medium text-foreground">
          <AlertTriangle className="size-3.5" /> Sources we could not read
        </p>
        <ul className="space-y-1">
          {INACCESSIBLE_SOURCES.map((s) => (
            <li key={s.url}>
              <span className="text-foreground">{s.name}</span> — {s.reason}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
