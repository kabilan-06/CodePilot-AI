import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { buildTwinSnapshot, getTwinSnapshot } from "@/lib/twin/twin.functions";
import { listGitHubBranches, listGitHubRepos } from "@/lib/github.functions";
import type { TwinEdge, TwinNode, TwinSnapshot } from "@/lib/twin/twin-types";
import {
  AlertTriangle,
  Building2,
  Database,
  Globe,
  Link2,
  Loader2,
  Network,
  Radar,
  Package,
  Search,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/twin")({
  validateSearch: (search: Record<string, unknown>) => ({
    owner: typeof search.owner === "string" ? search.owner : undefined,
    repo: typeof search.repo === "string" ? search.repo : undefined,
    ref: typeof search.ref === "string" ? search.ref : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Codebase Digital Twin — CodePilot AI" },
      {
        name: "description",
        content: "Interactive architecture visualization of your real repository.",
      },
    ],
  }),
  component: TwinPage,
});

const NODE_COLORS: Record<TwinNode["kind"], string> = {
  file: "#38bdf8",
  endpoint: "#a78bfa",
  db: "#fbbf24",
  package: "#94a3b8",
};

const KIND_LABELS: Record<TwinNode["kind"], string> = {
  file: "Source files",
  endpoint: "API endpoints",
  db: "Database tables",
  package: "Packages",
};

