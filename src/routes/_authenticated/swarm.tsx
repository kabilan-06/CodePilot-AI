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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  runSwarm,
  getSwarmRun,
  listSwarmRuns,
  requestSwarmBranchApproval,
  createSwarmBranch,
} from "@/lib/swarm/swarm.functions";
import { decideApproval } from "@/lib/approval.functions";
import type { SwarmRun } from "@/lib/swarm/swarm-types";
import { AgentAvatar } from "@/components/squad/agent-avatar";
import { DiffView } from "@/components/squad/diff-view";
import {
  Bot,
  CheckCircle2,
  ExternalLink,
  GitBranch,
  History,
  Loader2,
  ShieldCheck,
  Users,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/swarm")({
  validateSearch: (search: Record<string, unknown>) => ({
    owner: typeof search.owner === "string" ? search.owner : undefined,
    repo: typeof search.repo === "string" ? search.repo : undefined,
    ref: typeof search.ref === "string" ? search.ref : undefined,
    task: typeof search.task === "string" ? search.task : undefined,
    run: typeof search.run === "string" ? search.run : undefined,
  }),
  head: () => ({
    meta: [
      { title: "AI Developer Swarm — CodePilot AI" },
      {
        name: "description",
        content:
          "Architect, Developer, Security, Tester and Reviewer agents collaborating on real tasks.",
      },
    ],
  }),
  component: SwarmPage,
});

