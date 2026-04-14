/**
 * useGitLabData.ts
 *
 * Custom React hook that owns all data-fetching state for the dashboard.
 *
 * Responsibilities:
 *  - Orchestrating the fetch flow (resolve projects → fetch commits → aggregate)
 *  - Exposing a single `fetchData` trigger to consumers
 *  - Providing reactive loading / error / progress / result state
 *  - Never persisting the GitLab token beyond this hook's lifetime
 */

import { useState, useCallback } from 'react';
import type {
  GitLabConfig,
  FetchState,
  DateRange,
  DeveloperStats,
} from '../types';
import {
  fetchAllCommits,
  fetchGroupProjects,
} from '../services/GitLabService';
import { aggregateByDeveloper } from '../utils/locParser';

// ─── Initial State ────────────────────────────────────────────────────────────

const INITIAL_STATE: FetchState = {
  isLoading: false,
  error: null,
  progress: null,
  data: [],
  lastFetched: null,
};

// ─── Hook ────────────────────────────────────────────────────────────────────

export interface UseGitLabDataReturn {
  state: FetchState;
  /**
   * Triggers a full data fetch. Safe to call multiple times — each call
   * resets previous results and starts fresh.
   */
  fetchData: (
    config: GitLabConfig,
    authors: string[],
    dateRange: DateRange,
    applyWhitespaceDiscount: boolean
  ) => Promise<void>;
  /** Resets all state back to the initial empty slate */
  reset: () => void;
}

export function useGitLabData(): UseGitLabDataReturn {
  const [state, setState] = useState<FetchState>(INITIAL_STATE);

  const reset = useCallback(() => setState(INITIAL_STATE), []);

  /**
   * Main fetch orchestrator. Steps:
   *
   *  1. Validate inputs and resolve project IDs.
   *     If the user provided explicit projectIds we use those directly.
   *     If only a groupId was supplied we first enumerate the group's projects.
   *
   *  2. Call fetchAllCommits which iterates over each project sequentially,
   *     returning a flat array of RawGitLabCommit objects tagged with
   *     _projectId.
   *
   *  3. Aggregate the flat array into per-developer DeveloperStats via
   *     aggregateByDeveloper (which also runs AI classification and LOC calc).
   *
   *  4. Update state with the results or surface any error.
   */
  const fetchData = useCallback(
    async (
      config: GitLabConfig,
      authors: string[],
      dateRange: DateRange,
      applyWhitespaceDiscount: boolean
    ): Promise<void> => {
      // Reset and enter loading state
      setState({
        isLoading: true,
        error: null,
        progress: { current: 0, total: 1, stage: 'Initialising…' },
        data: [],
        lastFetched: null,
      });

      try {
        // ── Step 1: Resolve project IDs ──────────────────────────────────
        let projectIds = config.projectIds
          .map((id) => id.trim())
          .filter(Boolean);

        if (projectIds.length === 0 && config.groupId.trim() !== '') {
          setState((prev) => ({
            ...prev,
            progress: {
              current: 0,
              total: 1,
              stage: 'Discovering projects in group…',
            },
          }));

          const projects = await fetchGroupProjects(config);

          if (projects.length === 0) {
            throw new Error(
              `Group "${config.groupId}" was found but contains no accessible projects.`
            );
          }

          projectIds = projects.map((p) => String(p.id));
        }

        if (projectIds.length === 0) {
          throw new Error(
            'No projects to scan. Please provide at least one Project ID ' +
              'or a valid Group ID under Configuration.'
          );
        }

        // ── Step 2: Fetch all qualifying commits ─────────────────────────
        const rawCommits = await fetchAllCommits(
          config,
          projectIds,
          authors,
          dateRange.since,
          dateRange.until,
          (progress) => setState((prev) => ({ ...prev, progress }))
        );

        // ── Step 3: Aggregate into developer stats ────────────────────────
        // This step is synchronous (pure data transformation) so no extra
        // loading state update is needed — it's near-instant in practice.
        const developerStats: DeveloperStats[] = aggregateByDeveloper(
          rawCommits,
          applyWhitespaceDiscount
        );

        // ── Step 4: Surface results ───────────────────────────────────────
        setState({
          isLoading: false,
          error: null,
          progress: null,
          data: developerStats,
          lastFetched: new Date(),
        });
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'An unexpected error occurred. Check the browser console for details.';

        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: message,
          progress: null,
        }));
      }
    },
    [] // No external dependencies — all inputs are passed as arguments
  );

  return { state, fetchData, reset };
}
