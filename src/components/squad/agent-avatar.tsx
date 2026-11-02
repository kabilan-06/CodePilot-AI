import {
  Bot,
  Bug,
  FileCode2,
  HeartPulse,
  ScanEye,
  Sparkles,
  UserRound,
  Wrench,
} from "lucide-react";
import type { AgentRole } from "@/lib/swarm/swarm-types";

const ROLE_META: Record<
  AgentRole | "user" | "system",
  { icon: typeof Bot; className: string; label: string }
> = {
  architect: {
    icon: Sparkles,
    className: "text-violet-400 border-violet-400/40 bg-violet-400/10",
    label: "Architect",
  },
  developer: {
    icon: Wrench,
    className: "text-sky-400 border-sky-400/40 bg-sky-400/10",
    label: "Developer",
  },
  security: {
    icon: Bug,
    className: "text-rose-400 border-rose-400/40 bg-rose-400/10",
    label: "Security",
  },
  tester: {
    icon: HeartPulse,
    className: "text-emerald-400 border-emerald-400/40 bg-emerald-400/10",
    label: "Tester",
  },
  reviewer: {
    icon: ScanEye,
    className: "text-amber-400 border-amber-400/40 bg-amber-400/10",
    label: "Reviewer",
  },
  user: {
    icon: UserRound,
    className: "text-primary border-primary/40 bg-primary/10",
    label: "You",
  },
  system: {
    icon: Bot,
    className: "text-muted-foreground border-border bg-muted/40",
    label: "Orchestrator",
  },
};

export function AgentAvatar({ role }: { role: AgentRole | "user" | "system" }) {
  const meta = ROLE_META[role] ?? ROLE_META.system;
  const Icon = meta.icon;
  return (
    <span
      className={`grid size-8 shrink-0 place-items-center rounded-full border ${meta.className}`}
      title={meta.label}
    >
      <Icon className="size-4" />
    </span>
  );
}

export function AgentName({ role }: { role: AgentRole | "user" | "system" }) {
  const meta = ROLE_META[role] ?? ROLE_META.system;
  return <span className="text-xs font-semibold">{AGENT_LABEL(role, meta.label)}</span>;
}

function AGENT_LABEL(role: string, fallback: string) {
  const labels: Record<string, string> = {
    architect: "Architect",
    developer: "Developer",
    security: "Security",
    tester: "Tester",
    reviewer: "Reviewer",
    user: "You",
    system: "Orchestrator",
  };
  return labels[role] ?? fallback;
}

export const DEVELOPER_ROLE_ICON = FileCode2;
