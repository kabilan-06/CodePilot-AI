import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ReviewDetail } from "@/components/review-detail";
import { runReview } from "@/lib/review.functions";
import { LANGUAGES, type ReviewRecord } from "@/lib/review-types";
import { downloadFile, toMarkdown } from "@/lib/reviews";
import { PENDING_REVIEW_KEY, type PendingReview } from "@/lib/github-types";
import { Download, Loader2, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/review")({
  head: () => ({
    meta: [
      { title: "AI Code Review — CodePilot AI" },
      {
        name: "description",
        content: "Paste code or a GitHub file URL and get a deep AI review in seconds.",
      },
      { property: "og:title", content: "AI Code Review — CodePilot AI" },
      {
        property: "og:description",
        content: "Paste code or a GitHub file URL and get a deep AI review.",
      },
    ],
  }),
  component: ReviewPage,
});

function parseGithubUrl(url: string) {
  const match = url.match(
    /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/(?:blob|raw)\/([^/]+)\/(.+)$/,
  );
  if (!match) return null;
  const [, owner, repo, ref, path] = match;
  return {
    raw: `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${path}`,
    path,
  };
}

function ReviewPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const review = useServerFn(runReview);

  const [code, setCode] = useState("");
  const [language, setLanguage] = useState<string>("typescript");
  const [title, setTitle] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [source, setSource] = useState<"paste" | "github">("paste");
  const [fetching, setFetching] = useState(false);
  const [result, setResult] = useState<ReviewRecord | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem(PENDING_REVIEW_KEY);
    if (!stored) return;
    sessionStorage.removeItem(PENDING_REVIEW_KEY);
    try {
      const pending = JSON.parse(stored) as PendingReview;
      setCode(pending.code);
      setTitle(pending.title);
      setGithubUrl(pending.sourceRef);
      setSource("github");
      toast.success(`Imported ${pending.title} from GitHub`);
    } catch {
      /* ignore malformed handoff */
    }
  }, []);

  const mutation = useMutation({
    mutationFn: async () =>
      review({
        data: {
          code,
          language,
          source,
          sourceRef: source === "github" ? githubUrl : null,
          title: title || undefined,
        },
      }),
    onSuccess: (data) => {
      setResult({
        ...data,
        language,
        source,
        source_ref: source === "github" ? githubUrl : null,
        code,
      });
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      toast.success(`Review complete — grade ${data.grade}`);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Review failed"),
  });

  async function importFromGithub() {
    const parsed = parseGithubUrl(githubUrl.trim());
    if (!parsed) {
      toast.error(
        "Paste a GitHub file URL like https://github.com/owner/repo/blob/main/src/App.tsx",
      );
      return;
    }
    setFetching(true);
    try {
      const response = await fetch(parsed.raw);
      if (!response.ok) throw new Error("File not found or the repository is private.");
      const text = await response.text();
      if (text.length > 40000) throw new Error("That file is too large (max 40,000 characters).");
      setCode(text);
      setSource("github");
      if (!title) setTitle(parsed.path.split("/").pop() ?? "");
      toast.success("File imported from GitHub");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import failed");
    } finally {
      setFetching(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold">AI Code Review</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Paste a snippet or import a file from GitHub. CodePilot returns graded, line-aware
          findings.
        </p>
      </header>

      <Card className="glass-panel p-6">
        <Tabs value={source} onValueChange={(value) => setSource(value as "paste" | "github")}>
          <TabsList>
            <TabsTrigger value="paste">Paste code</TabsTrigger>
            <TabsTrigger value="github">From GitHub</TabsTrigger>
          </TabsList>
          <TabsContent value="github" className="mt-4">
            <Label htmlFor="gh">GitHub file URL</Label>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <Input
                id="gh"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/owner/repo/blob/main/src/App.tsx"
                className="font-mono text-xs"
              />
              <Button variant="outline" onClick={importFromGithub} disabled={fetching}>
                {fetching && <Loader2 className="size-4 animate-spin" />}
                Import
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="paste" className="mt-4">
            <p className="text-xs text-muted-foreground">
              Paste up to 40,000 characters of code below.
            </p>
          </TabsContent>
        </Tabs>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="title">Title (optional)</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Checkout service refactor"
              maxLength={120}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="language">Language</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger id="language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((item) => (
                  <SelectItem key={item} value={item} className="font-mono text-xs">
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <Label htmlFor="code">Code</Label>
          <Textarea
            id="code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="// paste your code here"
            className="min-h-72 font-mono text-xs"
            maxLength={40000}
          />
          <p className="text-right font-mono text-xs text-muted-foreground">
            {code.length.toLocaleString()} / 40,000
          </p>
        </div>

        <div className="mt-2 flex flex-wrap gap-3">
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || code.trim().length < 10 || code.length > 40000}
          >
            {mutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {mutation.isPending ? "Analyzing…" : "Run AI review"}
          </Button>
          {result && (
            <>
              <Button
                variant="outline"
                onClick={() =>
                  downloadFile(`${result.title.replace(/\s+/g, "-")}.md`, toMarkdown(result))
                }
              >
                <Download className="size-4" />
                Export report
              </Button>
              <Button variant="ghost" onClick={() => navigate({ to: "/history" })}>
                View history
              </Button>
            </>
          )}
        </div>
      </Card>

      {result && <ReviewDetail review={result} />}
    </div>
  );
}
