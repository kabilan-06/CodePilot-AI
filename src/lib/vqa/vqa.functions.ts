// AI Visual QA server functions: vision-based defect detection over real
// screenshots and a deterministic DOM audit for a URL. Runs are persisted.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { aiComplete, aiStatus, parseAiJson } from "../ai.server";
import type { VqaAnalysis, VqaCheck, VqaRun, DiffSummary } from "./vqa-types";

const VISION_SYSTEM = `You are AI Visual QA, a meticulous UI reviewer: compare screenshots and detect real visual defects.
Respond ONLY with JSON: {
  "summary": "2-3 sentences",
  "defects": [ { "area": "short location label", "title": "...", "severity": "critical|high|medium|low", "description": "...", "recommendation": "...", "confidence": 0-100 } ],
  "layout": "assessment of alignment/spacing/overflow",
  "readability": "assessment of text legibility and hierarchy",
  "contrast": "assessment of color contrast issues",
  "accessibility": "assessment of visible affordances, focus and a11y signals"
}
Report only observable issues; do not invent problems. Max 8 defects, most severe first.`;

function mapRun(row: Record<string, unknown>): VqaRun {
  const overall = (row.overall ?? {}) as {
    analysis?: VqaAnalysis | null;
    diff?: { ratio: number; changedPixels: number; regions: DiffSummary["regions"] } | null;
    checks?: VqaCheck[];
    label?: string | null;
    fetchedBytes?: number;
    note?: string | null;
  };
  return {
    id: String(row.id),
    mode: (row.mode as VqaRun["mode"] | null) ?? "screenshots",
    targetUrl: String(row.target_url ?? ""),
    label: overall.label ?? null,
    analysis: overall.analysis ?? null,
    diff: overall.diff ?? null,
    checks: overall.checks ?? [],
    fetchedBytes: Number(overall.fetchedBytes ?? 0),
    note: overall.note ?? null,
    createdAt: String(row.created_at),
  };
}

export const runVisualQa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (input: {
      screenshots: Array<{ name: string; dataUrl: string }>;
      targetUrl?: string;
      label?: string;
      diff?: DiffSummary;
    }) => {
      const shots = (input.screenshots ?? [])
        .slice(0, 3)
        .filter((shot) => shot.dataUrl?.startsWith("data:image/"))
        .map((shot) => ({
          name: String(shot.name ?? "screenshot").slice(0, 80),
          dataUrl: shot.dataUrl,
        }));
      if (shots.length === 0) throw new Error("Attach at least one screenshot.");
      for (const shot of shots) {
        if (shot.dataUrl.length > 5_000_000) {
          throw new Error(`Screenshot ${shot.name} is too large after compression.`);
        }
      }
      return {
        screenshots: shots,
        targetUrl: (input.targetUrl ?? "").slice(0, 400),
        label: (input.label ?? "").slice(0, 120),
        diff: input.diff ?? null,
      };
    },
  )
  .handler(async ({ data, context }): Promise<VqaRun> => {
    const ai = aiStatus();
    if (!ai.vision || !ai.configured) {
      throw new Error(
        "Vision requires LOVABLE_API_KEY or OPENAI_API_KEY (a Groq text-only key cannot inspect screenshots).",
      );
    }

    const diffSummary: DiffSummary | null = data.diff
      ? {
          ratio: data.diff.ratio,
          changedPixels: data.diff.changedPixels,
          regions: data.diff.regions.slice(0, 12),
          heatmapDataUrl: data.diff.heatmapDataUrl,
        }
      : null;

    const comparison =
      diffSummary !== null
        ? `Pixel diff: ${diffSummary.ratio * 100}% of pixels changed. Change regions (x,y,w,h): ${
            diffSummary.regions
              .map((region) => `(${region.x},${region.y},${region.w},${region.h})`)
              .join(" ") || "none"
          }.`
        : data.screenshots.length >= 2
          ? "Two screenshots provided; compare before/after."
          : "Single screenshot — inspect standalone.";

    const { content, model } = await aiComplete({
      messages: [
        { role: "system", content: VISION_SYSTEM },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `${comparison}\n\nTarget: ${data.targetUrl || "(not specified)"}${data.label ? ` · label: ${data.label}` : ""}\nImages follow: 1 = first screenshot${data.screenshots[1] ? ", 2 = second screenshot" : ""}${diffSummary?.heatmapDataUrl ? ", heatmap last (red = changed areas)" : ""}`,
            },
            ...data.screenshots.map((shot) => ({
              type: "image_url" as const,
              image_url: { url: shot.dataUrl },
            })),
            ...(diffSummary?.heatmapDataUrl?.startsWith("data:image/")
              ? [{ type: "image_url" as const, image_url: { url: diffSummary.heatmapDataUrl } }]
              : []),
          ],
        },
      ],
      json: true,
      maxTokens: 2400,
    });

    const parsed = parseAiJson<Partial<VqaAnalysis>>(content);
    const analysis: VqaAnalysis = {
      summary: String(parsed.summary ?? ""),
      defects: (parsed.defects ?? []).slice(0, 8).map((defect) => ({
        area: String(defect?.area ?? ""),
        title: String(defect?.title ?? "Visual issue"),
        severity: (["critical", "high", "medium", "low"].includes(String(defect?.severity))
          ? String(defect?.severity)
          : "medium") as VqaAnalysis["defects"][number]["severity"],
        description: String(defect?.description ?? ""),
        recommendation: String(defect?.recommendation ?? ""),
        confidence: Number.isFinite(Number(defect?.confidence))
          ? Math.max(0, Math.min(100, Number(defect?.confidence)))
          : 50,
      })),
      layout: String(parsed.layout ?? ""),
      readability: String(parsed.readability ?? ""),
      contrast: String(parsed.contrast ?? ""),
      accessibility: String(parsed.accessibility ?? ""),
    };

    const { data: row, error } = await context.supabase
      .from("visual_qa_runs")
      .insert({
        user_id: context.userId,
        mode: "screenshots",
        target_url: data.targetUrl,
        address: data.label || null,
        overall: {
          analysis,
          label: data.label || null,
          model,
          diff: diffSummary
            ? {
                ratio: diffSummary.ratio,
                changedPixels: diffSummary.changedPixels,
                regions: diffSummary.regions,
              }
            : null,
        } as unknown as Record<string, never>,
      })
      .select()
      .single();
    if (error || !row) {
      console.error("Failed to save visual QA run", error);
      throw new Error("Analysis complete but could not be saved.");
    }
    return { ...mapRun(row as unknown as Record<string, unknown>), analysis, diff: diffSummary };
  });

