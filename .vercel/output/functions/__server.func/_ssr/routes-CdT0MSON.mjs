import { i as __toESM } from "../_runtime.mjs";
import { t as cn } from "./utils-C_uf36nf.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { a as Trigger2, i as Root2, n as Header, r as Item, t as Content2, v as require_jsx_runtime } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { t as Card } from "./card-CzXpCsbD.mjs";
import { h as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as Button } from "./button-Bq5vK6RO.mjs";
import { A as ChevronDown, D as Cpu, N as Bug, S as Gauge, T as FileCodeCorner, g as Layers, j as Check, o as Sparkles, r as Terminal, s as ShieldCheck, y as GitPullRequest } from "../_libs/lucide-react.mjs";
import { t as Badge } from "./badge-D1Dupn2y.mjs";
import { t as useSession } from "./session-B8XhALbM.mjs";
import { t as ThemeToggle } from "./theme-toggle-CmVcgr7x.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-CdT0MSON.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var Accordion = Root2;
var AccordionItem = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Item, {
	ref,
	className: cn("border-b", className),
	...props
}));
AccordionItem.displayName = "AccordionItem";
var AccordionTrigger = import_react.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Header, {
	className: "flex",
	children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Trigger2, {
		ref,
		className: cn("flex flex-1 items-center justify-between py-4 text-sm font-medium cursor-pointer transition-all hover:underline text-left [&[data-state=open]>svg]:rotate-180", className),
		...props,
		children: [children, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" })]
	})
}));
AccordionTrigger.displayName = Trigger2.displayName;
var AccordionContent = import_react.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Content2, {
	ref,
	className: "overflow-hidden text-sm data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down",
	...props,
	children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("pb-4 pt-0", className),
		children
	})
}));
AccordionContent.displayName = Content2.displayName;
function MarketingNav() {
	const { user, loading } = useSession();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("header", {
		className: "sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto flex h-16 max-w-6xl items-center gap-6 px-6",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
					to: "/",
					className: "flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "grid size-8 place-items-center rounded-md border border-primary/40 bg-primary/10",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cpu, { className: "size-4 text-primary" })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-mono text-sm font-bold",
						children: "CodePilot AI"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", {
					className: "ml-auto hidden items-center gap-6 text-sm text-muted-foreground sm:flex",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
							href: "#features",
							className: "transition-colors hover:text-foreground",
							children: "Features"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
							href: "#pricing",
							className: "transition-colors hover:text-foreground",
							children: "Pricing"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
							href: "#faq",
							className: "transition-colors hover:text-foreground",
							children: "FAQ"
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "ml-auto flex items-center gap-2 sm:ml-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ThemeToggle, {}), !loading && user ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						asChild: true,
						size: "sm",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/dashboard",
							children: "Dashboard"
						})
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						asChild: true,
						size: "sm",
						variant: "ghost",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/auth",
							children: "Sign in"
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						asChild: true,
						size: "sm",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/auth",
							search: { mode: "signup" },
							children: "Get started"
						})
					})] })]
				})
			]
		})
	});
}
var FEATURES = [
	{
		icon: ShieldCheck,
		title: "Security triage",
		body: "Injection, secret leakage, unsafe deserialization and auth gaps flagged with severity and a concrete fix."
	},
	{
		icon: Gauge,
		title: "Performance & memory",
		body: "Hot loops, N+1 queries, unbounded allocations and leaks, each with an estimated improvement."
	},
	{
		icon: Layers,
		title: "Architecture signals",
		body: "SOLID violations, coupling, duplication and design-pattern suggestions across 14 languages."
	},
	{
		icon: GitPullRequest,
		title: "Pull request review",
		body: "Pull a GitHub PR or commit diff and get a graded review before a human ever opens the tab."
	},
	{
		icon: Bug,
		title: "Bug risk detection",
		body: "Null paths, off-by-one, race conditions and error handling gaps ranked by blast radius."
	},
	{
		icon: FileCodeCorner,
		title: "Exportable history",
		body: "Every review is stored, searchable and exportable to Markdown for your PR description."
	}
];
var SAMPLE = `public List<Order> findOrders(String userId) {
  List<Order> out = new ArrayList<>();
  for (Order o : repo.findAll()) {        // loads entire table
    if (o.getUser().getId().equals(userId))
      out.add(o);
  }
  return out;
}`;
function Landing() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-screen bg-background",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MarketingNav, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "hero-surface relative overflow-hidden border-b border-border",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "grid-surface absolute inset-0 opacity-60",
					"aria-hidden": true
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative mx-auto grid max-w-6xl gap-12 px-6 pb-24 pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
							variant: "outline",
							className: "gap-2 border-primary/40 font-mono text-xs",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "size-3.5 text-primary" }), "AI reviews in under 10 seconds"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
							className: "mt-6 text-5xl leading-[1.05] font-bold sm:text-6xl",
							children: [
								"Ship code that",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-gradient",
									children: "passes review"
								}),
								" first time."
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-6 max-w-xl text-lg text-muted-foreground",
							children: "CodePilot AI is an AI-powered code review and pull request assistant. Paste a snippet, upload a file or import a GitHub PR and get graded scores, ranked issues and ready-to-paste fixes."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-8 flex flex-wrap gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								asChild: true,
								size: "lg",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
									to: "/auth",
									children: "Start reviewing free"
								})
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								asChild: true,
								size: "lg",
								variant: "outline",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
									href: "#features",
									children: "See what it detects"
								})
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-4 font-mono text-xs text-muted-foreground",
							children: "Java · Python · TypeScript · Go · Rust · C++ · C# · PHP · SQL · React · Spring Boot"
						})
					] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
						className: "glass-panel elevated overflow-hidden p-0",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-2 border-b border-border px-4 py-3",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Terminal, { className: "size-4 text-primary" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-mono text-xs text-muted-foreground",
										children: "OrderService.java"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
										className: "ml-auto font-mono text-xs",
										variant: "secondary",
										children: "Grade C"
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
								className: "overflow-x-auto px-4 py-4 font-mono text-xs leading-relaxed text-muted-foreground",
								children: SAMPLE
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "space-y-3 border-t border-border p-4",
								children: [
									{
										label: "N+1 query on repo.findAll()",
										tone: "text-destructive",
										meta: "critical · performance"
									},
									{
										label: "Possible NPE on getUser()",
										tone: "text-warning",
										meta: "medium · bug risk"
									},
									{
										label: "Filter belongs in the query",
										tone: "text-primary",
										meta: "refactoring"
									}
								].map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-start gap-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `mt-1 size-1.5 rounded-full bg-current ${row.tone}` }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-sm font-medium",
										children: row.label
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "font-mono text-xs text-muted-foreground",
										children: row.meta
									})] })]
								}, row.label))
							})
						]
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				id: "features",
				className: "mx-auto max-w-6xl px-6 py-20",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-3xl font-bold",
						children: "Everything a senior reviewer checks"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 max-w-2xl text-muted-foreground",
						children: "One pass covers correctness, security, performance, architecture, readability, documentation and test coverage — with a letter grade and seven sub-scores."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3",
						children: FEATURES.map((feature) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
							className: "glass-panel gap-3 p-6 transition-colors hover:border-primary/40",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(feature.icon, { className: "size-5 text-primary" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
									className: "text-base font-semibold",
									children: feature.title
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-sm text-muted-foreground",
									children: feature.body
								})
							]
						}, feature.title))
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				className: "border-y border-border bg-card/40",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mx-auto grid max-w-6xl gap-6 px-6 py-16 sm:grid-cols-3",
					children: [
						{
							quote: "We cut review turnaround from a day to minutes. The SOLID feedback alone changed how the team writes services.",
							name: "Priya Raman",
							role: "Staff Engineer, Fintech"
						},
						{
							quote: "It catches the N+1s and unbounded loops our linters never saw. The estimated-improvement line sells the fix for me.",
							name: "Marcus Lee",
							role: "Backend Lead"
						},
						{
							quote: "Exporting the review straight into the PR description made our reviews consistent across three squads.",
							name: "Dana Whitfield",
							role: "Engineering Manager"
						}
					].map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
						className: "glass-panel p-6",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-sm leading-relaxed",
							children: [
								"“",
								t.quote,
								"”"
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm font-semibold",
								children: t.name
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-mono text-xs text-muted-foreground",
								children: t.role
							})]
						})]
					}, t.name))
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				id: "pricing",
				className: "mx-auto max-w-6xl px-6 py-20",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-3xl font-bold",
					children: "Simple pricing"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-10 grid gap-4 lg:grid-cols-3",
					children: [
						{
							name: "Solo",
							price: "Free",
							items: [
								"25 reviews / month",
								"All 14 languages",
								"Review history"
							]
						},
						{
							name: "Pro",
							price: "$19",
							featured: true,
							items: [
								"Unlimited reviews",
								"GitHub PR & commit review",
								"Analytics & trends",
								"Markdown export"
							]
						},
						{
							name: "Team",
							price: "$49",
							items: [
								"Everything in Pro",
								"Shared repositories",
								"Priority AI capacity"
							]
						}
					].map((plan) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
						className: `glass-panel p-6 ${plan.featured ? "border-primary/50 elevated" : ""}`,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
									className: "text-base font-semibold",
									children: plan.name
								}), plan.featured && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
									className: "font-mono text-xs",
									children: "Popular"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-4 font-mono text-3xl font-bold",
								children: [plan.price, plan.price !== "Free" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-sm text-muted-foreground",
									children: "/mo"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
								className: "mt-5 space-y-2 text-sm text-muted-foreground",
								children: plan.items.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
									className: "flex items-center gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "size-4 text-primary" }), item]
								}, item))
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								asChild: true,
								className: "mt-6 w-full",
								variant: plan.featured ? "default" : "outline",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
									to: "/auth",
									children: "Get started"
								})
							})
						]
					}, plan.name))
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				id: "faq",
				className: "mx-auto max-w-3xl px-6 pb-24",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-3xl font-bold",
					children: "FAQ"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Accordion, {
					type: "single",
					collapsible: true,
					className: "mt-6",
					children: [
						{
							q: "Is my code stored?",
							a: "Reviews are saved to your private account so you can revisit them. Only you can read them, and you can delete any review at any time."
						},
						{
							q: "Which languages are supported?",
							a: "Java, Python, JavaScript, TypeScript, C++, C#, Go, Rust, PHP, SQL, HTML, CSS, React and Spring Boot."
						},
						{
							q: "Can it review GitHub pull requests?",
							a: "Yes. Connect GitHub, import a repository, then review any pull request, commit or file directly from the app."
						},
						{
							q: "How accurate are the scores?",
							a: "Scores are model-generated heuristics across seven dimensions. Treat them as a fast senior-engineer opinion, not a compiler."
						}
					].map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AccordionItem, {
						value: item.q,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AccordionTrigger, {
							className: "text-left",
							children: item.q
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AccordionContent, {
							className: "text-muted-foreground",
							children: item.a
						})]
					}, item.q))
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("footer", {
				className: "border-t border-border py-10",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mx-auto flex max-w-6xl flex-col gap-2 px-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-mono",
						children: "CodePilot AI — AI-Powered Code Review & PR Assistant"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
						"© ",
						(/* @__PURE__ */ new Date()).getFullYear(),
						" CodePilot AI"
					] })]
				})
			})
		]
	});
}
//#endregion
export { Landing as component };
