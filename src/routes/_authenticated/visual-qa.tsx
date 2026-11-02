import { useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { listVisualQaRuns, runUrlAudit, runVisualQa } from "@/lib/vqa/vqa.functions";
import { pixelDiff, screenshotToDataUrl } from "@/lib/vqa/pixel-diff";
import type { DiffSummary, VqaRun } from "@/lib/vqa/vqa-types";
import type { VqaCheck, VqaDefect } from "@/lib/vqa/vqa-types";
import { Camera, ClipboardCheck, Eye, History, Loader2, ScanEye, Upload } from "lucide-react";

export const Route = createFileRoute("/_authenticated/visual-qa")({
  validateSearch: (search: Record<string, unknown>) => ({
    target: typeof search.target === "string" ? search.target : undefined,
    label: typeof search.label === "string" ? search.label : undefined,
  }),
  head: () => ({
    meta: [
      { title: "AI Visual QA — CodePilot AI" },
      {
        name: "description",
        content:
          "Screenshot defect detection, pixel-diff comparison and DOM audit of your running app.",
      },
    ],
  }),
  component: VisualQaPage,
});

function VisualQaPage() {
  const { target, label } = Route.useSearch();
  const runQa = useServerFn(runVisualQa);
  const runAudit = useServerFn(runUrlAudit);
  const listRuns = useServerFn(listVisualQaRuns);

  const [tab, setTab] = useState<"screenshots" | "url">("screenshots");
  const [beforeUrl, setBeforeUrl] = useState<string | null>(null);
  const [afterUrl, setAfterUrl] = useState<string | null>(null);
  const [beforeName, setBeforeName] = useState("before.png");
  const [afterName, setAfterName] = useState("after.png");
  const [targetUrl, setTargetUrl] = useState(target ?? "");
  const [urlToAudit, setUrlToAudit] = useState(target ?? "");
  const [labelText, setLabelText] = useState(label ?? "");
  const [diff, setDiff] = useState<DiffSummary | null>(null);
  const [result, setResult] = useState<VqaRun | null>(null);
  const [diffing, setDiffing] = useState(false);
  const beforeInputRef = useRef<HTMLInputElement>(null);
  const afterInputRef = useRef<HTMLInputElement>(null);

  const historyQuery = useQuery({
    queryKey: ["visual-qa-history"],
    queryFn: () => listRuns(),
    staleTime: 30_000,
  });

  async function handlePicked(kind: "before" | "after", file: File | undefined) {
    if (!file) return;
    try {
      const dataUrl = await screenshotToDataUrl(file);
      if (kind === "before") {
        setBeforeUrl(dataUrl);
        setBeforeName(file.name);
      } else {
        setAfterUrl(dataUrl);
        setAfterName(file.name);
      }
      setDiff(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not read that image.");
    }
  }

  async function computeDiff() {
    if (!beforeUrl || !afterUrl) return;
    setDiffing(true);
    try {
      const computed = await pixelDiff(beforeUrl, afterUrl);
      setDiff(computed);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Pixel diff failed.");
    } finally {
      setDiffing(false);
    }
  }

  const qaMutation = useMutation({
    mutationFn: async () => {
      const screenshots = [
        beforeUrl ? { name: beforeName, dataUrl: beforeUrl } : null,
        afterUrl ? { name: afterName, dataUrl: afterUrl } : null,
      ].filter(Boolean) as Array<{ name: string; dataUrl: string }>;
      return runQa({ data: { screenshots, targetUrl, label: labelText, diff: diff ?? undefined } });
    },
    onSuccess: (run) => {
      setResult(run);
      toast.success("Visual QA analysis complete.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Visual QA failed."),
  });

  const auditMutation = useMutation({
    mutationFn: () => runAudit({ data: { url: urlToAudit } }),
    onSuccess: (run) => {
      setResult(run);
      toast.success("DOM audit complete.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Audit failed."),
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <ScanEye className="size-5 text-primary" /> AI Visual QA
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Test the running application visually: pixel-level screenshot comparison plus a vision
          model hunting real UI defects, and a deterministic DOM audit of the target URL.
        </p>
      </header>

      <Tabs value={tab} onValueChange={(value) => setTab(value as typeof tab)}>
        <TabsList>
          <TabsTrigger value="screenshots" className="gap-1.5 text-xs">
            <Camera className="size-3.5" /> Screenshots
          </TabsTrigger>
          <TabsTrigger value="url" className="gap-1.5 text-xs">
            <ClipboardCheck className="size-3.5" /> URL audit
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "screenshots" && (
        <Card className="glass-panel space-y-4 p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <ShotSlot
              title="Before"
              name={beforeName}
              dataUrl={beforeUrl}
              onPick={(file) => handlePicked("before", file)}
              inputRef={beforeInputRef}
            />
            <ShotSlot
              title="After"
              name={afterName}
              dataUrl={afterUrl}
              onPick={(file) => handlePicked("after", file)}
              inputRef={afterInputRef}
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">
                Target URL (optional context)
              </Label>
              <Input
                value={targetUrl}
                onChange={(event) => setTargetUrl(event.target.value)}
                placeholder="https://your-app…"
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">Label (optional)</Label>
              <Input
                value={labelText}
                onChange={(event) => setLabelText(event.target.value)}
                placeholder="signup flow v2"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {beforeUrl && afterUrl && (
              <Button variant="outline" onClick={computeDiff} disabled={diffing} className="gap-2">
                {diffing && <Loader2 className="size-4 animate-spin" />}
                Run pixel diff
              </Button>
            )}
            <Button
              onClick={() => qaMutation.mutate()}
              disabled={qaMutation.isPending || (!beforeUrl && !afterUrl)}
              className="gap-2"
            >
              {qaMutation.isPending && <Loader2 className="size-4 animate-spin" />}
              <Eye className="size-4" /> Analyze with AI vision
            </Button>
            {diff && (
              <Badge
                variant={
                  diff.ratio > 0.2 ? "destructive" : diff.ratio > 0.05 ? "secondary" : "outline"
                }
              >
                {diff.regions.length} change region(s) · {(diff.ratio * 100).toFixed(1)}% pixels
              </Badge>
            )}
          </div>
          {diff && (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs font-semibold text-muted-foreground">
                  Change heatmap (red = changed)
                </p>
                {diff.heatmapDataUrl ? (
                  <img
                    src={diff.heatmapDataUrl}
                    alt="diff heatmap"
                    className="mt-2 w-full rounded border border-border"
                  />
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Heatmap too large to embed — regions list below.
                  </p>
                )}
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs font-semibold text-muted-foreground">Change regions (px)</p>
                <ul className="mt-2 space-y-1 font-mono text-[11px]">
                  {diff.regions.map((region, index) => (
                    <li key={index}>
                      x{region.x} y{region.y} · {region.w}×{region.h}
                    </li>
                  ))}
                  {diff.regions.length === 0 && (
                    <li className="text-muted-foreground">no concentrated regions</li>
                  )}
                </ul>
              </div>
            </div>
          )}
        </Card>
      )}

      {tab === "url" && (
        <Card className="glass-panel space-y-3 p-5">
          <Label className="text-xs text-muted-foreground">Running application URL</Label>
          <div className="flex gap-2">
            <Input
              value={urlToAudit}
              onChange={(event) => setUrlToAudit(event.target.value)}
              placeholder="https://your-app.vercel.app"
              className="font-mono text-sm"
            />
            <Button
              onClick={() => auditMutation.mutate()}
              disabled={auditMutation.isPending || urlToAudit.trim().length < 8}
              className="gap-2 shrink-0"
            >
              {auditMutation.isPending && <Loader2 className="size-4 animate-spin" />}
              <ClipboardCheck className="size-4" /> Audit
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Fetches the page server-side and runs deterministic UI checks: title, viewport, H1
            structure, alt text, labelled controls, accessible names, skip link, inline-style
            weight.
          </p>
        </Card>
      )}

      {result && <ResultView run={result} />}

      {(historyQuery.data ?? []).length > 0 && (
        <Card className="glass-panel p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <History className="size-4" /> Recent visual QA runs
          </h2>
          <div className="mt-3 space-y-2">
            {historyQuery.data?.map((item) => (
              <button
                key={item.id}
                onClick={() => setResult(item)}
                className="flex w-full items-center gap-3 rounded-lg border border-border bg-card/50 p-3 text-left transition-colors hover:border-primary/40"
              >
                <Badge variant="secondary">{item.mode}</Badge>
                <span className="min-w-0 flex-1 truncate text-sm">
                  {item.targetUrl || item.label || "screenshots"}
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {new Date(item.createdAt).toLocaleString()}
                </span>
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function ShotSlot({
  title,
  name,
  dataUrl,
  onPick,
  inputRef,
}: {
  title: string;
  name: string;
  dataUrl: string | null;
  onPick: (file: File | undefined) => void | Promise<void>;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <div>
      <Label className="mb-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Upload className="size-3.5" /> {title} screenshot
      </Label>
      <button
        onClick={() => inputRef.current?.click()}
        className="grid h-40 w-full place-items-center rounded-lg border border-dashed border-border bg-card/50 transition-colors hover:border-primary/40"
      >
        {dataUrl ? (
          <img
            src={dataUrl}
            alt={`${title} screenshot`}
            className="h-full w-full rounded-lg object-contain"
          />
        ) : (
          <span className="text-xs text-muted-foreground">
            click to attach {title.toLowerCase()}
          </span>
        )}
      </button>
      <p className="mt-1 truncate font-mono text-[10px] text-muted-foreground">{name}</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          void onPick(event.target.files?.[0]);
        }}
      />
    </div>
  );
}

function ResultView({ run }: { run: VqaRun }) {
  return (
    <div className="space-y-4">
      {run.analysis && (
        <>
          <Card className="glass-panel p-5">
            <p className="text-sm">{run.analysis.summary}</p>
            <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
              <AspectCard title="Layout" text={run.analysis.layout} />
              <AspectCard title="Readability" text={run.analysis.readability} />
              <AspectCard title="Contrast" text={run.analysis.contrast} />
              <AspectCard title="Accessibility" text={run.analysis.accessibility} />
            </div>
          </Card>
          {run.analysis.defects.map((defect, index) => (
            <DefectCard key={index} defect={defect} />
          ))}
        </>
      )}
      {run.checks.length > 0 && (
        <Card className="glass-panel p-5">
          <h2 className="text-sm font-semibold text-muted-foreground">
            DOM audit — {run.targetUrl}
          </h2>
          <div className="mt-3 space-y-2">
            {run.checks.map((check) => (
              <div key={check.id} className="flex items-start gap-2 text-xs">
                <Badge variant={check.pass ? "secondary" : "destructive"}>
                  {check.pass ? "pass" : "fail"}
                </Badge>
                <span className="font-semibold">{check.name}</span>
                <span className="text-muted-foreground">{check.detail}</span>
              </div>
            ))}
          </div>
          {run.note && <p className="mt-3 text-xs text-muted-foreground">{run.note}</p>}
        </Card>
      )}
      {run.analysis && run.targetUrl && (
        <p className="text-center text-xs text-muted-foreground">
          Continue in the{" "}
          <Link
            to="/swarm"
            search={{
              owner: undefined,
              repo: undefined,
              ref: undefined,
              task: `Fix visual QA defects on ${run.targetUrl}`,
              run: undefined,
            }}
            className="underline"
          >
            Developer Swarm
          </Link>
          .
        </p>
      )}
    </div>
  );
}

function AspectCard({ title, text }: { title: string; text: string }) {
  if (!text) return null;
  return (
    <div className="rounded-lg border border-border bg-card/50 p-3">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-muted-foreground">{text}</p>
    </div>
  );
}

function DefectCard({ defect }: { defect: VqaDefect }) {
  return (
    <Card className="glass-panel p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant={
            defect.severity === "critical" || defect.severity === "high"
              ? "destructive"
              : "secondary"
          }
        >
          {defect.severity}
        </Badge>
        <p className="text-sm font-semibold">{defect.title}</p>
        <span className="font-mono text-xs text-muted-foreground">
          {defect.area} · confidence {defect.confidence}%
        </span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{defect.description}</p>
      {defect.recommendation && (
        <p className="mt-2 text-xs">
          <span className="font-semibold">Fix:</span> {defect.recommendation}
        </p>
      )}
    </Card>
  );
}
