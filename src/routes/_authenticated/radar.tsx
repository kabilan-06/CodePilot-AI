import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { runRadarScan, getRadarReport, listRadarReports } from "@/lib/radar/radar.functions";
import type { RadarMode, RadarReport } from "@/lib/radar/radar-types";
import { riskBand, riskColor } from "@/lib/radar/radar-types";
import { listGitHubBranches, listGitHubRepos } from "@/lib/github.functions";
import {
  Bot,
  Crosshair,
  FileWarning,
  History,
  Loader2,
  Radar,
  ShieldQuestion,
  Zap,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/radar")({
  validateSearch: (search: Record<string, unknown>) => ({
    owner: typeof search.owner === "string" ? search.owner : undefined,
    repo: typeof search.repo === "string" ? search.repo : undefined,
    ref: typeof search.ref === "string" ? search.ref : undefined,
    report: typeof search.report === "string" ? search.report : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Predictive Bug Radar — CodePilot AI" },
      {
        name: "description",
        content: "Evidence-based risk scoring and failure prediction for code changes.",
      },
    ],
  }),
  component: RadarPage,
});

function RadarPage() {
  const { owner, repo, ref, report: reportId } = Route.useSearch();
  const navigate = useNavigate();
  const runScan = useServerFn(runRadarScan);
  const loadReport = useServerFn(getRadarReport);
  const listReports = useServerFn(listRadarReports);

  const fetchRepos = useServerFn(listGitHubRepos);
  const fetchBranches = useServerFn(listGitHubBranches);

  const [repoValue, setRepoValue] = useState(owner && repo ? `${owner}/${repo}` : "");
  const [branch, setBranch] = useState(ref ?? "");
  const [mode, setMode] = useState<RadarMode>("full-repo");
  const [prNumber, setPrNumber] = useState("");
  const [commitSha, setCommitSha] = useState("");
  const [diff, setDiff] = useState("");
  const [report, setReport] = useState<RadarReport | null>(null);

  const reposQuery = useQuery({
    queryKey: ["github-repos"],
    queryFn: () => fetchRepos(),
    retry: false,
    staleTime: 60_000,
  });
  const branchesQuery = useQuery({
    queryKey: ["radar-branches", repoValue],
    queryFn: async () => {
      const [owner_, repo_] = repoValue.split("/");
      return fetchBranches({ data: { owner: owner_, repo: repo_ } });
    },
    enabled: repoValue.includes("/") && repoValue.split("/").every(Boolean),
    retry: false,
    staleTime: 60_000,
  });
  const historyQuery = useQuery({
    queryKey: ["radar-history"],
    queryFn: () => listReports(),
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!branch && branchesQuery.data?.length) setBranch(branchesQuery.data[0].name);
  }, [branchesQuery.data, branch]);

  const scanMutation = useMutation({
    mutationFn: async () => {
      const [owner_, repo_] = repoValue.split("/");
      return runScan({
        data: {
          owner: owner_,
          repo: repo_,
          ref: branch,
          mode,
          prNumber: mode === "pr" ? Number(prNumber) || undefined : undefined,
          commitSha: mode === "commit" ? commitSha : undefined,
          diff: mode === "diff" ? diff : undefined,
        },
      });
    },
    onSuccess: (data) => {
      setReport(data);
      navigate({
        to: "/radar",
        search: { owner: data.owner, repo: data.repo, ref: data.ref, report: data.id },
        replace: true,
      });
      toast.success("Radar scan complete.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Radar scan failed."),
  });

  // Load a deep-linked historical report.
  useEffect(() => {
    if (!reportId) return;
    loadReport({ data: { id: reportId } })
      .then((loaded) => setReport(loaded))
      .catch(() => toast.error("Radar report not found."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId]);

  const ready =
    repoValue.split("/").length === 2 &&
    repoValue.split("/").every(Boolean) &&
    branch &&
    (mode !== "pr" || prNumber) &&
    (mode !== "commit" || commitSha) &&
    (mode !== "diff" || diff.trim().length >= 20);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Radar className="size-5 text-primary" /> Predictive Bug Radar
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Evidence-based risk scores from churn, fan-in, complexity and your review history — plus
          AI failure predictions that must quote their evidence.
        </p>
      </header>

      <Card className="glass-panel space-y-4 p-5">
        <div className="grid gap-3 md:grid-cols-[1fr_200px]">
          <RepoSelect
            value={repoValue}
            onChange={setRepoValue}
            repos={reposQuery.data ?? []}
            loading={reposQuery.isLoading}
          />
          <div>
            <Label htmlFor="radar-branch" className="mb-1.5 block text-xs text-muted-foreground">
              Ref
            </Label>
            <Select value={branch} onValueChange={setBranch}>
              <SelectTrigger>
                <span className="truncate">{branch || "branch"}</span>
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {(branchesQuery.data ?? []).map((item) => (
                  <SelectItem key={item.name} value={item.name}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs value={mode} onValueChange={(value) => setMode(value as RadarMode)}>
          <TabsList>
            <TabsTrigger value="full-repo">Full repository</TabsTrigger>
            <TabsTrigger value="pr">Pull request</TabsTrigger>
            <TabsTrigger value="commit">Commit</TabsTrigger>
            <TabsTrigger value="diff">Pasted diff</TabsTrigger>
          </TabsList>
        </Tabs>

        {mode === "pr" && (
          <Input
            value={prNumber}
            onChange={(event) => setPrNumber(event.target.value.replace(/\D/g, ""))}
            placeholder="Pull request number, e.g. 42"
            className="max-w-64"
            inputMode="numeric"
          />
        )}
        {mode === "commit" && (
          <Input
            value={commitSha}
            onChange={(event) => setCommitSha(event.target.value.trim())}
            placeholder="Commit SHA or range like abc123..def456"
            className="max-w-md"
          />
        )}
        {mode === "diff" && (
          <Textarea
            value={diff}
            onChange={(event) => setDiff(event.target.value)}
            placeholder="Paste a unified diff (git diff output)…"
            className="min-h-32 font-mono text-xs"
          />
        )}

        <div className="flex items-center gap-3">
          <Button
            disabled={!ready || scanMutation.isPending}
            onClick={() => scanMutation.mutate()}
            className="gap-2"
          >
            {scanMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Zap className="size-4" />
            )}
            Run radar scan
          </Button>
          <Link
            to="/twin"
            search={{
              owner: repoValue.split("/")[0],
              repo: repoValue.split("/")[1] || "",
              ref: branch,
            }}
            className="text-xs text-muted-foreground underline"
          >
            View digital twin instead
          </Link>
        </div>
      </Card>

      {report && <ReportView report={report} repo={repoValue} />}

      {historyQuery.data?.length ? (
        <Card className="glass-panel p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <History className="size-4" /> Recent radar scans
          </h2>
          <div className="mt-3 space-y-2">
            {historyQuery.data.map((item) => (
              <button
                key={item.id}
                onClick={() => setReport(item)}
                className="flex w-full items-center gap-3 rounded-lg border border-border bg-card/50 p-3 text-left transition-colors hover:border-primary/40"
              >
                <span
                  className="font-mono text-sm font-bold"
                  style={{ color: riskColor(item.overallRisk) }}
                >
                  {item.overallRisk}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">
                  {item.owner}/{item.repo} · {item.mode}
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {new Date(item.createdAt).toLocaleString()}
                </span>
              </button>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function ReportView({ report, repo }: { report: RadarReport; repo: string }) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const band = riskBand(report.overallRisk);
  const riskyTarget = report.riskyFiles[0];
  const swarmTask = riskyTarget
    ? `Fix the radar-flagged risks in ${riskyTarget.path}: ${riskyTarget.reasons.slice(0, 2).join(" · ")}`
    : "Review flagged risks";
  const swarmLinkParts = repo.split("/");

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-[220px_1fr]">
        <Card className="glass-panel grid place-items-center p-6">
          <div className="text-center">
            <p
              className="font-mono text-6xl font-bold"
              style={{ color: riskColor(report.overallRisk) }}
            >
              {report.overallRisk}
            </p>
            <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">
              {band} risk
            </p>
            <div className="mt-4 space-y-1 text-xs text-muted-foreground">
              <p>
                static: {report.staticRisk} · AI: {report.aiRisk}
              </p>
              <div className="flex justify-center gap-1.5 pt-1">
                <Badge variant="secondary" className={report.coverage.twin ? "" : "opacity-50"}>
                  twin
                </Badge>
                <Badge variant="secondary" className={report.coverage.churn ? "" : "opacity-50"}>
                  churn
                </Badge>
                <Badge
                  variant="secondary"
                  className={report.coverage.pastFindings ? "" : "opacity-50"}
                >
                  history
                </Badge>
                <Badge variant="secondary" className={report.coverage.aiUsed ? "" : "opacity-50"}>
                  <Crosshair className="size-3" /> AI
                </Badge>
              </div>
            </div>
          </div>
        </Card>
        <Card className="glass-panel p-5">
          <p className="text-sm">{report.summary}</p>
          {report.coverage.aiNote && (
            <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
              <ShieldQuestion className="mt-0.5 size-3.5 shrink-0" /> {report.coverage.aiNote}
            </p>
          )}
          <p className="mt-3 font-mono text-xs text-muted-foreground">
            {report.owner}/{report.repo}@{report.ref} · {report.inputSummary} ·{" "}
            {new Date(report.generatedAt).toLocaleTimeString()}
          </p>
          {hasRepoParts(swarmLinkParts, report.ref) && (
            <Button asChild size="sm" variant="outline" className="mt-3 gap-2">
              <Link
                to="/swarm"
                search={{
                  owner: swarmLinkParts[0],
                  repo: swarmLinkParts[1],
                  ref: report.ref,
                  task: swarmTask,
                  run: undefined,
                }}
              >
                <Bot className="size-4" /> Dispatch swarm to fix top risk
              </Link>
            </Button>
          )}
        </Card>
      </div>

      <Card className="glass-panel p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <FileWarning className="size-4" /> Riskiest files
        </h2>
        <div className="mt-3 divide-y divide-border">
          {report.riskyFiles.map((file) => (
            <button
              key={file.path}
              onClick={() => setSelectedFile(selectedFile === file.path ? null : file.path)}
              className="flex w-full items-center gap-3 py-2.5 text-left"
            >
              <span
                className="w-8 font-mono text-sm font-bold"
                style={{ color: riskColor(file.score) }}
              >
                {file.score}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-mono text-xs" title={file.path}>
                  {file.path}
                </span>
                <Progress value={file.score} className="mt-1 h-1" />
              </span>
              <Badge variant="secondary">{riskBand(file.score)}</Badge>
            </button>
          ))}
        </div>
        {selectedFile && (
          <div className="mt-3 rounded-lg border border-border bg-card/60 p-3 text-xs">
            {report.riskyFiles
              .filter((file) => file.path === selectedFile)
              .flatMap((file) =>
                file.reasons.map((reason, index) => (
                  <p key={index} className="font-mono text-muted-foreground">
                    · {reason}
                  </p>
                )),
              )}
            <p className="mt-2 font-mono text-[10px] text-muted-foreground">
              signals: churn {fileSignal(report, selectedFile, "churn")} · fan-in{" "}
              {fileSignal(report, selectedFile, "fanIn")} · complexity{" "}
              {fileSignal(report, selectedFile, "complexity")} · history{" "}
              {fileSignal(report, selectedFile, "pastFindings")}
            </p>
          </div>
        )}
      </Card>

      {report.predictions.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">AI failure predictions</h2>
          {report.predictions.map((prediction, index) => (
            <Card key={index} className="glass-panel p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant={
                    prediction.severity === "critical" || prediction.severity === "high"
                      ? "destructive"
                      : "secondary"
                  }
                >
                  {prediction.severity}
                </Badge>
                <p className="text-sm font-semibold">{prediction.title}</p>
                <span className="font-mono text-xs text-muted-foreground">
                  p={prediction.probability}%
                </span>
                <span className="font-mono text-xs text-muted-foreground break-all">
                  {prediction.file}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{prediction.failure}</p>
              {prediction.evidence.length > 0 && (
                <div className="mt-2 rounded-lg bg-muted/60 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Evidence
                  </p>
                  {prediction.evidence.map((quote, quoteIndex) => (
                    <p
                      key={quoteIndex}
                      className="mt-1 font-mono text-xs break-all text-foreground/90"
                    >
                      “{quote}”
                    </p>
                  ))}
                </div>
              )}
              {prediction.mitigation && (
                <p className="mt-2 text-xs">
                  <span className="font-semibold">Mitigation:</span> {prediction.mitigation}
                </p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function hasRepoParts(parts: string[], ref: string): boolean {
  return parts.length === 2 && parts[0].length > 0 && parts[1].length > 0 && ref.length > 0;
}

function fileSignal(
  report: RadarReport,
  path: string,
  key: "churn" | "fanIn" | "complexity" | "pastFindings",
) {
  const file = report.riskyFiles.find((entry) => entry.path === path);
  const value = file?.[key] ?? (key === "churn" ? file?.churn : undefined);
  return value == null ? "n/a" : String(value);
}

function RepoSelect({
  value,
  onChange,
  repos,
  loading,
}: {
  value: string;
  onChange: (value: string) => void;
  repos: Array<{ full_name: string }>;
  loading: boolean;
}) {
  return (
    <div>
      <Label className="mb-1.5 block text-xs text-muted-foreground">Repository</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          {value ? (
            <SelectValue />
          ) : (
            <span className="text-muted-foreground">
              {loading ? "Loading…" : "Select a repository"}
            </span>
          )}
        </SelectTrigger>
        <SelectContent className="max-h-64">
          {repos.map((item) => (
            <SelectItem key={item.full_name} value={item.full_name}>
              {item.full_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