/* ---------- deterministic DOM audit for a URL ---------- */

function stripNoisyTags(html: string): string {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");
}

function attr(attrs: string, name: string): string | null {
  const match = attrs.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return match ? (match[2] ?? match[3] ?? match[4] ?? "").trim() : null;
}

function hasLabelFor(sanitized: string, id: string): boolean {
  if (!id) return false;
  return new RegExp(
    `<label[^>]*\\bfor=["']${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`,
    "i",
  ).test(sanitized);
}

export function computeUrlChecks(html: string): VqaCheck[] {
  const sanitized = stripNoisyTags(html);
  const checks: VqaCheck[] = [];

  const title = sanitized.match(/<title[^>]*>([\s\S]{0,160}?)<\/title>/i)?.[1]?.trim() ?? "";
  checks.push({
    id: "title",
    name: "Document title",
    pass: title.length >= 10 && title.length <= 75,
    detail: title ? `“${title.slice(0, 80)}”` : "No <title> element found.",
  });

  const lang = attr(sanitized.match(/<html\b([^>]*)>/i)?.[1] ?? "", "lang");
  checks.push({
    id: "lang",
    name: "Language attribute",
    pass: Boolean(lang),
    detail: lang ? `lang=“${lang}”` : "<html> has no lang attribute.",
  });

  const viewport = sanitized.match(/<meta[^>]+name=["']viewport["'][^>]*>/i);
  checks.push({
    id: "viewport",
    name: "Responsive viewport meta",
    pass: Boolean(viewport),
    detail: viewport
      ? viewport[0].slice(0, 100)
      : "No viewport meta tag (mobile rendering at risk).",
  });

  const h1s = sanitized.match(/<h1\b/gi) ?? [];
  checks.push({
    id: "h1",
    name: "Single H1",
    pass: h1s.length === 1,
    detail: h1s.length === 1 ? "exactly one <h1>" : `${h1s.length} <h1> elements found.`,
  });

  const headings = (sanitized.match(/<h[1-6]\b/gi) ?? []).length;
  checks.push({
    id: "headings",
    name: "Heading structure",
    pass: headings >= 2,
    detail: `${headings} heading tags total.`,
  });

  const images = Array.from(sanitized.matchAll(/<img\b([^>]*)>/gi));
  const missingAlt = images.filter(([, attrs]) => attr(attrs, "alt") === null);
  const emptyAlt = images.filter(([, attrs]) => attr(attrs, "alt") === "");
  checks.push({
    id: "images",
    name: "Image alt coverage",
    pass: missingAlt.length === 0 && images.length > 0,
    detail: `${images.length} images · ${missingAlt.length} without alt · ${emptyAlt.length} decorative (empty)`,
  });

  const inputs = Array.from(sanitized.matchAll(/<(?:input|select|textarea)\b([^>]*)>/gi));
  const unlabeled = inputs.filter(([, attrs]) => {
    const type = (attr(attrs, "type") ?? "text").toLowerCase();
    if (["hidden", "submit", "file", "checkbox", "radio"].includes(type)) return false;
    const id = attr(attrs, "id") ?? "";
    return (
      !attr(attrs, "placeholder") &&
      !attr(attrs, "aria-label") &&
      !attr(attrs, "title") &&
      !hasLabelFor(sanitized, id)
    );
  });
  checks.push({
    id: "inputs",
    name: "Form controls have labels",
    pass: unlabeled.length === 0,
    detail: unlabeled.length
      ? `${unlabeled.length} control(s) lack placeholder/aria-label/title/<label for=…>`
      : `${inputs.length} controls, all labelled or exempt.`,
  });

  const interactive = Array.from(
    sanitized.matchAll(/<(?:a|button)\b([^>]*)>([\s\S]{0,120}?)<\/\1>/gi),
  );
  const generic = interactive.filter(([, attrs, inner]) => {
    const text = inner.replace(/<[^>]*>/g, "").trim();
    return text.length === 0 && !attr(attrs, "aria-label") && !attr(attrs, "title");
  });
  checks.push({
    id: "interactives",
    name: "Links & buttons have accessible text",
    pass: generic.length === 0,
    detail: generic.length
      ? `${generic.length} interactive element(s) with no text: ${generic
          .slice(0, 3)
          .map(([, attrs]) => (attr(attrs, "href") || attr(attrs, "class") || "").slice(0, 40))
          .filter(Boolean)
          .join(" · ")}`
      : `${interactive.length} interactive elements checked.`,
  });

  const skip = /<a[^>]*>(?:\s*|\s*<[^>]*>\s*)*skip\s*to\s*(?:content|main)/i.test(sanitized);
  checks.push({
    id: "skip",
    name: "Skip-to-content affordance",
    pass: skip,
    detail: skip ? "skip link detected" : "no visible skip-to-content link",
  });

  const giantInline = (html.match(/<style[\s\S]{10,}?<\/style>/gi) ?? []).filter(
    (block) => block.length > 40_000,
  ).length;
  checks.push({
    id: "inline-css",
    name: "No oversized inline <style> blocks",
    pass: giantInline === 0,
    detail: giantInline ? `${giantInline} inline style block(s) over 40KB slow first paint.` : "ok",
  });

  return checks;
}

export const runUrlAudit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { url: string }) => {
    const url = (input.url ?? "").trim();
    let parsed: URL | null = null;
    try {
      const candidate = new URL(url.startsWith("http") ? url : `https://${url}`);
      parsed = candidate.protocol === "http:" || candidate.protocol === "https:" ? candidate : null;
    } catch {
      parsed = null;
    }
    if (!parsed) throw new Error("Enter a valid http(s) URL.");
    return { url: parsed.toString() };
  })
  .handler(async ({ data, context }): Promise<VqaRun> => {
    let html = "";
    let fetchedBytes = 0;
    try {
      const response = await fetch(data.url, {
        headers: { Accept: "text/html", "User-Agent": "CodePilot-AI-VisualQA/1.0" },
        redirect: "follow",
        signal: AbortSignal.timeout(20_000),
      });
      html = await response.text();
      fetchedBytes = html.length;
      if (!response.ok) throw new Error(`Target responded ${response.status}.`);
    } catch (error) {
      throw new Error(
        `Could not fetch ${data.url}: ${error instanceof Error ? error.message : "network error"}`,
      );
    }

    const checks = computeUrlChecks(html.slice(0, 400_000));

    const { data: row, error } = await context.supabase
      .from("visual_qa_runs")
      .insert({
        user_id: context.userId,
        mode: "url",
        target_url: data.url,
        address: null,
        overall: {
          checks,
          label: null,
          fetchedBytes,
          note: "Deterministic DOM audit — pair with screenshots for full vision coverage.",
        } as unknown as Record<string, never>,
      })
      .select()
      .single();
    if (error || !row) {
      console.error("Failed to save URL audit", error);
      throw new Error("Audit complete but could not be saved.");
    }
    return { ...mapRun(row as unknown as Record<string, unknown>), checks };
  });

export const listVisualQaRuns = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<VqaRun[]> => {
    const { data, error } = await context.supabase
      .from("visual_qa_runs")
      .select()
      .order("created_at", { ascending: false })
      .limit(8);
    if (error) {
      console.error("Failed to list visual QA runs", error);
      return [];
    }
    return (data ?? []).map((row) => mapRun(row as unknown as Record<string, unknown>));
  });