function SwarmPage() {
  const { owner, repo, ref, task, run: runId } = Route.useSearch();
  const navigate = useNavigate();
  const startSwarm = useServerFn(runSwarm);
  const loadRun = useServerFn(getSwarmRun);
  const listRuns = useServerFn(listSwarmRuns);
  const requestBranchApproval = useServerFn(requestSwarmBranchApproval);
  const createBranch = useServerFn(createSwarmBranch);
  const decide = useServerFn(decideApproval);

  const [repoValue, setRepoValue] = useState(owner && repo ? `${owner}/${repo}` : "");
  const [branch, setBranch] = useState(ref ?? "main");
  const [taskText, setTaskText] = useState(task ?? "");
  const [starting, setStarting] = useState(false);
  const [run, setRun] = useState<SwarmRun | null>(null);
  const [artifactTab, setArtifactTab] = useState("plan");
  const [approval, setApproval] = useState<{ id: string; status: string } | null>(null);
  const [branchResult, setBranchResult] = useState<{ branch: string; url: string } | null>(null);

  const runsQuery = useQuery({
    queryKey: ["swarm-runs"],
    queryFn: () => listRuns(),
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!runId) return;
    loadRun({ data: { id: runId } })
      .then(setRun)
      .catch((error) => toast.error(error instanceof Error ? error.message : "Run not found."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  useEffect(() => {
    if (task) setTaskText(task);
  }, [task]);

  const configured = repoValue.split("/").every(Boolean) && branch && taskText.trim().length >= 12;
  const patches = run?.artifacts.patches ?? [];
  const verdict = run?.verdict ?? null;

  const branchApprovalMutation = useMutation({
    mutationFn: () => {
      if (!run) throw new Error("Run missing");
      return requestBranchApproval({ data: { runId: run.id } });
    },
    onSuccess: (created) => {
      setApproval({ id: created.id, status: created.status });
      toast.success("Approval request created — approve it below to write the branch.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not request approval."),
  });

  const approveMutation = useMutation({
    mutationFn: async (decision: "approved" | "rejected") => {
      if (!approval) throw new Error("Approval request missing");
      return decide({ data: { id: approval.id, decision } });
    },
    onSuccess: (updated) => {
      setApproval((current) => (current ? { ...current, status: updated.status } : current));
      toast.success(
        updated.status === "approved" ? "Approved — you can now create the branch." : "Rejected.",
      );
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not record decision."),
  });

  const createBranchMutation = useMutation({
    mutationFn: async () => {
      if (!run || !approval) throw new Error("Approval not granted");
      return createBranch({ data: { runId: run.id, approvalId: approval.id } });
    },
    onSuccess: (result) => {
      setBranchResult({ branch: result.branch, url: result.url });
      toast.success(`Branch ${result.branch} created.`);
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Branch creation failed."),
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Users className="size-5 text-primary" /> AI Developer Swarm
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Five specialized agents — Architect, Developer, Security, Tester, Reviewer — collaborate
          over real repository data. Patches are artifacts until you approve them.
        </p>
      </header>

      <Card className="glass-panel space-y-3 p-5">
        <div className="grid gap-3 md:grid-cols-[1fr_180px]">
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">Repository</Label>
            <Input
              value={repoValue}
              onChange={(event) => setRepoValue(event.target.value)}
              placeholder="owner/repository"
              className="font-mono text-sm"
            />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">Ref</Label>
            <Input
              value={branch}
              onChange={(event) => setBranch(event.target.value)}
              placeholder="main"
              className="font-mono text-sm"
            />
          </div>
        </div>
        <div>
          <Label className="mb-1.5 block text-xs text-muted-foreground">Task for the swarm</Label>
          <Textarea
            value={taskText}
            onChange={(event) => setTaskText(event.target.value)}
            placeholder="e.g. Add rate limiting to the login endpoint and cover it with tests"
            className="min-h-24"
          />
        </div>
        <div className="flex items-center gap-3">
          <Button
            className="gap-2"
            disabled={!configured || starting}
            onClick={async () => {
              setStarting(true);
              try {
                const [owner_, repo_] = repoValue.split("/");
                const started = await startSwarm({
                  data: { owner: owner_, repo: repo_, ref: branch, task: taskText },
                });
                setRun(started);
                setApproval(null);
                setBranchResult(null);
                navigate({
                  to: "/swarm",
                  search: {
                    owner: owner_,
                    repo: repo_,
                    ref: started.ref,
                    task: undefined,
                    run: started.id,
                  },
                  replace: true,
                });
                toast.success("Swarm run complete.");
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Swarm run failed.");
              } finally {
                setStarting(false);
              }
            }}
          >
            {starting && <Loader2 className="size-4 animate-spin" />}
            <Bot className="size-4" />
            Dispatch swarm
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
            Browse the digital twin first
          </Link>
        </div>
      </Card>

      {run && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <Card className="glass-panel p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-muted-foreground">Agent room</h2>
              <Badge
                variant={
                  run.status === "complete"
                    ? "secondary"
                    : run.status === "failed"
                      ? "destructive"
                      : "outline"
                }
              >
                {run.status}
              </Badge>
            </div>
            <div className="space-y-4">
              {run.transcript.map((entry, index) => (
                <div key={index} className="flex gap-3">
                  <AgentAvatar role={entry.role} />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold">{roleLabel(entry.role)}</p>
                    <p className="text-sm text-muted-foreground break-words">{entry.message}</p>
                    <p className="mt-0.5 font-mono text-[10px] text-muted-foreground/60">
                      {new Date(entry.ts).toLocaleTimeString()}
                      {entry.artifacts?.length ? ` · artifacts: ${entry.artifacts.join(", ")}` : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div className="space-y-4">
            <Tabs value={artifactTab} onValueChange={setArtifactTab}>
              <TabsList className="w-full">
                <TabsTrigger value="plan" className="text-xs">
                  Plan
                </TabsTrigger>
                <TabsTrigger value="patches" className="text-xs">
                  Patch
                </TabsTrigger>
                <TabsTrigger value="security" className="text-xs">
                  Security
                </TabsTrigger>
                <TabsTrigger value="tests" className="text-xs">
                  Tests
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {artifactTab === "plan" && run.artifacts.plan && (
              <Card className="glass-panel space-y-2 p-4 text-xs">
                <Section title="Objectives" items={run.artifacts.plan.objectives} />
                <Section title="Steps" items={run.artifacts.plan.steps} numbered />
                <Section title="Files to modify" items={run.artifacts.plan.filesToModify} mono />
                <Section title="Risks" items={run.artifacts.plan.risks} />
              </Card>
            )}

            {artifactTab === "patches" && (
              <div className="space-y-3">
                {patches.length === 0 && (
                  <p className="text-xs text-muted-foreground">No patch artifacts in this run.</p>
                )}
                {patches.map((patch) => (
                  <DiffView key={patch.path} patch={patch} />
                ))}
              </div>
            )}

            {artifactTab === "security" && run.artifacts.security && (
              <Card className="glass-panel p-4 text-xs">
                <div className="flex items-center gap-2">
                  <ShieldCheck
                    className={`size-4 ${run.artifacts.security.approvable ? "text-success" : "text-destructive"}`}
                  />
                  <p className="text-sm font-semibold">
                    {run.artifacts.security.approvable ? "Gate passed" : "Blocked findings"}
                  </p>
                  <Badge variant="secondary">iterations {run.artifacts.security.iterations}</Badge>
                </div>
                <div className="mt-3 space-y-2">
                  {run.artifacts.security.findings.map((finding, index) => (
                    <p key={index} className="font-mono text-[11px]">
                      [{finding.severity}] {finding.title} — {finding.detail}
                    </p>
                  ))}
                  {run.artifacts.security.instructions.length > 0 && (
                    <div className="rounded border border-border bg-muted/40 p-2">
                      <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                        Fix instructions
                      </p>
                      {run.artifacts.security.instructions.map((instruction, index) => (
                        <p key={index} className="mt-1 font-mono text-[11px]">
                          {instruction}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            )}

            {artifactTab === "tests" && run.artifacts.tests && (
              <Card className="glass-panel space-y-2 p-4 text-xs">
                <p className="text-sm font-semibold">{run.artifacts.tests.strategy}</p>
                {run.artifacts.tests.cases.map((testCase, index) => (
                  <div key={index} className="rounded border border-border p-2">
                    <p className="font-semibold">{testCase.name}</p>
                    <p className="text-muted-foreground">{testCase.description}</p>
                    <p className="mt-1 font-mono text-[10px] text-success">
                      expect: {testCase.expected}
                    </p>
                  </div>
                ))}
                {run.artifacts.tests.commands.length > 0 && (
                  <div className="rounded border border-border bg-muted/40 p-2">
                    <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                      Sandbox commands
                    </p>
                    {run.artifacts.tests.commands.map((command, index) => (
                      <p key={index} className="mt-1 font-mono text-[11px]">
                        $ {command}
                      </p>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {verdict && (
              <Card className="glass-panel p-4">
                <div className="flex items-center gap-2">
                  <Badge variant={verdict.verdict === "reject" ? "destructive" : "secondary"}>
                    {verdict.verdict}
                  </Badge>
                  <span className="font-mono text-xs text-muted-foreground">
                    confidence {verdict.confidence}%
                  </span>
                </div>
                <p className="mt-2 text-sm">{verdict.summary}</p>
                {verdict.followUps.length > 0 && (
                  <ul className="mt-2 list-disc pl-4 text-xs text-muted-foreground">
                    {verdict.followUps.map((followUp, index) => (
                      <li key={index}>{followUp}</li>
                    ))}
                  </ul>
                )}
              </Card>
            )}

            {run.status !== "failed" && patches.length > 0 && !branchResult && (
              <Card className="glass-panel space-y-3 p-4">
                <p className="flex items-center gap-2 text-xs font-semibold">
                  <GitBranch className="size-4" /> Deliver patch to a new branch
                </p>
                {!approval || approval.status === "pending" ? (
                  <>
                    <p className="text-xs text-muted-foreground">
                      This writes a commit to{" "}
                      <span className="font-mono">{run.artifacts.branchName ?? branch}</span>.
                      Requires explicit approval.
                    </p>
                    {approval && approval.status === "pending" && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => approveMutation.mutate("approved")}
                          disabled={approveMutation.isPending}
                        >
                          <CheckCircle2 className="size-4 text-success" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => approveMutation.mutate("rejected")}
                          disabled={approveMutation.isPending}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                    <Button
                      size="sm"
                      onClick={() => branchApprovalMutation.mutate()}
                      disabled={branchApprovalMutation.isPending}
                    >
                      {branchApprovalMutation.isPending && (
                        <Loader2 className="size-4 animate-spin" />
                      )}
                      Request approval
                    </Button>
                  </>
                ) : approval.status === "approved" ? (
                  <>
                    <div className="flex items-center gap-2 text-xs text-success">
                      <CheckCircle2 className="size-4" /> Approved by human ({approval.status})
                    </div>
                    <Button
                      size="sm"
                      className="gap-2"
                      onClick={() => createBranchMutation.mutate()}
                      disabled={createBranchMutation.isPending}
                    >
                      {createBranchMutation.isPending && (
                        <Loader2 className="size-4 animate-spin" />
                      )}
                      <GitBranch className="size-4" /> Create branch & commit
                    </Button>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Rejected — the patch stays an artifact.
                  </p>
                )}
              </Card>
            )}

            {branchResult && (
              <Card className="glass-panel p-3 text-xs font-mono">
                <a
                  href={branchResult.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-success underline"
                >
                  <GitBranch className="size-3.5" /> {branchResult.branch} — open compare
                  <ExternalLink className="size-3" />
                </a>
                <Button asChild size="sm" variant="outline" className="mt-2 gap-2 font-sans">
                  <Link
                    to="/healing"
                    search={{ owner: run.owner, repo: run.repo, ref: branchResult.branch }}
                  >
                    Verify in healing sandbox <ExternalLink className="size-3.5" />
                  </Link>
                </Button>
              </Card>
            )}
          </div>
        </div>
      )}

      {(runsQuery.data ?? []).length > 0 && (
        <Card className="glass-panel p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <History className="size-4" /> Recent swarm runs
          </h2>
          <div className="mt-3 space-y-2">
            {runsQuery.data?.map((item) => (
              <button
                key={item.id}
                onClick={() => setRun(item)}
                className="flex w-full items-center gap-3 rounded-lg border border-border bg-card/50 p-3 text-left transition-colors hover:border-primary/40"
              >
                <span className="min-w-0 flex-1 truncate text-sm">{item.task}</span>
                <Badge variant="secondary">{item.status}</Badge>
                <span className="font-mono text-xs text-muted-foreground">
                  {new Date(item.createdAt).toLocaleDateString()}
                </span>
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function Section({
  title,
  items,
  numbered,
  mono,
}: {
  title: string;
  items: string[];
  numbered?: boolean;
  mono?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <ul className={numbered ? "mt-1 list-decimal pl-4" : "mt-1 list-disc pl-4"}>
        {items.map((item, index) => (
          <li key={index} className={mono ? "font-mono break-all" : undefined}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function roleLabel(role: string): string {
  const labels: Record<string, string> = {
    architect: "Architect",
    developer: "Developer",
    security: "Security",
    tester: "Tester",
    reviewer: "Reviewer",
    user: "You",
    system: "Orchestrator",
  };
  return labels[role] ?? role;
}
