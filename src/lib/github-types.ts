export interface GitHubConnection {
  login: string;
  avatarUrl: string | null;
  scope: string;
  connectedAt: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  html_url: string;
  default_branch: string;
  private: boolean;
  updated_at: string;
}

export interface GitHubBranch {
  name: string;
  protected: boolean;
  commit: { sha: string };
}

export interface GitHubCommit {
  sha: string;
  html_url: string;
  commit: { message: string; author: { name: string; date: string } | null };
  author: { login: string; avatar_url: string } | null;
}

export interface GitHubPull {
  id: number;
  number: number;
  title: string;
  state: string;
  draft: boolean;
  html_url: string;
  updated_at: string;
  user: { login: string; avatar_url: string } | null;
  head: { ref: string };
  base: { ref: string };
}

export interface GitHubTreeEntry {
  name: string;
  path: string;
  type: "file" | "dir" | string;
  size?: number;
}

export interface GitHubFile {
  path: string;
  content: string;
}

export const PENDING_REVIEW_KEY = "codepilot:pending-review";

export interface PendingReview {
  code: string;
  title: string;
  sourceRef: string;
}
