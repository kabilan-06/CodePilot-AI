import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MarketingNav } from "@/components/marketing-nav";
import {
  Bug,
  GitPullRequest,
  Gauge,
  ShieldCheck,
  Sparkles,
  Terminal,
  Layers,
  FileCode2,
  Check,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Security triage",
    body: "Injection, secret leakage, unsafe deserialization and auth gaps flagged with severity and a concrete fix.",
  },
  {
    icon: Gauge,
    title: "Performance & memory",
    body: "Hot loops, N+1 queries, unbounded allocations and leaks, each with an estimated improvement.",
  },
  {
    icon: Layers,
    title: "Architecture signals",
    body: "SOLID violations, coupling, duplication and design-pattern suggestions across 14 languages.",
  },
  {
    icon: GitPullRequest,
    title: "Pull request review",
    body: "Pull a GitHub PR or commit diff and get a graded review before a human ever opens the tab.",
  },
  {
    icon: Bug,
    title: "Bug risk detection",
    body: "Null paths, off-by-one, race conditions and error handling gaps ranked by blast radius.",
  },
  {
    icon: FileCode2,
    title: "Exportable history",
    body: "Every review is stored, searchable and exportable to Markdown for your PR description.",
  },
];

const SAMPLE = `public List<Order> findOrders(String userId) {
  List<Order> out = new ArrayList<>();
  for (Order o : repo.findAll()) {        // loads entire table
    if (o.getUser().getId().equals(userId))
      out.add(o);
  }
  return out;
}`;

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />

      <section className="hero-surface relative overflow-hidden border-b border-border">
        <div className="grid-surface absolute inset-0 opacity-60" aria-hidden />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-6 pb-24 pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <Badge variant="outline" className="gap-2 border-primary/40 font-mono text-xs">
              <Sparkles className="size-3.5 text-primary" />
              AI reviews in under 10 seconds
            </Badge>
            <h1 className="mt-6 text-5xl leading-[1.05] font-bold sm:text-6xl">
              Ship code that
              <br />
              <span className="text-gradient">passes review</span> first time.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground">
              CodePilot AI is an AI-powered code review and pull request assistant. Paste a snippet,
              upload a file or import a GitHub PR and get graded scores, ranked issues and
              ready-to-paste fixes.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/auth">Start reviewing free</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="#features">See what it detects</a>
              </Button>
            </div>
            <p className="mt-4 font-mono text-xs text-muted-foreground">
              Java · Python · TypeScript · Go · Rust · C++ · C# · PHP · SQL · React · Spring Boot
            </p>
          </div>

          <Card className="glass-panel elevated overflow-hidden p-0">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <Terminal className="size-4 text-primary" />
              <span className="font-mono text-xs text-muted-foreground">OrderService.java</span>
              <Badge className="ml-auto font-mono text-xs" variant="secondary">
                Grade C
              </Badge>
            </div>
            <pre className="overflow-x-auto px-4 py-4 font-mono text-xs leading-relaxed text-muted-foreground">
              {SAMPLE}
            </pre>
            <div className="space-y-3 border-t border-border p-4">
              {[
                {
                  label: "N+1 query on repo.findAll()",
                  tone: "text-destructive",
                  meta: "critical · performance",
                },
                {
                  label: "Possible NPE on getUser()",
                  tone: "text-warning",
                  meta: "medium · bug risk",
                },
                { label: "Filter belongs in the query", tone: "text-primary", meta: "refactoring" },
              ].map((row) => (
                <div key={row.label} className="flex items-start gap-3">
                  <span className={`mt-1 size-1.5 rounded-full bg-current ${row.tone}`} />
                  <div>
                    <p className="text-sm font-medium">{row.label}</p>
                    <p className="font-mono text-xs text-muted-foreground">{row.meta}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-3xl font-bold">Everything a senior reviewer checks</h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          One pass covers correctness, security, performance, architecture, readability,
          documentation and test coverage — with a letter grade and seven sub-scores.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <Card
              key={feature.title}
              className="glass-panel gap-3 p-6 transition-colors hover:border-primary/40"
            >
              <feature.icon className="size-5 text-primary" />
              <h3 className="text-base font-semibold">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-card/40">
        <div className="mx-auto grid max-w-6xl gap-6 px-6 py-16 sm:grid-cols-3">
          {[
            {
              quote:
                "We cut review turnaround from a day to minutes. The SOLID feedback alone changed how the team writes services.",
              name: "Priya Raman",
              role: "Staff Engineer, Fintech",
            },
            {
              quote:
                "It catches the N+1s and unbounded loops our linters never saw. The estimated-improvement line sells the fix for me.",
              name: "Marcus Lee",
              role: "Backend Lead",
            },
            {
              quote:
                "Exporting the review straight into the PR description made our reviews consistent across three squads.",
              name: "Dana Whitfield",
              role: "Engineering Manager",
            },
          ].map((t) => (
            <Card key={t.name} className="glass-panel p-6">
              <p className="text-sm leading-relaxed">“{t.quote}”</p>
              <div className="mt-4">
                <p className="text-sm font-semibold">{t.name}</p>
                <p className="font-mono text-xs text-muted-foreground">{t.role}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-3xl font-bold">Simple pricing</h2>
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {[
            {
              name: "Solo",
              price: "Free",
              items: ["25 reviews / month", "All 14 languages", "Review history"],
            },
            {
              name: "Pro",
              price: "$19",
              featured: true,
              items: [
                "Unlimited reviews",
                "GitHub PR & commit review",
                "Analytics & trends",
                "Markdown export",
              ],
            },
            {
              name: "Team",
              price: "$49",
              items: ["Everything in Pro", "Shared repositories", "Priority AI capacity"],
            },
          ].map((plan) => (
            <Card
              key={plan.name}
              className={`glass-panel p-6 ${plan.featured ? "border-primary/50 elevated" : ""}`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold">{plan.name}</h3>
                {plan.featured && <Badge className="font-mono text-xs">Popular</Badge>}
              </div>
              <p className="mt-4 font-mono text-3xl font-bold">
                {plan.price}
                {plan.price !== "Free" && (
                  <span className="text-sm text-muted-foreground">/mo</span>
                )}
              </p>
              <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
                {plan.items.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <Check className="size-4 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button
                asChild
                className="mt-6 w-full"
                variant={plan.featured ? "default" : "outline"}
              >
                <Link to="/auth">Get started</Link>
              </Button>
            </Card>
          ))}
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-3xl px-6 pb-24">
        <h2 className="text-3xl font-bold">FAQ</h2>
        <Accordion type="single" collapsible className="mt-6">
          {[
            {
              q: "Is my code stored?",
              a: "Reviews are saved to your private account so you can revisit them. Only you can read them, and you can delete any review at any time.",
            },
            {
              q: "Which languages are supported?",
              a: "Java, Python, JavaScript, TypeScript, C++, C#, Go, Rust, PHP, SQL, HTML, CSS, React and Spring Boot.",
            },
            {
              q: "Can it review GitHub pull requests?",
              a: "Yes. Connect GitHub, import a repository, then review any pull request, commit or file directly from the app.",
            },
            {
              q: "How accurate are the scores?",
              a: "Scores are model-generated heuristics across seven dimensions. Treat them as a fast senior-engineer opinion, not a compiler.",
            },
          ].map((item) => (
            <AccordionItem key={item.q} value={item.q}>
              <AccordionTrigger className="text-left">{item.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <footer className="border-t border-border py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono">CodePilot AI — AI-Powered Code Review & PR Assistant</p>
          <p>© {new Date().getFullYear()} CodePilot AI</p>
        </div>
      </footer>
    </div>
  );
}
