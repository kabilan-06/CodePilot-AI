// Unified-diff parser. Pure data transformation — unit-testable in isolation.

export interface DiffHunkLine {
  type: "+" | "-" | "context";
  newLine: number | null;
  oldLine: number | null;
  text: string;
}

export interface DiffHunk {
  head: string;
  lines: DiffHunkLine[];
}

export interface ParsedFileDiff {
  path: string;
  oldPath: string | null;
  binary: boolean;
  added: number;
  removed: number;
  hunks: DiffHunk[];
}

export function parseUnifiedDiff(diff: string): ParsedFileDiff[] {
  const files = new Map<string, ParsedFileDiff>();
  let current: ParsedFileDiff | null = null;
  let pendingPath: string | null = null;

  for (const raw of diff.split("\n")) {
    if (raw.startsWith("diff --git ")) {
      const match = raw.match(/^diff --git a\/(.+) b\/(.+)$/);
      const path = match?.[2] ?? match?.[1] ?? "unknown";
      pendingPath = path;
      current = null;
      continue;
    }

    if (raw.startsWith("--- ")) {
      const oldLine = raw.slice(4).trim();
      if (!oldLine.startsWith("/dev/null") && current?.oldPath == null) {
        const clean = oldLine.replace(/^a\//, "").replace(/\t.*$/, "");
        if (current) current.oldPath = clean;
      }
      continue;
    }

    if (raw.startsWith("+++ ")) {
      const newLine = raw.slice(4).trim();
      if (!newLine.startsWith("/dev/null")) {
        const clean = newLine.replace(/^b\//, "").replace(/\t.*$/, "");
        current = files.get(clean) ?? null;
        if (!current) {
          const fallback = pendingPath ?? clean;
          current = files.get(fallback) ?? {
            path: clean,
            oldPath: null,
            binary: false,
            added: 0,
            removed: 0,
            hunks: [],
          };
          files.set(current.path, current);
        }
        if (pendingPath && pendingPath !== current.path) {
          current = files.get(pendingPath) ?? current;
        }
      }
      continue;
    }

    if (raw.startsWith("Binary files") || raw.startsWith("GIT binary patch")) {
      if (current) current.binary = true;
      continue;
    }

    if (raw.startsWith("@@")) {
      if (!current) continue;
      const head = raw.slice(0, 80);
      current.hunks.push({ head, lines: [] });
      continue;
    }

    if (!current) continue;
    const hunk = current.hunks[current.hunks.length - 1];
    if (!hunk) continue;

    if (raw.startsWith("+")) {
      hunk.lines.push({ type: "+", newLine: 0, oldLine: null, text: raw.slice(1) });
      current.added += 1;
    } else if (raw.startsWith("-")) {
      hunk.lines.push({ type: "-", newLine: null, oldLine: 0, text: raw.slice(1) });
      current.removed += 1;
    }
  }

  return Array.from(files.values());
}

/** Compact excerpt (changed lines with deducted indices) for the AI radar. */
export function excerptFor(file: ParsedFileDiff, maxLines = 14): string {
  const out: string[] = [];
  const changed = file.hunks
    .flatMap((hunk) => hunk.lines)
    .filter((line) => line.type !== "context");
  for (const line of changed.slice(0, maxLines)) {
    out.push(`${line.type} ${line.text}`.slice(0, 160));
  }
  if (changed.length > maxLines) out.push(`… +${changed.length - maxLines} more changed lines`);
  return out.join("\n");
}
