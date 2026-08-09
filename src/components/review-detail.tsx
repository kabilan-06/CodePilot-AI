import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { SCORE_LABELS, SCORE_KEYS, severityTone } from "@/lib/review-types";
import type { ReviewRecord } from "@/lib/review-types";

export function GradeBadge({ grade, score }: { grade: string; score: number }) {
  const tone =
    grade === "A+" || grade === "A"
      ? "border-success/50 bg-success/10 text-success"
      : grade === "B"
        ? "border-primary/50 bg-primary/10 text-primary"
        : grade === "C"
          ? "border-warning/50 bg-warning/10 text-warning"
          : "border-destructive/50 bg-destructive/10 text-destructive";
  return (
    <div className={`rounded-xl border px-4 py-2 text-center font-mono ${tone}`}>
      <div className="text-2xl font-bold leading-none">{grade}</div>
      <div className="mt-1 text-xs opacity-80">{score}/100</div>
    </div>
  );
}

export function ReviewDetail({ review }: { review: ReviewRecord }) {
  return (
    <div className="space-y-6">
      <Card className="glass-panel p-6">
        <div className="flex flex-wrap items-start gap-4">
          <GradeBadge grade={review.grade} score={review.overall_score} />
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold">{review.title}</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="secondary" className="font-mono text-xs">
                {review.language}
              </Badge>
              <Badge variant="outline" className="font-mono text-xs">
                {review.source}
              </Badge>
              {review.source_ref && (
                <Badge variant="outline" className="max-w-xs truncate font-mono text-xs">
                  {review.source_ref}
                </Badge>
              )}
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{review.summary}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SCORE_KEYS.map((key) => (
            <div key={key}>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{SCORE_LABELS[key]}</span>
                <span className="font-mono">{review.scores?.[key] ?? 0}</span>
              </div>
              <Progress value={review.scores?.[key] ?? 0} className="mt-1.5 h-1.5" />
            </div>
          ))}
        </div>
      </Card>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground">
          {review.issues.length} findings
        </h3>
        {review.issues.map((issue, index) => (
          <Card key={`${issue.title}-${index}`} className="glass-panel gap-4 p-6">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-md border px-2 py-0.5 font-mono text-xs ${severityTone(issue.severity)}`}
              >
                {issue.severity}
              </span>
              <Badge variant="secondary" className="font-mono text-xs">
                {issue.category}
              </Badge>
              {issue.line != null && (
                <span className="font-mono text-xs text-muted-foreground">line {issue.line}</span>
              )}
            </div>
            <h4 className="text-base font-semibold">{issue.title}</h4>
            <p className="text-sm text-muted-foreground">{issue.explanation}</p>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Why it matters" value={issue.why_it_matters} />
              <Field label="How to fix" value={issue.how_to_fix} />
            </div>

            {issue.improved_code && (
              <div>
                <p className="mb-1.5 font-mono text-xs text-muted-foreground">Improved code</p>
                <pre className="overflow-x-auto rounded-lg border border-border bg-muted/40 p-3 font-mono text-xs">
                  {issue.improved_code}
                </pre>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              {issue.alternative && <Field label="Alternative" value={issue.alternative} />}
              {issue.estimated_improvement && (
                <Field label="Estimated improvement" value={issue.estimated_improvement} />
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3">
      <p className="font-mono text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm">{value}</p>
    </div>
  );
}
