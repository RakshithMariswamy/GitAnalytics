// ─── GitLab API Raw Shapes ────────────────────────────────────────────────────

export interface GitLabConfig {
  /** Base URL of your GitLab instance, e.g. https://gitlab.com */
  baseUrl: string;
  /** Personal Access Token with read_api scope */
  token: string;
  /** Numeric or URL-encoded group ID (used to auto-discover projects) */
  groupId: string;
  /** Explicit project IDs to scan — overrides groupId if non-empty */
  projectIds: string[];
}

export interface CommitStats {
  additions: number;
  deletions: number;
  total: number;
}

/**
 * Raw commit shape returned by GET /projects/:id/repository/commits
 * with ?with_stats=true
 */
export interface RawGitLabCommit {
  id: string;
  short_id: string;
  title: string;
  /** Full commit message body (may include co-authored-by trailers) */
  message: string;
  author_name: string;
  author_email: string;
  authored_date: string;
  committer_name: string;
  committer_email: string;
  committed_date: string;
  /** More than one parent ID means this is a merge commit */
  parent_ids: string[];
  stats?: CommitStats;
  /** Injected client-side after fetching — not part of GitLab API response */
  _projectId?: string;
}

export interface GitLabProject {
  id: number;
  name: string;
  path_with_namespace: string;
  web_url: string;
}

// ─── Enriched / Processed Shapes ─────────────────────────────────────────────

/** A commit after classification and stat normalisation */
export interface EnrichedCommit {
  id: string;
  shortId: string;
  title: string;
  message: string;
  authorName: string;
  authorEmail: string;
  authoredDate: string;
  projectId: string;
  additions: number;
  deletions: number;
  total: number;
  isAiGenerated: boolean;
  /** The signal that triggered AI classification, or null for manual commits */
  aiReason: 'pattern' | 'committer-mismatch' | 'loc-burst' | null;
  isMergeCommit: boolean;
}

/** Aggregated statistics for a single developer across all projects */
export interface DeveloperStats {
  authorName: string;
  authorEmail: string;
  totalCommits: number;
  manualCommits: number;
  aiCommits: number;
  totalAdditions: number;
  totalDeletions: number;
  /** Effective LOC = additions (optionally with whitespace discount applied) */
  totalLOC: number;
  manualLOC: number;
  aiLOC: number;
  commits: EnrichedCommit[];
}

// ─── UI State ────────────────────────────────────────────────────────────────

export interface FetchProgress {
  current: number;
  total: number;
  stage: string;
}

export interface FetchState {
  isLoading: boolean;
  error: string | null;
  progress: FetchProgress | null;
  data: DeveloperStats[];
  lastFetched: Date | null;
}

export interface DateRange {
  /** ISO 8601 date-time string, e.g. 2024-01-01T00:00:00Z */
  since: string;
  until: string;
}

/** Summary totals collapsed across all developers — used for the KPI cards */
export interface GlobalSummary {
  totalCommits: number;
  totalLOC: number;
  manualLOC: number;
  aiLOC: number;
  totalDevelopers: number;
  aiPercentage: number;
}
