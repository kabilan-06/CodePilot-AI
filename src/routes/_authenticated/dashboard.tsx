import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GradeBadge } from "@/components/review-detail";
import { reviewsQuery } from "@/lib/reviews";
import { SCORE_KEYS, SCORE_LABELS } from "@/lib/review-types";
import { Progress } from "@/components/ui/progress";
import { Sparkles, ShieldAlert, Gauge, FileCode2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — CodePilot AI" },
      {
        name: "description",
        content: "Track code health, review volume and open findings across your codebase.",
      },
      { property: "og:title", content: "Dashboard — CodePilot AI" },
      {
        property: "og:description",
        content: "Track code health, review volume and open findings.",
      },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { data: reviews = [], isLoading, isError, error } = useQuery(reviewsQuery);

  const total = reviews.length;
  const avgScore = total
    ? Math.round(reviews.reduce((sum, r) => sum + r.overall_score, 0) / total)
    : 0;
  const allIssues = reviews.flatMap((r) => r.issues);
  const critical = allIssues.filter(
    (i) => i.severity === "critical" || i.severity === "high",
  ).length;
  const avgScores = SCORE_KEYS.map((key) => ({
    key,
    value: total
      ? Math.round(reviews.reduce((sum, r) => sum + (r.scores?.[key] ?? 0), 0) / total)
      : 0,
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Your code health at a glance.</p>
        </div>
        <Button asChild>
          <Link to="/review">
            <Sparkles className="size-4" />
            New review
          </Link>
        </Button>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={FileCode2} label="Reviews run" value={String(total)} />
        <Stat icon={Gauge} label="Average score" value={total ? `${avgScore}/100` : "—"} />
        <Stat icon={ShieldAlert} label="High severity findings" value={String(critical)} />
        <Stat icon={Sparkles} label="Total findings" value={String(allIssues.length)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card className="glass-panel p-6">
          <h2 className="text-sm font-semibold text-muted-foreground">Recent reviews</h2>
          <div className="mt-4 space-y-3">
            {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
            {isError && (
              <p className="text-sm text-destructive">
                {error instanceof Error ? error.message : "Could not load reviews."}
              </p>
            )}
            {!isLoading && !isError && total === 0 && (
              <div className="rounded-lg border border-dashed border-border p-8 text-center">
                <p className="text-sm text-muted-foreground">No reviews yet.</p>
                <Button asChild variant="outline" className="mt-4">
                  <Link to="/review">Run your first review</Link>
                </Button>
              </div>
            )}
            {reviews.slice(0, 6).map((review) => (
              <Link
                key={review.id}
                to="/history/$reviewId"
                params={{ reviewId: review.id }}
                className="flex items-center gap-4 rounded-lg border border-border bg-card/50 p-4 transition-colors hover:border-primary/40"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{review.title}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="font-mono text-xs">
                      {review.language}
                    </Badge>
                    <span className="font-mono text-xs text-muted-foreground">
                      {review.issues.length} findings ·{" "}
                      {new Date(review.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <span className="font-mono text-sm font-bold">{review.grade}</span>
              </Link>
            ))}
          </div>
        </Card>

        <Card className="glass-panel p-6">
          <h2 className="text-sm font-semibold text-muted-foreground">Quality breakdown</h2>
          {total > 0 ? (
            <>
              <div className="mt-4 flex justify-center">
                <GradeBadge grade={reviews[0].grade} score={avgScore} />
              </div>
              <div className="mt-6 space-y-3">
                {avgScores.map((item) => (
                  <div key={item.key}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{SCORE_LABELS[item.key]}</span>
                      <span className="font-mono">{item.value}</span>
                    </div>
                    <Progress value={item.value} className="mt-1.5 h-1.5" />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              Metrics appear after your first review.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <Card className="glass-panel gap-2 p-5">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4" />
        <span className="text-xs">{label}</span>
      </div>
      <p className="font-mono text-2xl font-bold">{value}</p>
    </Card>
  );
}
