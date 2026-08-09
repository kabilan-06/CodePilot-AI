import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/card";
import { reviewsQuery } from "@/lib/reviews";
import { SCORE_KEYS, SCORE_LABELS } from "@/lib/review-types";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — CodePilot AI" },
      {
        name: "description",
        content: "Quality trends, severity mix and category hotspots across your reviews.",
      },
      { property: "og:title", content: "Analytics — CodePilot AI" },
      {
        property: "og:description",
        content: "Quality trends and severity mix across your reviews.",
      },
    ],
  }),
  component: AnalyticsPage,
});

const SEVERITY_COLORS: Record<string, string> = {
  critical: "var(--color-destructive)",
  high: "var(--color-destructive)",
  medium: "var(--color-warning)",
  low: "var(--color-success)",
};

function AnalyticsPage() {
  const { data: reviews = [] } = useQuery(reviewsQuery);

  const trend = [...reviews].reverse().map((review, index) => ({
    name: `#${index + 1}`,
    score: review.overall_score,
  }));

  const issues = reviews.flatMap((r) => r.issues);

  const severity = ["critical", "high", "medium", "low"]
    .map((level) => ({
      name: level,
      value: issues.filter((issue) => issue.severity === level).length,
    }))
    .filter((entry) => entry.value > 0);

  const categories = Object.entries(
    issues.reduce<Record<string, number>>((acc, issue) => {
      acc[issue.category] = (acc[issue.category] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const dimensions = SCORE_KEYS.map((key) => ({
    name: SCORE_LABELS[key],
    value: reviews.length
      ? Math.round(reviews.reduce((sum, r) => sum + (r.scores?.[key] ?? 0), 0) / reviews.length)
      : 0,
  }));

  if (reviews.length === 0) {
    return (
      <div className="mx-auto max-w-6xl">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <Card className="glass-panel mt-6 p-10 text-center text-sm text-muted-foreground">
          Run a few reviews to unlock trends and hotspots.
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Quality trends across {reviews.length} reviews and {issues.length} findings.
        </p>
      </header>

      <Card className="glass-panel p-6">
        <h2 className="text-sm font-semibold text-muted-foreground">Score trend</h2>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend}>
              <defs>
                <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={11} />
              <YAxis domain={[0, 100]} stroke="var(--color-muted-foreground)" fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="score"
                stroke="var(--color-primary)"
                fill="url(#scoreFill)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass-panel p-6">
          <h2 className="text-sm font-semibold text-muted-foreground">Severity mix</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={severity}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={90}
                >
                  {severity.map((entry) => (
                    <Cell key={entry.name} fill={SEVERITY_COLORS[entry.name]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="glass-panel p-6">
          <h2 className="text-sm font-semibold text-muted-foreground">Top issue categories</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categories} layout="vertical" margin={{ left: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis type="number" stroke="var(--color-muted-foreground)" fontSize={11} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={110}
                  stroke="var(--color-muted-foreground)"
                  fontSize={11}
                />
                <Tooltip
                  cursor={{ fill: "var(--color-muted)" }}
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="value" fill="var(--color-primary)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="glass-panel p-6">
        <h2 className="text-sm font-semibold text-muted-foreground">Average score by dimension</h2>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dimensions}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={10} />
              <YAxis domain={[0, 100]} stroke="var(--color-muted-foreground)" fontSize={11} />
              <Tooltip
                cursor={{ fill: "var(--color-muted)" }}
                contentStyle={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="value" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
