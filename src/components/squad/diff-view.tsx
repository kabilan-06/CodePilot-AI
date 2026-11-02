import { useMemo } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { FilePatch } from "@/lib/swarm/swarm-types";

interface DiffLine {
  type: "context" | "add" | "del";
  text: string;
}

/** Small LCS-free line diff: common prefix/suffix + explicit add/del section. */
function computeLineDiff(before: string, after: string): DiffLine[] {
  const a = before.split("\n");
  const b = after.split("\n");
  const maxPad = 15000;
  const out: DiffLine[] = [];

  let start = 0;
  while (start < a.length && start < b.length && start < maxPad && a[start] === b[start]) {
    out.push({ type: "context", text: a[start] });
    start += 1;
  }

  let endA = a.length - 1;
  let endB = b.length - 1;
  while (endA >= start && endB >= start && a[endA] === b[endB]) {
    endA -= 1;
    endB -= 1;
  }

  for (let i = start; i <= endA; i++) out.push({ type: "del", text: a[i] ?? "" });
  for (let i = start; i <= endB; i++) out.push({ type: "add", text: b[i] ?? "" });

  for (let i = endA + 1; i < a.length; i++) out.push({ type: "context", text: a[i] });
  return out.slice(0, 600);
}

export function DiffView({ patch }: { patch: FilePatch }) {
  const lines = useMemo(() => computeLineDiff(patch.before, patch.after), [patch]);
  const added = lines.filter((line) => line.type === "add").length;
  const removed = lines.filter((line) => line.type === "del").length;
  const isPatchable = patch.before.trim() === patch.after.trim();

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/40 px-3 py-2">
        <span className="font-mono text-xs font-semibold">{patch.path}</span>
        <span className="font-mono text-[10px] text-success">+{added}</span>
        <span className="font-mono text-[10px] text-destructive">−{removed}</span>
        {patch.verified ? (
          <span className="ml-auto flex items-center gap-1 text-[10px] text-success">
            <CheckCircle2 className="size-3" /> verified against repo
          </span>
        ) : (
          <span className="ml-auto flex items-center gap-1 text-[10px] text-warning">
            <AlertTriangle className="size-3" /> unverified (review before apply)
          </span>
        )}
        {isPatchable && <span className="text-[10px] text-muted-foreground">no-op patch</span>}
      </div>
      <div className="max-h-80 overflow-y-auto">
        <pre className="font-mono text-[11px] leading-4">
          {lines.map((line, index) => (
            <div
              key={index}
              className={
                line.type === "add"
                  ? "bg-success/10 text-success"
                  : line.type === "del"
                    ? "bg-destructive/10 text-destructive"
                    : "text-muted-foreground"
              }
            >
              <span className="inline-block w-6 select-none text-center opacity-60">
                {line.type === "add" ? "+" : line.type === "del" ? "−" : " "}
              </span>
              <span className="whitespace-pre">{line.text}</span>
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
}