function TwinPage() {
  const { owner, repo, ref } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedRepo, setSelectedRepo] = useState<string>(owner ? `${owner}/${repo ?? ""}` : "");
  const [branch, setBranch] = useState<string>(ref ?? "");
  const [snapshot, setSnapshot] = useState<TwinSnapshot | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [visibleKinds, setVisibleKinds] = useState<Set<TwinNode["kind"]>>(
    new Set(["file", "endpoint", "db", "package"]),
  );
  const [view, setView] = useState({ zoom: 1, tx: 0, ty: 0 });
  const [autoTried, setAutoTried] = useState(false);

  const buildTwin = useServerFn(buildTwinSnapshot);
  const fetchTwin = useServerFn(getTwinSnapshot);
  const fetchRepos = useServerFn(listGitHubRepos);
  const fetchBranches = useServerFn(listGitHubBranches);

  const reposQuery = useQuery({
    queryKey: ["github-repos"],
    queryFn: () => fetchRepos(),
    retry: false,
    staleTime: 60_000,
  });

  const branchesQuery = useQuery({
    queryKey: ["twin-branches", selectedRepo],
    queryFn: async () => {
      const [owner_, repo_] = selectedRepo.split("/");
      return fetchBranches({ data: { owner: owner_, repo: repo_ } });
    },
    enabled: selectedRepo.includes("/") && selectedRepo.split("/").every(Boolean),
    retry: false,
    staleTime: 60_000,
  });

  useEffect(() => {
    const branches = branchesQuery.data;
    if (!branch && branches?.length) setBranch(branches[0].name);
  }, [branchesQuery.data, branch]);

  const buildMutation = useMutation({
    mutationFn: async () => {
      const [owner_, repo_] = selectedRepo.split("/");
      const result = await buildTwin({ data: { owner: owner_, repo: repo_, ref: branch } });
      return result;
    },
    onSuccess: (result) => {
      setSnapshot(result.snapshot);
      toast.success(
        result.reused
          ? "Reused the cached twin for this tree state."
          : "Digital twin built from the live repository.",
      );
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Twin build failed."),
  });

  // Deep-link support: ?owner=&repo=&ref= auto-loads the latest snapshot.
  useEffect(() => {
    if (!owner || !repo || !ref || autoTried) return;
    setAutoTried(true);
    setSelectedRepo(`${owner}/${repo}`);
    setBranch(ref);
    fetchTwin({ data: { owner, repo, ref } })
      .then((snapshot_) => {
        if (snapshot_) setSnapshot(snapshot_);
      })
      .catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owner, repo, ref, autoTried]);

  useEffect(() => {
    if (!snapshot) return;
    navigate({
      to: "/twin",
      search: { owner: snapshot.owner, repo: snapshot.repo, ref: snapshot.ref },
      replace: true,
    });
  }, [snapshot, navigate]);

  const graph = snapshot?.graph;
  const stats = snapshot?.stats;

  const adjacency = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const edge of graph?.edges ?? []) {
      if (!map.has(edge.from)) map.set(edge.from, new Set());
      if (!map.has(edge.to)) map.set(edge.to, new Set());
      map.get(edge.from)!.add(edge.to);
      map.get(edge.to)!.add(edge.from);
    }
    return map;
  }, [graph]);

  const focusId = selectedId ?? hoverId;
  const query = search.trim().toLowerCase();

  const nodes = useMemo(() => {
    if (!graph) return [];
    return graph.nodes.filter(
      (node) =>
        visibleKinds.has(node.kind) &&
        (!query ||
          node.label.toLowerCase().includes(query) ||
          node.path?.toLowerCase().includes(query)),
    );
  }, [graph, visibleKinds, query]);

  const nodeSet = useMemo(() => new Set(nodes.map((n) => n.id)), [nodes]);

  const edges = useMemo(() => {
    if (!graph) return [];
    return graph.edges.filter(
      (edge) =>
        nodeSet.has(edge.from) &&
        nodeSet.has(edge.to) &&
        (!focusId || edge.from === focusId || edge.to === focusId),
    );
  }, [graph, nodeSet, focusId]);

  const selectedNode = graph?.nodes.find((n) => n.id === selectedId) ?? null;
  const neighbors = selectedId ? Array.from(adjacency.get(selectedId) ?? []) : [];

  const graphBounds = useMemo(() => {
    if (!nodes.length) return null;
    const xs = nodes.map((n) => n.x);
    const ys = nodes.map((n) => n.y);
    return {
      minX: Math.min(...xs) - 60,
      minY: Math.min(...ys) - 60,
      width: Math.max(...xs) - Math.min(...xs) + 260,
      height: Math.max(...ys) - Math.min(...ys) + 140,
    };
  }, [nodes]);

  const svgRef = useRef<SVGSVGElement>(null);
  const dragState = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);

  function onWheel(event: React.WheelEvent) {
    const factor = event.deltaY < 0 ? 1.1 : 0.9;
    setView((v) => ({ ...v, zoom: Math.min(4, Math.max(0.15, v.zoom * factor)) }));
  }

  function onPointerDown(event: React.PointerEvent) {
    if (event.button !== 0) return;
    dragState.current = { x: event.clientX, y: event.clientY, tx: view.tx, ty: view.ty };
    (event.target as Element).setPointerCapture?.(event.pointerId);
  }

  function onPointerMove(event: React.PointerEvent) {
    const state = dragState.current;
    if (!state) return;
    setView((v) => ({
      ...v,
      tx: state.tx + (event.clientX - state.x),
      ty: state.ty + (event.clientY - state.y),
    }));
  }

  function endDrag() {
    dragState.current = null;
  }

  const repos = reposQuery.data ?? [];
  const repoName = selectedRepo.split("/")[1] ?? "";

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Network className="size-5 text-primary" /> Codebase Digital Twin
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            A live architecture map built from your actual repository — dependencies, API surface
            and database mapping.
          </p>
        </div>
        {snapshot && (
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link
                to="/radar"
                search={{
                  owner: snapshot.owner,
                  repo: snapshot.repo,
                  ref: snapshot.ref,
                  report: undefined,
                }}
              >
                <Radar className="size-4" /> Assess risk
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link
                to="/swarm"
                search={{
                  owner: snapshot.owner,
                  repo: snapshot.repo,
                  ref: snapshot.ref,
                  task: undefined,
                  run: undefined,
                }}
              >
                <Sparkles className="size-4" /> Dispatch swarm
              </Link>
            </Button>
          </div>
        )}
      </header>

      <Card className="glass-panel flex flex-wrap items-end gap-3 p-5">
        <div className="min-w-52 flex-1">
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Repository</p>
          <Select value={selectedRepo} onValueChange={setSelectedRepo}>
            <SelectTrigger>
              {selectedRepo ? (
                <SelectValue />
              ) : (
                <span className="text-muted-foreground">
                  {reposQuery.isLoading ? "Loading repositories…" : "Select a repository"}
                </span>
              )}
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {repos.map((repoItem) => (
                <SelectItem key={repoItem.full_name} value={repoItem.full_name}>
                  {repoItem.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-44">
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Ref</p>
          <Select value={branch} onValueChange={setBranch}>
            <SelectTrigger>
              <span className="truncate">{branch || "branch"}</span>
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {(branchesQuery.data ?? []).map((branchItem) => (
                <SelectItem key={branchItem.name} value={branchItem.name}>
                  {branchItem.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          className="gap-2"
          disabled={!selectedRepo.includes("/") || !branch || buildMutation.isPending}
          onClick={() => buildMutation.mutate()}
        >
          {buildMutation.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Network className="size-4" />
          )}
          Build twin
        </Button>
        {reposQuery.isError && (
          <p className="w-full text-xs text-muted-foreground">
            GitHub is not connected — connect your account from{" "}
            <Link to="/repositories" search={{ github: undefined }} className="underline">
              Repositories
            </Link>
            .
          </p>
        )}
      </Card>

      {snapshot && stats && (
        <>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="secondary" className="gap-1.5">
              <Link2 className="size-3" /> {snapshot.owner}/{snapshot.repo} @{snapshot.ref}
            </Badge>
            <Badge variant="secondary">{stats.scanned} files scanned</Badge>
            <Badge variant="secondary">{stats.analyzed} analyzed in depth</Badge>
            <Badge variant="secondary" className="gap-1.5">
              <Globe className="size-3" /> {stats.endpointCount} endpoints
            </Badge>
            <Badge variant="secondary" className="gap-1.5">
              <Database className="size-3" /> {stats.tableCount} tables
            </Badge>
            <Badge variant="secondary" className="gap-1.5">
              <Package className="size-3" /> {stats.packageCount} packages
            </Badge>
            <Badge variant="secondary">{Object.keys(stats.languages).length} languages</Badge>
            {stats.warnings.slice(0, 2).map((warning) => (
              <Badge key={warning} variant="outline" className="gap-1.5 text-warning">
                <AlertTriangle className="size-3" /> {warning}
              </Badge>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-[1fr_300px]">
            <Card className="glass-panel overflow-hidden">
              <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
                <div className="relative w-56">
                  <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search files, endpoints…"
                    className="h-8 pl-8"
                  />
                </div>
                {(Object.keys(KIND_LABELS) as TwinNode["kind"][]).map((kind) => (
                  <button
                    key={kind}
                    onClick={() =>
                      setVisibleKinds((current) => {
                        const next = new Set(current);
                        if (next.has(kind)) next.delete(kind);
                        else next.add(kind);
                        return next;
                      })
                    }
                    className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition-colors data-[on=true]:border-primary/50 data-[on=true]:text-foreground"
                    data-on={visibleKinds.has(kind)}
                  >
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: NODE_COLORS[kind] }}
                    />
                    {KIND_LABELS[kind]}
                  </button>
                ))}
                <div className="ml-auto flex gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8"
                    onClick={() => setView((v) => ({ ...v, zoom: Math.min(4, v.zoom * 1.25) }))}
                  >
                    +
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8"
                    onClick={() => setView({ zoom: 1, tx: 0, ty: 0 })}
                  >
                    <Building2 className="size-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8"
                    onClick={() => setView((v) => ({ ...v, zoom: Math.max(0.15, v.zoom / 1.25) }))}
                  >
                    −
                  </Button>
                </div>
              </div>

              <svg
                ref={svgRef}
                className="block h-[560px] w-full cursor-grab touch-none bg-sky-50/40 dark:bg-card/60"
                onWheel={onWheel}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
                onPointerLeave={endDrag}
                preserveAspectRatio="xMidYMid meet"
                viewBox={
                  graphBounds
                    ? `${graphBounds.minX} ${graphBounds.minY} ${Math.max(graphBounds.width, 200)} ${Math.max(graphBounds.height, 200)}`
                    : "0 0 200 200"
                }
              >
                <g transform={`translate(${view.tx} ${view.ty}) scale(${view.zoom})`}>
                  {edges.map((edge) => {
                    if (!graph) return null;
                    const from = graph.nodes.find((n) => n.id === edge.from);
                    const to = graph.nodes.find((n) => n.id === edge.to);
                    if (!from || !to) return null;
                    const active = !focusId || edge.from === focusId || edge.to === focusId;
                    return (
                      <line
                        key={`${edge.from}|${edge.to}|${edge.kind}`}
                        x1={from.x}
                        y1={from.y}
                        x2={to.x}
                        y2={to.y}
                        stroke={focusId && active ? "#6366f1" : "#94a3b8"}
                        strokeOpacity={active ? 0.7 : 0.12}
                        strokeWidth={active ? 1.4 : 1}
                      />
                    );
                  })}
                  {nodes.map((node) => {
                    const dimmed =
                      focusId && focusId !== node.id && !adjacency.get(focusId)?.has(node.id);
                    return (
                      <g
                        key={node.id}
                        transform={`translate(${node.x} ${node.y})`}
                        opacity={dimmed ? 0.35 : 1}
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedId((current) => (current === node.id ? null : node.id));
                        }}
                        onMouseEnter={() => setHoverId(node.id)}
                        onMouseLeave={() => setHoverId(null)}
                        style={{ cursor: "pointer" }}
                      >
                        {node.kind === "file" ? (
                          <rect
                            width={Math.max(14, Math.min(26, 10 + node.fanOut * 2))}
                            height={8}
                            rx={2}
                            x={-6}
                            y={-4}
                            fill={NODE_COLORS.file}
                            opacity={selectedId === node.id ? 1 : 0.85}
                          />
                        ) : (
                          <circle
                            r={node.kind === "db" ? 6 : 5}
                            fill={NODE_COLORS[node.kind]}
                            opacity={selectedId === node.id ? 1 : 0.85}
                          />
                        )}
                        <text
                          x={8}
                          y={3}
                          fontSize={9}
                          fill="currentColor"
                          className="fill-foreground"
                        >
                          {node.label.length > 34 ? `${node.label.slice(0, 33)}…` : node.label}
                        </text>
                      </g>
                    );
                  })}
                </g>
              </svg>

              {!nodes.length && (
                <p className="p-4 text-center text-sm text-muted-foreground">
                  No nodes match the current filters.
                </p>
              )}
            </Card>

            <div className="space-y-4">
              {selectedNode ? (
                <Card className="glass-panel p-4">
                  <div className="flex items-center gap-2">
                    <span
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: NODE_COLORS[selectedNode.kind] }}
                    />
                    <p className="font-mono text-sm font-semibold break-all">
                      {selectedNode.label}
                    </p>
                  </div>
                  {selectedNode.path && (
                    <p className="mt-1 font-mono text-xs break-all text-muted-foreground">
                      {selectedNode.path}
                    </p>
                  )}
                  <dl className="mt-3 space-y-1.5 text-xs">
                    <Row label="Kind" value={selectedNode.kind} />
                    {selectedNode.lang && <Row label="Language" value={selectedNode.lang} />}
                    {selectedNode.loc > 0 && <Row label="Lines" value={String(selectedNode.loc)} />}
                    {selectedNode.complexity != null && (
                      <Row label="Complexity signals" value={String(selectedNode.complexity)} />
                    )}
                    <Row label="Depended on by" value={String(selectedNode.fanIn)} />
                    <Row label="Depends on" value={String(selectedNode.fanOut)} />
                    {selectedNode.detail && <Row label="Detail" value={selectedNode.detail} />}
                  </dl>
                  {neighbors.length > 0 && (
                    <div className="mt-3 border-t border-border pt-3">
                      <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                        Connections
                      </p>
                      <div className="flex max-h-40 flex-wrap gap-1 overflow-y-auto">
                        {neighbors.slice(0, 40).map((neighborgId) => {
                          const node = graph?.nodes.find((n) => n.id === neighborgId);
                          if (!node) return null;
                          return (
                            <button
                              key={neighborgId}
                              className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] hover:border-primary/50"
                              onClick={() => setSelectedId(neighborgId)}
                            >
                              {node.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </Card>
              ) : (
                <Card className="glass-panel p-4 text-xs text-muted-foreground">
                  Click any node to inspect it: incoming/outgoing dependencies, LOC, complexity and
                  framework hits. Drag to pan, scroll to zoom.
                </Card>
              )}

              <Card className="glass-panel p-4">
                <p className="text-xs font-semibold text-muted-foreground">Languages</p>
                <div className="mt-2 space-y-1.5">
                  {Object.entries(stats.languages)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 8)
                    .map(([lang, count]) => (
                      <div key={lang} className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{lang}</span>
                        <span className="font-mono">{count}</span>
                      </div>
                    ))}
                </div>
              </Card>
            </div>
          </div>
        </>
      )}

      {!snapshot && (
        <Card className="glass-panel p-10 text-center">
          <Network className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            Pick a repository, choose a branch and build a twin to see{" "}
            {repoName ? `${repoName}'s` : "your"} real architecture as an interactive map.
          </p>
        </Card>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate text-right font-mono">{value}</dd>
    </div>
  );
}
