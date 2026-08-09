import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  disconnectGitHub,
  getGitHubFile,
  getGitHubPullDiff,
  listGitHubBranches,
  listGitHubCommits,
  listGitHubPulls,
  listGitHubRepos,
  listGitHubTree,
  getGitHubConnection,
  startGitHubOAuth,
} from "@/lib/github.functions";
import { PENDING_REVIEW_KEY, type GitHubRepo, type PendingReview } from "@/lib/github-types";
import {
  ChevronRight,
  File as FileIcon,
  Folder,
  GitBranch,
  GitCommit,
  GitPullRequest,
  Github,
  Loader2,
  Lock,
  Search,
  Sparkles,
  Star,
  Unplug,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/repositories")({
  validateSearch: (search: Record<string, unknown>) => ({
    github: typeof search["github"] === "string" ? (search["github"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Repositories — CodePilot AI" },
      {
        name: "description",
        content: "Browse public GitHub repositories and pull files straight into a review.",
      },
      { property: "og:title", content: "Repositories — CodePilot AI" },
      {
        property: "og:description",
        content: "Browse GitHub repositories and review their files with AI.",
      },
    ],
  }),
  component: RepositoriesPage,
});

function RepositoriesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { github } = Route.useSearch();

  const fetchConnection = useServerFn(getGitHubConnection);
  const startOAuth = useServerFn(startGitHubOAuth);
  const disconnect = useServerFn(disconnectGitHub);
  const fetchRepos = useServerFn(listGitHubRepos);
  const fetchBranches = useServerFn(listGitHubBranches);
  const fetchCommits = useServerFn(listGitHubCommits);
  const fetchPulls = useServerFn(listGitHubPulls);
  const fetchTree = useServerFn(listGitHubTree);
  const fetchFile = useServerFn(getGitHubFile);
  const fetchDiff = useServerFn(getGitHubPullDiff);

  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<GitHubRepo | null>(null);
  const [branch, setBranch] = useState<string>("");
  const [dir, setDir] = useState("");
  const [prState, setPrState] = useState<"open" | "closed" | "all">("open");

  const connection = useQuery({
    queryKey: ["github", "connection"],
    queryFn: () => fetchConnection(),
  });
  const connected = Boolean(connection.data);

  useEffect(() => {
    if (!github) return;
    if (github === "connected") toast.success("GitHub account connected");
    else if (github === "denied") toast.error("GitHub authorization was cancelled");
    else toast.error("Could not connect GitHub. Please try again.");
    void queryClient.invalidateQueries({ queryKey: ["github"] });
    void navigate({ to: "/repositories", search: { github: undefined }, replace: true });
  }, [github, navigate, queryClient]);

  const repos = useQuery({
    queryKey: ["github", "repos"],
    queryFn: () => fetchRepos(),
    enabled: connected,
  });

  const owner = selected?.full_name.split("/")[0] ?? "";
  const repoName = selected?.name ?? "";

  const branches = useQuery({
    queryKey: ["github", "branches", selected?.full_name],
    queryFn: () => fetchBranches({ data: { owner, repo: repoName } }),
    enabled: Boolean(selected),
  });

  const commits = useQuery({
    queryKey: ["github", "commits", selected?.full_name, branch],
    queryFn: () => fetchCommits({ data: { owner, repo: repoName, ref: branch } }),
    enabled: Boolean(selected && branch),
  });

  const pulls = useQuery({
    queryKey: ["github", "pulls", selected?.full_name, prState],
    queryFn: () => fetchPulls({ data: { owner, repo: repoName, state: prState } }),
    enabled: Boolean(selected),
  });

  const tree = useQuery({
    queryKey: ["github", "tree", selected?.full_name, branch, dir],
    queryFn: () => fetchTree({ data: { owner, repo: repoName, ref: branch, path: dir } }),
    enabled: Boolean(selected && branch),
  });

  const connectMutation = useMutation({
    mutationFn: () => startOAuth(),
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not start GitHub sign-in"),
  });

  const disconnectMutation = useMutation({
    mutationFn: () => disconnect(),
    onSuccess: () => {
      setSelected(null);
      queryClient.removeQueries({ queryKey: ["github"] });
      void queryClient.invalidateQueries({ queryKey: ["github", "connection"] });
      toast.success("GitHub account disconnected");
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async (payload: { kind: "file"; path: string } | { kind: "pr"; number: number }) =>
      payload.kind === "file"
        ? fetchFile({ data: { owner, repo: repoName, ref: branch, path: payload.path } })
        : fetchDiff({ data: { owner, repo: repoName, number: payload.number } }),
    onSuccess: (file) => {
      const pending: PendingReview = {
        code: file.content,
        title: file.path.split("/").pop() ?? file.path,
        sourceRef: `${selected?.full_name} · ${file.path}`,
      };
      sessionStorage.setItem(PENDING_REVIEW_KEY, JSON.stringify(pending));
      void navigate({ to: "/review" });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not load that from GitHub"),
  });

  const visibleRepos = useMemo(() => {
    const list = repos.data ?? [];
    const needle = filter.trim().toLowerCase();
    return needle ? list.filter((r) => r.full_name.toLowerCase().includes(needle)) : list;
  }, [repos.data, filter]);

  function openRepo(repo: GitHubRepo) {
    setSelected(repo);
    setBranch(repo.default_branch);
    setDir("");
  }

  if (connection.isLoading) {
    return (
      <div className="grid place-items-center py-24">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <header>
          <h1 className="text-2xl font-bold">Repositories</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Connect GitHub to import your repositories and review branches, commits and pull
            requests.
          </p>
        </header>
        <Card className="glass-panel items-center gap-4 p-10 text-center">
          <span className="grid size-12 place-items-center rounded-full border border-primary/40 bg-primary/10">
            <Github className="size-6 text-primary" />
          </span>
          <div>
            <p className="font-medium">Connect your GitHub account</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              CodePilot reads repository metadata and file contents so it can review them. Your
              access token is encrypted and never leaves the server.
            </p>
          </div>
          <Button onClick={() => connectMutation.mutate()} disabled={connectMutation.isPending}>
            {connectMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Github className="size-4" />
            )}
            Continue with GitHub
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Repositories</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Connected as{" "}
            <span className="font-mono text-foreground">@{connection.data?.login}</span>
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => disconnectMutation.mutate()}
          disabled={disconnectMutation.isPending}
        >
          <Unplug className="size-4" />
          Disconnect
        </Button>
      </header>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card className="glass-panel h-fit gap-3 p-4">
          <div className="relative">
            <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter repositories"
              className="pl-8 font-mono text-xs"
            />
          </div>
          <div className="max-h-[32rem] space-y-1 overflow-y-auto">
            {repos.isLoading && (
              <p className="p-3 text-xs text-muted-foreground">Loading repositories…</p>
            )}
            {repos.isError && (
              <p className="p-3 text-xs text-destructive">
                {repos.error instanceof Error ? repos.error.message : "Could not load repositories"}
              </p>
            )}
            {visibleRepos.map((repo) => (
              <button
                key={repo.id}
                type="button"
                onClick={() => openRepo(repo)}
                className={`w-full rounded-md px-3 py-2 text-left transition-colors hover:bg-accent ${
                  selected?.id === repo.id ? "bg-accent" : ""
                }`}
              >
                <span className="flex items-center gap-2">
                  {repo.private ? (
                    <Lock className="size-3 shrink-0 text-muted-foreground" />
                  ) : (
                    <GitBranch className="size-3 shrink-0 text-primary" />
                  )}
                  <span className="truncate font-mono text-xs">{repo.full_name}</span>
                </span>
                <span className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                  {repo.language ?? "—"}
                  <Star className="size-3" />
                  {repo.stargazers_count.toLocaleString()}
                </span>
              </button>
            ))}
            {!repos.isLoading && visibleRepos.length === 0 && (
              <p className="p-3 text-xs text-muted-foreground">No repositories match.</p>
            )}
          </div>
        </Card>

        {!selected ? (
          <Card className="glass-panel grid place-items-center p-16 text-sm text-muted-foreground">
            Pick a repository to browse its branches, commits, pull requests and files.
          </Card>
        ) : (
          <Card className="glass-panel gap-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-mono text-sm font-medium">{selected.full_name}</p>
                <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                  {selected.description ?? "No description"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={branch}
                  onValueChange={(value) => {
                    setBranch(value);
                    setDir("");
                  }}
                >
                  <SelectTrigger className="w-52 font-mono text-xs">
                    <SelectValue placeholder="Branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {(branches.data ?? []).map((item) => (
                      <SelectItem key={item.name} value={item.name} className="font-mono text-xs">
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="ghost" asChild>
                  <a href={selected.html_url} target="_blank" rel="noreferrer noopener">
                    GitHub
                  </a>
                </Button>
              </div>
            </div>

            <Tabs defaultValue="files">
              <TabsList>
                <TabsTrigger value="files">Files</TabsTrigger>
                <TabsTrigger value="commits">Commits</TabsTrigger>
                <TabsTrigger value="pulls">Pull requests</TabsTrigger>
              </TabsList>

              <TabsContent value="files" className="mt-4 space-y-2">
                <div className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
                  <button
                    type="button"
                    className="hover:text-foreground"
                    onClick={() => setDir("")}
                  >
                    {selected.name}
                  </button>
                  {dir
                    .split("/")
                    .filter(Boolean)
                    .map((segment, index, all) => (
                      <span key={`${segment}-${index}`} className="flex items-center gap-1">
                        <ChevronRight className="size-3" />
                        <button
                          type="button"
                          className="hover:text-foreground"
                          onClick={() => setDir(all.slice(0, index + 1).join("/"))}
                        >
                          {segment}
                        </button>
                      </span>
                    ))}
                </div>
                {tree.isLoading && <p className="text-xs text-muted-foreground">Loading files…</p>}
                {tree.isError && (
                  <p className="text-xs text-destructive">
                    {tree.error instanceof Error ? tree.error.message : "Could not load files"}
                  </p>
                )}
                <div className="divide-y divide-border rounded-md border border-border">
                  {(tree.data ?? []).map((entry) => (
                    <div key={entry.path} className="flex items-center gap-2 px-3 py-2">
                      {entry.type === "dir" ? (
                        <button
                          type="button"
                          onClick={() => setDir(entry.path)}
                          className="flex min-w-0 flex-1 items-center gap-2 text-left"
                        >
                          <Folder className="size-4 shrink-0 text-primary" />
                          <span className="truncate font-mono text-xs">{entry.name}</span>
                        </button>
                      ) : (
                        <>
                          <FileIcon className="size-4 shrink-0 text-muted-foreground" />
                          <span className="min-w-0 flex-1 truncate font-mono text-xs">
                            {entry.name}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={reviewMutation.isPending}
                            onClick={() =>
                              reviewMutation.mutate({ kind: "file", path: entry.path })
                            }
                          >
                            <Sparkles className="size-3.5" />
                            Review
                          </Button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="commits" className="mt-4 space-y-2">
                {commits.isLoading && (
                  <p className="text-xs text-muted-foreground">Loading commits…</p>
                )}
                {(commits.data ?? []).map((commit) => (
                  <div
                    key={commit.sha}
                    className="flex items-start gap-3 rounded-md border border-border px-3 py-2"
                  >
                    <GitCommit className="mt-0.5 size-4 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs">{commit.commit.message.split("\n")[0]}</p>
                      <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                        {commit.sha.slice(0, 7)} ·{" "}
                        {commit.author?.login ?? commit.commit.author?.name}
                        {commit.commit.author?.date
                          ? ` · ${new Date(commit.commit.author.date).toLocaleDateString()}`
                          : ""}
                      </p>
                    </div>
                    <Button size="sm" variant="ghost" asChild>
                      <a href={commit.html_url} target="_blank" rel="noreferrer noopener">
                        View
                      </a>
                    </Button>
                  </div>
                ))}
                {!commits.isLoading && (commits.data ?? []).length === 0 && (
                  <p className="text-xs text-muted-foreground">No commits on this branch.</p>
                )}
              </TabsContent>

              <TabsContent value="pulls" className="mt-4 space-y-2">
                <div className="flex gap-2">
                  {(["open", "closed", "all"] as const).map((state) => (
                    <Button
                      key={state}
                      size="sm"
                      variant={prState === state ? "secondary" : "ghost"}
                      onClick={() => setPrState(state)}
                    >
                      {state}
                    </Button>
                  ))}
                </div>
                {pulls.isLoading && (
                  <p className="text-xs text-muted-foreground">Loading pull requests…</p>
                )}
                {(pulls.data ?? []).map((pull) => (
                  <div
                    key={pull.id}
                    className="flex items-start gap-3 rounded-md border border-border px-3 py-2"
                  >
                    <GitPullRequest className="mt-0.5 size-4 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs">
                        #{pull.number} {pull.title}
                      </p>
                      <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                        {pull.user?.login} · {pull.head.ref} → {pull.base.ref}
                      </p>
                    </div>
                    {pull.draft && (
                      <Badge variant="secondary" className="text-[10px]">
                        draft
                      </Badge>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={reviewMutation.isPending}
                      onClick={() => reviewMutation.mutate({ kind: "pr", number: pull.number })}
                    >
                      <Sparkles className="size-3.5" />
                      Review diff
                    </Button>
                  </div>
                ))}
                {!pulls.isLoading && (pulls.data ?? []).length === 0 && (
                  <p className="text-xs text-muted-foreground">No {prState} pull requests.</p>
                )}
              </TabsContent>
            </Tabs>
          </Card>
        )}
      </div>
    </div>
  );
}
