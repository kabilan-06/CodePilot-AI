import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { v as require_jsx_runtime } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { t as Card } from "./card-CzXpCsbD.mjs";
import { a as useQueryClient, r as useQuery, t as useMutation } from "../_libs/tanstack__react-query.mjs";
import { g as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as Button } from "./button-Bq5vK6RO.mjs";
import { t as Input } from "./input-B8Q2ztVi.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { C as Folder, a as Star, b as GitCommitHorizontal, k as ChevronRight, m as LoaderCircle, o as Sparkles, p as Lock, t as Unplug, u as Search, v as Github, w as File, x as GitBranch, y as GitPullRequest } from "../_libs/lucide-react.mjs";
import { t as Badge } from "./badge-D1Dupn2y.mjs";
import { c as createServerFn } from "./createServerFn-BFFE07zL.mjs";
import { t as requireSupabaseAuth } from "./auth-middleware-BwdutfJC.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./select-Dg1urBTx.mjs";
import { a as TabsTrigger, i as TabsList, n as Tabs, o as createSsrRpc, r as TabsContent, s as useServerFn, t as PENDING_REVIEW_KEY } from "./github-types-CVi2GN0e.mjs";
import { t as Route } from "./repositories-VjLnWDO5.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/repositories-OYdMZedq.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var getGitHubConnection = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("a5d3964aeba5e2403eff4158fdc1d8f81114091e60aed77b91ed3f91179f3ed3"));
var startGitHubOAuth = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("4e8fb107ec834a0fc0b21e89b567d0ec375e1ab8e14b54501a07323e4538f338"));
var disconnectGitHub = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("35888fe96a8afdb8a7aa61bc0fbc701d38e7e56e42039d3eb244128f14ef8854"));
var listGitHubRepos = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("cb2e10d8a3bf2bd5497a578e673da196a2f625eaee915acdcc1105da8605c79d"));
var listGitHubBranches = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).validator((input) => input).handler(createSsrRpc("1e7da6f76d092fbe8b68144680ee6ce703969113dde1fb8d2c3a5960e7f7f130"));
var listGitHubCommits = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).validator((input) => input).handler(createSsrRpc("c17cce1c01dd07c5f3d318a8f7cfd5fcee74d9af683eabfbfcd0db0b8f8f82e7"));
var listGitHubPulls = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).validator((input) => input).handler(createSsrRpc("7b49fb73bfa50008d185d80cb05c7580f0f60d077b89c59db2987bf8b68e4142"));
var listGitHubTree = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).validator((input) => input).handler(createSsrRpc("f13a13259bcbec88f1b81ca5a0d525ad9ce2148a083b81362562586b21582374"));
var getGitHubFile = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).validator((input) => input).handler(createSsrRpc("29c7c44b065b84857e909b7189f7bf026be44052ced6fe10fde57aee80e9cc78"));
var getGitHubPullDiff = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).validator((input) => input).handler(createSsrRpc("70a6255b393e8c540b6dee12b302423545f95af59832f2eafc6e294576395a21"));
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
	const [filter, setFilter] = (0, import_react.useState)("");
	const [selected, setSelected] = (0, import_react.useState)(null);
	const [branch, setBranch] = (0, import_react.useState)("");
	const [dir, setDir] = (0, import_react.useState)("");
	const [prState, setPrState] = (0, import_react.useState)("open");
	const connection = useQuery({
		queryKey: ["github", "connection"],
		queryFn: () => fetchConnection()
	});
	const connected = Boolean(connection.data);
	(0, import_react.useEffect)(() => {
		if (!github) return;
		if (github === "connected") toast.success("GitHub account connected");
		else if (github === "denied") toast.error("GitHub authorization was cancelled");
		else toast.error("Could not connect GitHub. Please try again.");
		queryClient.invalidateQueries({ queryKey: ["github"] });
		navigate({
			to: "/repositories",
			search: { github: void 0 },
			replace: true
		});
	}, [
		github,
		navigate,
		queryClient
	]);
	const repos = useQuery({
		queryKey: ["github", "repos"],
		queryFn: () => fetchRepos(),
		enabled: connected
	});
	const owner = selected?.full_name.split("/")[0] ?? "";
	const repoName = selected?.name ?? "";
	const branches = useQuery({
		queryKey: [
			"github",
			"branches",
			selected?.full_name
		],
		queryFn: () => fetchBranches({ data: {
			owner,
			repo: repoName
		} }),
		enabled: Boolean(selected)
	});
	const commits = useQuery({
		queryKey: [
			"github",
			"commits",
			selected?.full_name,
			branch
		],
		queryFn: () => fetchCommits({ data: {
			owner,
			repo: repoName,
			ref: branch
		} }),
		enabled: Boolean(selected && branch)
	});
	const pulls = useQuery({
		queryKey: [
			"github",
			"pulls",
			selected?.full_name,
			prState
		],
		queryFn: () => fetchPulls({ data: {
			owner,
			repo: repoName,
			state: prState
		} }),
		enabled: Boolean(selected)
	});
	const tree = useQuery({
		queryKey: [
			"github",
			"tree",
			selected?.full_name,
			branch,
			dir
		],
		queryFn: () => fetchTree({ data: {
			owner,
			repo: repoName,
			ref: branch,
			path: dir
		} }),
		enabled: Boolean(selected && branch)
	});
	const connectMutation = useMutation({
		mutationFn: () => startOAuth(),
		onSuccess: ({ url }) => {
			window.location.href = url;
		},
		onError: (error) => toast.error(error instanceof Error ? error.message : "Could not start GitHub sign-in")
	});
	const disconnectMutation = useMutation({
		mutationFn: () => disconnect(),
		onSuccess: () => {
			setSelected(null);
			queryClient.removeQueries({ queryKey: ["github"] });
			queryClient.invalidateQueries({ queryKey: ["github", "connection"] });
			toast.success("GitHub account disconnected");
		}
	});
	const reviewMutation = useMutation({
		mutationFn: async (payload) => payload.kind === "file" ? fetchFile({ data: {
			owner,
			repo: repoName,
			ref: branch,
			path: payload.path
		} }) : fetchDiff({ data: {
			owner,
			repo: repoName,
			number: payload.number
		} }),
		onSuccess: (file) => {
			const pending = {
				code: file.content,
				title: file.path.split("/").pop() ?? file.path,
				sourceRef: `${selected?.full_name} · ${file.path}`
			};
			sessionStorage.setItem(PENDING_REVIEW_KEY, JSON.stringify(pending));
			navigate({ to: "/review" });
		},
		onError: (error) => toast.error(error instanceof Error ? error.message : "Could not load that from GitHub")
	});
	const visibleRepos = (0, import_react.useMemo)(() => {
		const list = repos.data ?? [];
		const needle = filter.trim().toLowerCase();
		return needle ? list.filter((r) => r.full_name.toLowerCase().includes(needle)) : list;
	}, [repos.data, filter]);
	function openRepo(repo) {
		setSelected(repo);
		setBranch(repo.default_branch);
		setDir("");
	}
	if (connection.isLoading) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "grid place-items-center py-24",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "size-5 animate-spin text-muted-foreground" })
	});
	if (!connected) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto max-w-2xl space-y-6",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
			className: "text-2xl font-bold",
			children: "Repositories"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-1 text-sm text-muted-foreground",
			children: "Connect GitHub to import your repositories and review branches, commits and pull requests."
		})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
			className: "glass-panel items-center gap-4 p-10 text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "grid size-12 place-items-center rounded-full border border-primary/40 bg-primary/10",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Github, { className: "size-6 text-primary" })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-medium",
					children: "Connect your GitHub account"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mx-auto mt-1 max-w-sm text-sm text-muted-foreground",
					children: "CodePilot reads repository metadata and file contents so it can review them. Your access token is encrypted and never leaves the server."
				})] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					onClick: () => connectMutation.mutate(),
					disabled: connectMutation.isPending,
					children: [connectMutation.isPending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "size-4 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Github, { className: "size-4" }), "Continue with GitHub"]
				})
			]
		})]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto max-w-7xl space-y-6",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
			className: "flex flex-wrap items-center justify-between gap-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-2xl font-bold",
				children: "Repositories"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-1 text-sm text-muted-foreground",
				children: [
					"Connected as",
					" ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "font-mono text-foreground",
						children: ["@", connection.data?.login]
					})
				]
			})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
				variant: "ghost",
				size: "sm",
				onClick: () => disconnectMutation.mutate(),
				disabled: disconnectMutation.isPending,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Unplug, { className: "size-4" }), "Disconnect"]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid gap-6 lg:grid-cols-[320px_1fr]",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
				className: "glass-panel h-fit gap-3 p-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "absolute top-2.5 left-2.5 size-4 text-muted-foreground" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						value: filter,
						onChange: (e) => setFilter(e.target.value),
						placeholder: "Filter repositories",
						className: "pl-8 font-mono text-xs"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "max-h-[32rem] space-y-1 overflow-y-auto",
					children: [
						repos.isLoading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "p-3 text-xs text-muted-foreground",
							children: "Loading repositories…"
						}),
						repos.isError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "p-3 text-xs text-destructive",
							children: repos.error instanceof Error ? repos.error.message : "Could not load repositories"
						}),
						visibleRepos.map((repo) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => openRepo(repo),
							className: `w-full rounded-md px-3 py-2 text-left transition-colors hover:bg-accent ${selected?.id === repo.id ? "bg-accent" : ""}`,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "flex items-center gap-2",
								children: [repo.private ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lock, { className: "size-3 shrink-0 text-muted-foreground" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GitBranch, { className: "size-3 shrink-0 text-primary" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "truncate font-mono text-xs",
									children: repo.full_name
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "mt-1 flex items-center gap-2 text-[11px] text-muted-foreground",
								children: [
									repo.language ?? "—",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Star, { className: "size-3" }),
									repo.stargazers_count.toLocaleString()
								]
							})]
						}, repo.id)),
						!repos.isLoading && visibleRepos.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "p-3 text-xs text-muted-foreground",
							children: "No repositories match."
						})
					]
				})]
			}), !selected ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
				className: "glass-panel grid place-items-center p-16 text-sm text-muted-foreground",
				children: "Pick a repository to browse its branches, commits, pull requests and files."
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
				className: "glass-panel gap-4 p-5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center justify-between gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "truncate font-mono text-sm font-medium",
							children: selected.full_name
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 line-clamp-1 text-xs text-muted-foreground",
							children: selected.description ?? "No description"
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
							value: branch,
							onValueChange: (value) => {
								setBranch(value);
								setDir("");
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
								className: "w-52 font-mono text-xs",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder: "Branch" })
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: (branches.data ?? []).map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: item.name,
								className: "font-mono text-xs",
								children: item.name
							}, item.name)) })]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							size: "sm",
							variant: "ghost",
							asChild: true,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
								href: selected.html_url,
								target: "_blank",
								rel: "noreferrer noopener",
								children: "GitHub"
							})
						})]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tabs, {
					defaultValue: "files",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsList, { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
								value: "files",
								children: "Files"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
								value: "commits",
								children: "Commits"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
								value: "pulls",
								children: "Pull requests"
							})
						] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsContent, {
							value: "files",
							className: "mt-4 space-y-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-1 font-mono text-xs text-muted-foreground",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										className: "hover:text-foreground",
										onClick: () => setDir(""),
										children: selected.name
									}), dir.split("/").filter(Boolean).map((segment, index, all) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "flex items-center gap-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "size-3" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											className: "hover:text-foreground",
											onClick: () => setDir(all.slice(0, index + 1).join("/")),
											children: segment
										})]
									}, `${segment}-${index}`))]
								}),
								tree.isLoading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs text-muted-foreground",
									children: "Loading files…"
								}),
								tree.isError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs text-destructive",
									children: tree.error instanceof Error ? tree.error.message : "Could not load files"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "divide-y divide-border rounded-md border border-border",
									children: (tree.data ?? []).map((entry) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "flex items-center gap-2 px-3 py-2",
										children: entry.type === "dir" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											type: "button",
											onClick: () => setDir(entry.path),
											className: "flex min-w-0 flex-1 items-center gap-2 text-left",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Folder, { className: "size-4 shrink-0 text-primary" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "truncate font-mono text-xs",
												children: entry.name
											})]
										}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(File, { className: "size-4 shrink-0 text-muted-foreground" }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "min-w-0 flex-1 truncate font-mono text-xs",
												children: entry.name
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
												size: "sm",
												variant: "ghost",
												disabled: reviewMutation.isPending,
												onClick: () => reviewMutation.mutate({
													kind: "file",
													path: entry.path
												}),
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "size-3.5" }), "Review"]
											})
										] })
									}, entry.path))
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsContent, {
							value: "commits",
							className: "mt-4 space-y-2",
							children: [
								commits.isLoading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs text-muted-foreground",
									children: "Loading commits…"
								}),
								(commits.data ?? []).map((commit) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-start gap-3 rounded-md border border-border px-3 py-2",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(GitCommitHorizontal, { className: "mt-0.5 size-4 shrink-0 text-primary" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "min-w-0 flex-1",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "truncate text-xs",
												children: commit.commit.message.split("\n")[0]
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
												className: "mt-1 font-mono text-[11px] text-muted-foreground",
												children: [
													commit.sha.slice(0, 7),
													" ·",
													" ",
													commit.author?.login ?? commit.commit.author?.name,
													commit.commit.author?.date ? ` · ${new Date(commit.commit.author.date).toLocaleDateString()}` : ""
												]
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
											size: "sm",
											variant: "ghost",
											asChild: true,
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
												href: commit.html_url,
												target: "_blank",
												rel: "noreferrer noopener",
												children: "View"
											})
										})
									]
								}, commit.sha)),
								!commits.isLoading && (commits.data ?? []).length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs text-muted-foreground",
									children: "No commits on this branch."
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsContent, {
							value: "pulls",
							className: "mt-4 space-y-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "flex gap-2",
									children: [
										"open",
										"closed",
										"all"
									].map((state) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
										size: "sm",
										variant: prState === state ? "secondary" : "ghost",
										onClick: () => setPrState(state),
										children: state
									}, state))
								}),
								pulls.isLoading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs text-muted-foreground",
									children: "Loading pull requests…"
								}),
								(pulls.data ?? []).map((pull) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-start gap-3 rounded-md border border-border px-3 py-2",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(GitPullRequest, { className: "mt-0.5 size-4 shrink-0 text-primary" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "min-w-0 flex-1",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
												className: "truncate text-xs",
												children: [
													"#",
													pull.number,
													" ",
													pull.title
												]
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
												className: "mt-1 font-mono text-[11px] text-muted-foreground",
												children: [
													pull.user?.login,
													" · ",
													pull.head.ref,
													" → ",
													pull.base.ref
												]
											})]
										}),
										pull.draft && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
											variant: "secondary",
											className: "text-[10px]",
											children: "draft"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
											size: "sm",
											variant: "ghost",
											disabled: reviewMutation.isPending,
											onClick: () => reviewMutation.mutate({
												kind: "pr",
												number: pull.number
											}),
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "size-3.5" }), "Review diff"]
										})
									]
								}, pull.id)),
								!pulls.isLoading && (pulls.data ?? []).length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "text-xs text-muted-foreground",
									children: [
										"No ",
										prState,
										" pull requests."
									]
								})
							]
						})
					]
				})]
			})]
		})]
	});
}
//#endregion
export { RepositoriesPage as component };
