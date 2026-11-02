import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GradeBadge } from "@/components/review-detail";
import { reviewsQuery } from "@/lib/reviews";
import { listApprovals } from "@/lib/approval.functions";
import { listRecentTwins } from "@/lib/twin/twin.functions";
import { listRadarReports } from "@/lib/radar/radar.functions";
import { listSwarmRuns } from "@/lib/swarm/swarm.functions";
import { listHealRuns } from "@/lib/healing/healing.functions";
import { listVisualQaRuns } from "@/lib/vqa/vqa.functions";
import { riskBand, riskColor } from "@/lib/radar/radar-types";
import { SCORE_KEYS, SCORE_LABELS } from "@/lib/review-types";
import { Progress } from "@/components/ui/progress";
import {
  Sparkles,
  ShieldAlert,
  Gauge,
  FileCode2,
  Network,
  Radar,
  Bot,
  HeartPulse,
  ScanEye,
  ChevronRight,
} from "lucide-react";

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

      <MissionControl />

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

/** Live status strip across the five signature initiatives + approval gate. */
function MissionControl() {
  const twinsFn = useServerFn(listRecentTwins);
  const radarFn = useServerFn(listRadarReports);
  const swarmFn = useServerFn(listSwarmRuns);
  const healFn = useServerFn(listHealRuns);
  const vqaFn = useServerFn(listVisualQaRuns);
  const approvalsFn = useServerFn(listApprovals);

  const twins = useQuery({ queryKey: ["mc-twins"], queryFn: () => twinsFn(), staleTime: 60_000 });
  const reports = useQuery({ queryKey: ["mc-radar"], queryFn: () => radarFn(), staleTime: 60_000 });
  const swarmRuns = useQuery({
    queryKey: ["mc-swarm"],
    queryFn: () => swarmFn(),
    staleTime: 60_000,
  });
  const healRuns = useQuery({ queryKey: ["mc-heal"], queryFn: () => healFn(), staleTime: 60_000 });
  const vqaRuns = useQuery({ queryKey: ["mc-vqa"], queryFn: () => vqaFn(), staleTime: 60_000 });
  const approvals = useQuery({
    queryKey: ["mc-approvals"],
    queryFn: () => approvalsFn(),
    staleTime: 15_000,
  });

  const latestTwin = twins.data?.[0];
  const latestReport = reports.data?.[0];
  const latestSwarm = swarmRuns.data?.[0];
  const latestHeal = healRuns.data?.[0];
  const latestVqa = vqaRuns.data?.[0];
  const pending = (approvals.data ?? []).filter((item) => item.status === "pending");
  const healPending = pending[0]?.kind.startsWith("heal.") ?? false;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground">Mission Control</h2>
        {pending.length > 0 &&
          (healPending ? (
            <Link
              to="/healing"
              search={{ owner: undefined, repo: undefined, ref: undefined }}
              className="flex items-center gap-2 rounded-full border border-warning/50 bg-warning/10 px-3 py-1 text-xs font-medium text-warning transition-colors hover:bg-warning/20"
            >
              <ShieldAlert className="size-3.5" />
              {pending.length} approval{pending.length > 1 ? "s" : ""} awaiting your decision
            </Link>
          ) : (
            <Link
              to="/swarm"
              search={{
                owner: undefined,
                repo: undefined,
                ref: undefined,
                task: undefined,
                run: undefined,
              }}
              className="flex items-center gap-2 rounded-full border border-warning/50 bg-warning/10 px-3 py-1 text-xs font-medium text-warning transition-colors hover:bg-warning/20"
            >
              <ShieldAlert className="size-3.5" />
              {pending.length} approval{pending.length > 1 ? "s" : ""} awaiting your decision
            </Link>
          ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Link
          to="/twin"
          search={{ owner: undefined, repo: undefined, ref: undefined }}
          className="group flex flex-col gap-1.5 rounded-lg border border-border bg-card/50 p-4 transition-colors hover:border-primary/40"
        >
          <TileHead icon={Network} title="Digital Twin" />
          <TileInfo
            status={latestTwin ? `${latestTwin.owner}/${latestTwin.repo}` : "Not mapped yet"}
            meta={
              latestTwin ? `${latestTwin.fileCount} files on ${latestTwin.ref}` : "Map a repository"
            }
          />
        </Link>
        <Link
          to="/radar"
          search={{ owner: undefined, repo: undefined, ref: undefined, report: undefined }}
          className="group flex flex-col gap-1.5 rounded-lg border border-border bg-card/50 p-4 transition-colors hover:border-primary/40"
        >
          <TileHead icon={Radar} title="Bug Radar" />
          <TileInfo
            status={latestReport ? riskBand(latestReport.overallRisk) : "No scans yet"}
            statusStyle={{ color: riskColor(latestReport?.overallRisk ?? 0) }}
            meta={
              latestReport
                ? `risk ${latestReport.overallRisk}/100 · ${latestReport.mode}`
                : "Scan a diff or repo"
            }
          />
        </Link>
        <Link
          to="/swarm"
          search={{
            owner: undefined,
            repo: undefined,
            ref: undefined,
            task: undefined,
            run: undefined,
          }}
          className="group flex flex-col gap-1.5 rounded-lg border border-border bg-card/50 p-4 transition-colors hover:border-primary/40"
        >
          <TileHead icon={Bot} title="Agent Swarm" />
          <TileInfo
            status={latestSwarm ? latestSwarm.status : "No runs yet"}
            meta={latestSwarm ? latestSwarm.task : "Dispatch five agents on a real task"}
          />
        </Link>
        <Link
          to="/healing"
          search={{ owner: undefined, repo: undefined, ref: undefined }}
          className="group flex flex-col gap-1.5 rounded-lg border border-border bg-card/50 p-4 transition-colors hover:border-primary/40"
        >
          <TileHead icon={HeartPulse} title="Self-Healing" />
          <TileInfo
            status={latestHeal ? latestHeal.status : "No runs yet"}
            meta={
              latestHeal ? latestHeal.errorText.slice(0, 60) : "Diagnose a real error in a sandbox"
            }
          />
        </Link>
        <Link
          to="/visual-qa"
          search={{ target: undefined, label: undefined }}
          className="group flex flex-col gap-1.5 rounded-lg border border-border bg-card/50 p-4 transition-colors hover:border-primary/40"
        >
          <TileHead icon={ScanEye} title="Visual QA" />
          <TileInfo
            status={
              latestVqa
                ? latestVqa.analysis
                  ? `${latestVqa.analysis.defects.length} defect(s)`
                  : latestVqa.checks.some((check) => !check.pass)
                    ? "audit findings"
                    : "audit clean"
                : "Not audited yet"
            }
            meta={
              latestVqa
                ? latestVqa.targetUrl || latestVqa.label || "screenshots"
                : "Pixel-diff a release"
            }
          />
        </Link>
      </div>
    </section>
  );
}

function TileHead({
  icon: Icon,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-xs font-semibold">
        <Icon className="size-3.5 text-primary" />
        {title}
      </span>
      <ChevronRight className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </div>
  );
}

function TileInfo({
  status,
  statusStyle,
  meta,
}: {
  status: string;
  statusStyle?: React.CSSProperties;
  meta: string;
}) {
  return (
    <>
      <p className="truncate font-mono text-sm font-medium capitalize" style={statusStyle}>
        {status}
      </p>
      <p className="truncate text-xs text-muted-foreground">{meta}</p>
    </>
  );
}
