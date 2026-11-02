import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  diagnoseError,
  runHealSandbox,
  listHealRuns,
  getHealRun,
  requestSandboxApproval,
  requestHealBranchApproval,
  commitHealBranch,
  sandboxStatus,
} from "@/lib/healing/healing.functions";
import { decideApproval } from "@/lib/approval.functions";
import type { HealRun } from "@/lib/healing/healing-types";
import { DiffView } from "@/components/squad/diff-view";
import {
  CheckCircle2,
  ExternalLink,
  GitBranch,
  HeartPulse,
  History,
  Loader2,
  RotateCcw,
  Shell,
  ShieldAlert,
  Stethoscope,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/healing")({
  validateSearch: (search: Record<string, unknown>) => ({
    owner: typeof search.owner === "string" ? search.owner : undefined,
    repo: typeof search.repo === "string" ? search.repo : undefined,
    ref: typeof search.ref === "string" ? search.ref : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Self-Healing Environment — CodePilot AI" },
      {
        name: "description",
        content:
          "Diagnose terminal errors, patch, verify in an isolated sandbox, auto-roll back on failure.",
      },
    ],
  }),
  component: HealingPage,
});

function HealingPage() {
  const { owner, repo, ref } = Route.useSearch();
  const diagnose = useServerFn(diagnoseError);
  const requestApproval = useServerFn(requestSandboxApproval);
  const runSandbox = useServerFn(runHealSandbox);
  const requestBranchApproval = useServerFn(requestHealBranchApproval);
  const commitBranch = useServerFn(commitHealBranch);
  const loadRun = useServerFn(getHealRun);
  const listRuns = useServerFn(listHealRuns);
  const statusFn = useServerFn(sandboxStatus);
  const decide = useServerFn(decideApproval);

  const [errorText, setErrorText] = useState("");
  const [repoValue, setRepoValue] = useState(owner && repo ? `${owner}/${repo}` : "");
  const [branch, setBranch] = useState(ref ?? "main");
  const [command, setCommand] = useState("");
  const [heal, setHeal] = useState<HealRun | null>(null);
  const [sandboxApproval, setSandboxApproval] = useState<{ id: string; status: string } | null>(
    null,
  );
  const [branchApproval, setBranchApproval] = useState<{ id: string; status: string } | null>(null);
  const [branchResult, setBranchResult] = useState<{ branch: string; url: string } | null>(null);

  const statusQuery = useQuery({
    queryKey: ["heal-status"],
    queryFn: () => statusFn(),
    staleTime: 120_000,
  });
  const historyQuery = useQuery({
    queryKey: ["heal-history"],
    queryFn: () => listRuns(),
    staleTime: 30_000,
  });

  const sandboxAvailable = statusQuery.data?.capability.available === true;
  const aiProvider = statusQuery.data?.ai;

  const diagnoseMutation = useMutation({
    mutationFn: async () => {
      const [owner_, repo_] = repoValue.split("/");
      return diagnose({
        data: {
          errorText,
          owner: owner_ || undefined,
          repo: repo_ || undefined,
          ref: branch || "main",
        },
      });
    },
    onSuccess: (run) => {
      setHeal(run);
      setSandboxApproval(null);
      setBranchApproval(null);
      setBranchResult(null);
      toast.success("Root cause diagnosed.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Diagnosis failed."),
  });

  const sandboxApprovalMutation = useMutation({
    mutationFn: () => {
      if (!heal) throw new Error("Run missing");
      return requestApproval({ data: { healId: heal.id, command: command || undefined } });
    },
    onSuccess: (created) => {
      setSandboxApproval({ id: created.id, status: created.status });
      toast.success("Approval requested — a human must approve before the sandbox runs.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Approval request failed."),
  });

  const sandboxRunMutation = useMutation({
    mutationFn: () => {
      if (!heal || !sandboxApproval) throw new Error("Approval missing");
      return runSandbox({
        data: { healId: heal.id, approvalId: sandboxApproval.id, command: command || undefined },
      });
    },
    onSuccess: (run) => {
      setHeal(run);
      if (run.status === "verified") toast.success("Patch verified in the isolated sandbox.");
      else if (run.status === "rolled-back")
        toast.warning("Verification failed — sandbox rolled back automatically.");
      else toast.error(run.error ?? "Sandbox run failed.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Sandbox run failed."),
  });

  const branchApprovalMutation = useMutation({
    mutationFn: () => {
      if (!heal) throw new Error("Run missing");
      return requestBranchApproval({ data: { healId: heal.id } });
    },
    onSuccess: (created) => {
      setBranchApproval({ id: created.id, status: created.status });
      toast.success("Branch approval requested.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not request approval."),
  });

  const decideMutation = useMutation({
    mutationFn: async ({ id, decision }: { id: string; decision: "approved" | "rejected" }) =>
      decide({ data: { id, decision } }),
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not record decision."),
  });

  const branchCommitMutation = useMutation({
    mutationFn: () => {
      if (!heal || !branchApproval) throw new Error("Approval missing");
      return commitBranch({ data: { healId: heal.id, approvalId: branchApproval.id } });
    },
    onSuccess: (result) => {
      setBranchResult({ branch: result.branch, url: result.url });
      toast.success(`Heal patch committed to ${result.branch}.`);
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Branch creation failed."),
  });

  useEffect(() => {
    if (decideMutation.data?.status && sandboxApproval?.status === "pending") {
      setSandboxApproval({ ...sandboxApproval, status: decideMutation.data.status });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decideMutation.data]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <HeartPulse className="size-5 text-primary" /> Self-Healing Development Environment
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Inspect a terminal error, get a root-cause diagnosis and patch, then verify inside an
          isolated clone. Failed patches roll back automatically — you approve every destructive
          step.
        </p>
      </header>

      <div className="flex flex-wrap gap-2 text-xs">
        <Badge variant="secondary" className={sandboxAvailable ? "" : "opacity-60"}>
          <Shell className="size-3" />{" "}
          {sandboxAvailable
            ? `sandbox ready (${statusQuery.data?.capability.git})`
            : "sandbox unavailable on this runtime"}
        </Badge>
        <Badge variant="secondary" className={aiProvider?.configured ? "" : "opacity-60"}>
          <Stethoscope className="size-3" />{" "}
          {aiProvider?.configured
            ? `${aiProvider.provider} · ${aiProvider.model}`
            : "AI not configured"}
        </Badge>
        {!sandboxAvailable && statusQuery.data?.capability.reason && (
          <span className="text-muted-foreground">{statusQuery.data.capability.reason}</span>
        )}
      </div>

      <Card className="glass-panel space-y-3 p-5">
        <div>
          <Label className="mb-1.5 block text-xs text-muted-foreground">
            Terminal error (paste the stack/log)
          </Label>
          <Textarea
            value={errorText}
            onChange={(event) => setErrorText(event.target.value)}
            placeholder="TypeError: Cannot read properties of undefined (reading 'id')&#10;    at getReview (src/lib/reviews.ts:42:15)..."
            className="min-h-40 font-mono text-xs"
          />
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_140px]">
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">
              Repository (recommended)
            </Label>
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
              className="font-mono text-sm"
              placeholder="main"
            />
          </div>
        </div>
        <Button
          className="gap-2"
          disabled={errorText.trim().length < 20 || diagnoseMutation.isPending}
          onClick={() => diagnoseMutation.mutate()}
        >
          {diagnoseMutation.isPending && <Loader2 className="size-4 animate-spin" />}
          <Stethoscope className="size-4" /> Diagnose root cause
        </Button>
      </Card>

      {heal && (
        <div className="space-y-4">
          {heal.diagnosis && (
            <Card className="glass-panel p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="destructive">{heal.diagnosis.category}</Badge>
                <Badge variant="secondary">confidence {heal.diagnosis.confidence}%</Badge>
                <p className="text-sm font-semibold">{heal.diagnosis.classification}</p>
              </div>
              <p className="mt-2 text-sm">{heal.diagnosis.rootCause}</p>
              {heal.diagnosis.contributingFactors.length > 0 && (
                <ul className="mt-2 list-disc pl-5 text-xs text-muted-foreground">
                  {heal.diagnosis.contributingFactors.map((factor, index) => (
                    <li key={index}>{factor}</li>
                  ))}
                </ul>
              )}
              {heal.diagnosis.fileHypotheses.length > 0 && (
                <p className="mt-2 font-mono text-xs text-muted-foreground">
                  inspected: {heal.diagnosis.fileHypotheses.join(" · ")}
                </p>
              )}
            </Card>
          )}

          {heal.patch.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground">Proposed patch</h2>
              {heal.patch.map((patch) => (
                <DiffView key={patch.path} patch={patch} />
              ))}
            </div>
          )}

          {heal.patch.length > 0 && (
            <Card className="glass-panel space-y-3 p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Shell className="size-4" /> Sandboxed verification
              </h2>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={command}
                  onChange={(event) => setCommand(event.target.value)}
                  placeholder="Optional command override (default: npm test from package.json)"
                  className="font-mono text-xs"
                />
              </div>
              {!sandboxApproval || sandboxApproval.status === "pending" ? (
                <>
                  {sandboxApproval?.status === "pending" ? (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="gap-1 text-warning">
                        <ShieldAlert className="size-3" /> awaiting human approval
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        disabled={decideMutation.isPending}
                        onClick={() =>
                          decideMutation.mutate({ id: sandboxApproval.id, decision: "approved" })
                        }
                      >
                        <CheckCircle2 className="size-3.5 text-success" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        disabled={decideMutation.isPending}
                        onClick={() =>
                          decideMutation.mutate({ id: sandboxApproval.id, decision: "rejected" })
                        }
                      >
                        Reject
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => sandboxApprovalMutation.mutate()}
                      disabled={sandboxApprovalMutation.isPending || !sandboxAvailable}
                    >
                      {sandboxApprovalMutation.isPending && (
                        <Loader2 className="size-4 animate-spin" />
                      )}
                      Request approval to patch-clone & test
                    </Button>
                  )}
                </>
              ) : sandboxApproval.status === "approved" ? (
                <div className="space-y-2">
                  <p className="flex items-center gap-2 text-xs text-success">
                    <CheckCircle2 className="size-4" /> Approved — sandbox will clone, snapshot,
                    patch and test.
                  </p>
                  <Button
                    size="sm"
                    className="gap-2"
                    onClick={() => sandboxRunMutation.mutate()}
                    disabled={sandboxRunMutation.isPending}
                  >
                    {sandboxRunMutation.isPending && <Loader2 className="size-4 animate-spin" />}
                    Run sandbox verification
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Rejected — nothing runs without an approval.
                </p>
              )}
            </Card>
          )}

          {heal.sandbox && heal.sandbox.exec.length > 0 && (
            <Card className="glass-panel p-5">
              <h2 className="text-sm font-semibold text-muted-foreground">Sandbox test output</h2>
              {heal.sandbox.exec.map((exec, index) => (
                <div key={index} className="mt-3">
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant={exec.passed ? "secondary" : "destructive"} className="gap-1">
                      {exec.passed ? (
                        <CheckCircle2 className="size-3" />
                      ) : (
                        <RotateCcw className="size-3" />
                      )}
                      {exec.passed ? "passed" : "failed"}
                    </Badge>
                    <span className="font-mono">$ {exec.command}</span>
                    <span className="font-mono text-muted-foreground">
                      exit {exec.exitCode ?? "signal"}
                      {exec.timedOut ? " (timeout)" : ""}
                    </span>
                  </div>
                  <pre className="mt-2 max-h-56 overflow-y-auto rounded-lg bg-muted/60 p-3 font-mono text-[11px] whitespace-pre-wrap">
                    {exec.stdout || exec.stderr || "(no output)"}
                  </pre>
                </div>
              ))}
              {heal.sandbox.note && (
                <p className="mt-3 text-xs text-muted-foreground">{heal.sandbox.note}</p>
              )}
              {heal.sandbox.rolledBack && heal.sandbox.rollbackResult.length > 0 && (
                <div className="mt-3 rounded-lg border border-border p-3 text-xs">
                  <p className="font-semibold">Rollback ledger</p>
                  {heal.sandbox.rollbackResult.map((rollback) => (
                    <p key={rollback.path} className="font-mono text-[11px]">
                      {rollback.path} —{" "}
                      {rollback.restored
                        ? "restored"
                        : `restore failed${rollback.error ? `: ${rollback.error}` : ""}`}
                    </p>
                  ))}
                </div>
              )}
            </Card>
          )}

          {heal.status === "verified" && heal.patch.length > 0 && !branchResult && (
            <Card className="glass-panel space-y-3 p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <GitBranch className="size-4" /> Deliver verified patch
              </h2>
              {!branchApproval || branchApproval.status === "pending" ? (
                branchApproval?.status === "pending" ? (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-warning">
                      awaiting approval
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      disabled={decideMutation.isPending}
                      onClick={() =>
                        decideMutation.mutate({ id: branchApproval.id, decision: "approved" })
                      }
                    >
                      <CheckCircle2 className="size-3.5 text-success" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={decideMutation.isPending}
                      onClick={() =>
                        decideMutation.mutate({ id: branchApproval.id, decision: "rejected" })
                      }
                    >
                      Reject
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => branchApprovalMutation.mutate()}
                    disabled={branchApprovalMutation.isPending}
                  >
                    {branchApprovalMutation.isPending && (
                      <Loader2 className="size-4 animate-spin" />
                    )}
                    Request approval to create branch
                  </Button>
                )
              ) : (
                <Button
                  size="sm"
                  className="gap-2"
                  onClick={() => branchCommitMutation.mutate()}
                  disabled={branchCommitMutation.isPending}
                >
                  {branchCommitMutation.isPending && <Loader2 className="size-4 animate-spin" />}
                  Create branch &amp; commit patch
                </Button>
              )}
            </Card>
          )}

          {branchResult && (
            <Card className="glass-panel p-4 text-sm">
              <a
                href={branchResult.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 font-mono text-success underline"
              >
                <GitBranch className="size-4" /> {branchResult.branch}
                <ExternalLink className="size-3.5" />
              </a>
              <Button asChild size="sm" variant="outline" className="mt-3 gap-2">
                <Link
                  to="/visual-qa"
                  search={{
                    target: branchResult.url.startsWith("http") ? branchResult.url : undefined,
                    label: branchResult.branch,
                  }}
                >
                  Continue with AI Visual QA
                </Link>
              </Button>
            </Card>
          )}
        </div>
      )}

      {(historyQuery.data ?? []).length > 0 && (
        <Card className="glass-panel p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <History className="size-4" /> Recent heal runs
          </h2>
          <div className="mt-3 space-y-2">
            {historyQuery.data?.map((item) => (
              <button
                key={item.id}
                onClick={async () => {
                  try {
                    setHeal(await loadRun({ data: { id: item.id } }));
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Could not load run.");
                  }
                }}
                className="flex w-full items-center gap-3 rounded-lg border border-border bg-card/50 p-3 text-left transition-colors hover:border-primary/40"
              >
                <span className="min-w-0 flex-1 truncate font-mono text-xs">
                  {item.errorText.slice(0, 90)}
                </span>
                <Badge
                  variant={
                    item.status === "verified"
                      ? "secondary"
                      : item.status === "rolled-back"
                        ? "outline"
                        : "destructive"
                  }
                >
                  {item.status}
                </Badge>
                <span className="font-mono text-[11px] text-muted-foreground">
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
