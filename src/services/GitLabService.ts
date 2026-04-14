/**
 * GitLabService.ts
 *
 * Service layer for all GitLab REST API v4 interactions.
 * Handles authentication, pagination, rate-limit retry, and per-project
 * commit fetching. All requests are read-only (GET).
 *
 * Auth model: The Personal Access Token is passed via the PRIVATE-TOKEN
 * header as required by GitLab. It is never stored outside of browser memory.
 */

import type {
  GitLabConfig,
  RawGitLabCommit,
  GitLabProject,
  FetchProgress,
} from '../types';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Maximum number of items GitLab returns per page (API cap is 100) */
const PER_PAGE = 100;

/** Maximum automatic retry attempts for rate-limited responses */
const MAX_RETRIES = 4;

/** Base delay in ms for exponential back-off (doubles each retry) */
const BASE_BACKOFF_MS = 1_000;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Builds the standard headers for every GitLab API call.
 * The token is sourced from the config object passed at call-time —
 * it never touches localStorage/sessionStorage.
 */
function buildHeaders(token: string): HeadersInit {
  return {
    'PRIVATE-TOKEN': token,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

/**
 * Parses GitLab's Link header to extract the URL of the next page.
 *
 * GitLab format:
 *   <https://gitlab.com/api/v4/...?page=2>; rel="next",
 *   <https://gitlab.com/api/v4/...?page=5>; rel="last"
 *
 * @returns The next-page URL, or null when we are on the last page.
 */
function extractNextPageUrl(linkHeader: string | null): string | null {
  if (!linkHeader) return null;

  for (const segment of linkHeader.split(',')) {
    const [urlPart, relPart] = segment.trim().split(';');
    if (relPart?.trim() === 'rel="next"') {
      // Strip the surrounding angle brackets: <url> → url
      return urlPart.trim().slice(1, -1);
    }
  }

  return null;
}

// ─── Core Fetch Primitive ─────────────────────────────────────────────────────

/**
 * A thin wrapper around the browser's fetch() that:
 *  1. Injects GitLab authentication headers.
 *  2. Retries automatically on HTTP 429 (rate limit), honouring the
 *     Retry-After header when present and falling back to exponential back-off.
 *  3. Translates common GitLab error codes to human-readable messages.
 *
 * @param url     - Full absolute URL to request
 * @param token   - GitLab Personal Access Token
 * @param attempt - Internal counter for retry recursion (default: 0)
 */
async function gitLabFetch<T>(
  url: string,
  token: string,
  attempt = 0
): Promise<T> {
  const response = await fetch(url, { headers: buildHeaders(token) });

  // ── Rate limiting ───────────────────────────────────────────────────────
  if (response.status === 429) {
    if (attempt >= MAX_RETRIES) {
      throw new Error(
        `GitLab rate limit exceeded after ${MAX_RETRIES} retries. ` +
          'Please reduce the date range or number of projects and try again.'
      );
    }

    // Respect the server-supplied Retry-After delay; fall back to doubling
    const retryAfterHeader = response.headers.get('Retry-After');
    const delay = retryAfterHeader
      ? parseInt(retryAfterHeader, 10) * 1_000
      : BASE_BACKOFF_MS * Math.pow(2, attempt);

    await sleep(delay);
    return gitLabFetch<T>(url, token, attempt + 1);
  }

  // ── Auth / permission errors ────────────────────────────────────────────
  if (response.status === 401) {
    throw new Error(
      'Unauthorized (401): Your Personal Access Token is invalid or has expired. ' +
        'Generate a new token with the read_api scope in GitLab → User Settings → Access Tokens.'
    );
  }

  if (response.status === 403) {
    throw new Error(
      'Forbidden (403): Your token does not have permission to access this resource. ' +
        'Ensure the token has at least the read_api scope and the account has Reporter access.'
    );
  }

  if (response.status === 404) {
    throw new Error(
      'Not Found (404): The specified Project ID or Group ID does not exist, ' +
        'or your token does not have visibility of it.'
    );
  }

  if (!response.ok) {
    throw new Error(
      `GitLab API error: HTTP ${response.status} ${response.statusText} — ${url}`
    );
  }

  return response.json() as Promise<T>;
}

// ─── Paginated Fetcher ────────────────────────────────────────────────────────

/**
 * Fetches all pages of a GitLab paginated endpoint and returns the
 * concatenated result array.
 *
 * GitLab signals "more pages available" via a Link header containing
 * rel="next". We follow that URL until no next link is present.
 *
 * @param firstPageUrl  - URL of the first page (must NOT already include page=)
 * @param token         - GitLab PAT
 * @param onItemsFetched - Optional callback invoked after each page with
 *                         the running total so the UI can show live progress
 */
async function fetchAllPages<T>(
  firstPageUrl: string,
  token: string,
  onItemsFetched?: (runningTotal: number) => void
): Promise<T[]> {
  const results: T[] = [];

  // Append pagination params to the seed URL
  const separator = firstPageUrl.includes('?') ? '&' : '?';
  let nextUrl: string | null = `${firstPageUrl}${separator}per_page=${PER_PAGE}&page=1`;

  while (nextUrl) {
    // Use a raw fetch here so we can inspect the Link header ourselves
    const response = await fetch(nextUrl, { headers: buildHeaders(token) });

    // Inline rate-limit handling for pagination (same logic as gitLabFetch)
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      await sleep(retryAfter ? parseInt(retryAfter, 10) * 1_000 : 2_000);
      continue; // Retry the same URL without advancing
    }

    if (!response.ok) {
      // Delegate to gitLabFetch to produce a consistent error message
      await gitLabFetch(nextUrl, token);
      break;
    }

    const page = (await response.json()) as T[];
    results.push(...page);

    if (onItemsFetched) onItemsFetched(results.length);

    // Advance to the next page, or stop if this was the last one
    nextUrl = extractNextPageUrl(response.headers.get('Link'));
  }

  return results;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetches all projects that belong to a GitLab group, including those
 * nested in sub-groups. Archived projects are excluded.
 *
 * Endpoint: GET /groups/:id/projects
 */
export async function fetchGroupProjects(
  config: GitLabConfig
): Promise<GitLabProject[]> {
  const url =
    `${config.baseUrl}/api/v4/groups/${encodeURIComponent(config.groupId)}/projects` +
    `?include_subgroups=true&archived=false`;

  return fetchAllPages<GitLabProject>(url, config.token);
}

/**
 * Fetches all non-merge commits for a single project within the given date
 * window, optionally filtered to a specific set of author names/emails.
 *
 * Key behaviours:
 *  - Uses ?with_stats=true so each commit includes addition/deletion counts
 *    without a second round-trip per commit.
 *  - Filters out merge commits client-side (parent_ids.length > 1) to prevent
 *    double-counting lines that already appear in the constituent commits.
 *  - Author filtering is done client-side because GitLab's API only supports
 *    filtering by a single author at a time.
 *
 * @param config    - GitLab connection configuration
 * @param projectId - Numeric GitLab project ID
 * @param authors   - Array of author name/email fragments to include
 *                    (empty array = include all authors)
 * @param since     - ISO 8601 date-time for the start of the window
 * @param until     - ISO 8601 date-time for the end of the window
 * @param onPage    - Callback with running commit count after each page
 */
export async function fetchCommitsForProject(
  config: GitLabConfig,
  projectId: string,
  authors: string[],
  since: string,
  until: string,
  onPage?: (runningCount: number) => void
): Promise<RawGitLabCommit[]> {
  const base =
    `${config.baseUrl}/api/v4/projects/${encodeURIComponent(projectId)}/repository/commits` +
    `?since=${encodeURIComponent(since)}&until=${encodeURIComponent(until)}&with_stats=true`;

  const allCommits = await fetchAllPages<RawGitLabCommit>(
    base,
    config.token,
    onPage
  );

  // Normalise author list for case-insensitive matching
  const lowerAuthors = authors.map((a) => a.toLowerCase().trim());

  return allCommits.filter((commit) => {
    // Exclude merge commits — they would double-count lines from feature branches
    if (commit.parent_ids.length > 1) return false;

    // When no author filter is set, include every commit
    if (lowerAuthors.length === 0) return true;

    // Match against both name and email so users can filter either way
    return lowerAuthors.some(
      (filter) =>
        commit.author_name.toLowerCase().includes(filter) ||
        commit.author_email.toLowerCase().includes(filter)
    );
  });
}

/**
 * Fetches the detailed stats for an individual commit.
 * This is only needed when ?with_stats=true failed to populate the stats
 * field (can happen on very large diffs or older GitLab versions).
 *
 * Endpoint: GET /projects/:id/repository/commits/:sha
 */
export async function fetchCommitDetail(
  config: GitLabConfig,
  projectId: string,
  commitSha: string
): Promise<RawGitLabCommit> {
  const url =
    `${config.baseUrl}/api/v4/projects/${encodeURIComponent(projectId)}` +
    `/repository/commits/${commitSha}`;

  return gitLabFetch<RawGitLabCommit>(url, config.token);
}

/**
 * Top-level orchestrator that iterates over all supplied project IDs,
 * fetches their commits, and reports progress back to the caller.
 *
 * Projects are processed sequentially (not in parallel) to stay within
 * GitLab's default rate limit of ~10 req/s for personal tokens.
 *
 * @param config      - GitLab config (URL + token)
 * @param projectIds  - Array of project IDs to scan
 * @param authors     - Author filter (empty = all authors)
 * @param since       - Start of date window (ISO 8601)
 * @param until       - End of date window (ISO 8601)
 * @param onProgress  - UI progress callback
 * @returns Flat array of all qualifying commits tagged with _projectId
 */
export async function fetchAllCommits(
  config: GitLabConfig,
  projectIds: string[],
  authors: string[],
  since: string,
  until: string,
  onProgress?: (progress: FetchProgress) => void
): Promise<RawGitLabCommit[]> {
  const collected: RawGitLabCommit[] = [];

  for (let i = 0; i < projectIds.length; i++) {
    const projectId = projectIds[i];

    onProgress?.({
      current: i,
      total: projectIds.length,
      stage: `Scanning project ${projectId} (${i + 1} of ${projectIds.length})…`,
    });

    try {
      const commits = await fetchCommitsForProject(
        config,
        projectId,
        authors,
        since,
        until,
        (count) => {
          onProgress?.({
            current: i,
            total: projectIds.length,
            stage: `Project ${projectId}: ${count} commits loaded…`,
          });
        }
      );

      // Tag each commit with its source project before merging into the flat list
      for (const commit of commits) {
        collected.push({ ...commit, _projectId: projectId });
      }
    } catch (err) {
      // Surface a warning but continue — a single inaccessible project should
      // not abort the entire fetch run.
      console.warn(
        `[GitLabService] Skipping project ${projectId} due to error:`,
        err
      );
    }
  }

  onProgress?.({
    current: projectIds.length,
    total: projectIds.length,
    stage: `Complete — ${collected.length} commits fetched across ${projectIds.length} project(s).`,
  });

  return collected;
}
