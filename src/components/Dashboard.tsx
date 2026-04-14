/**
 * Dashboard.tsx
 *
 * Main dashboard composition component. Owns the filter state and delegates
 * rendering to the KPI cards, chart, and table sub-components.
 *
 * Layout (top → bottom):
 *  1. Filter bar (authors, date range, options, fetch button)
 *  2. Error banner (conditional)
 *  3. KPI summary cards
 *  4. LOC chart
 *  5. Developer stats table
 */

import { useState } from 'react';
import type { GitLabConfig, DateRange, FetchState } from '../types';
import { computeGlobalSummary } from '../utils/locParser';
import { UserSelector } from './UserSelector';
import { DateRangePicker } from './DateRangePicker';
import { StatsTable } from './StatsTable';
import { CommitChart } from './CommitChart';
import { LoadingSpinner } from './LoadingSpinner';
import { EmptyState } from './EmptyState';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Default date range: last 30 days */
function defaultDateRange(): DateRange {
  const until = new Date();
  const since = new Date();
  since.setDate(until.getDate() - 30);

  const toIso = (d: Date, endOfDay = false): string => {
    const datePart = d.toISOString().split('T')[0];
    return endOfDay
      ? `${datePart}T23:59:59.999Z`
      : `${datePart}T00:00:00.000Z`;
  };

  return { since: toIso(since), until: toIso(until, true) };
}

const fmt = (n: number): string => n.toLocaleString();

// ─── KPI Cards ────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: 'default' | 'teal' | 'purple' | 'yellow';
}

function KpiCard({ label, value, sub, accent = 'default' }: KpiCardProps) {
  const accentColors: Record<string, string> = {
    default: 'text-gray-100',
    teal: 'text-teal-400',
    purple: 'text-purple-400',
    yellow: 'text-yellow-400',
  };

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl px-5 py-4 flex flex-col gap-1">
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{label}</p>
      <p className={`text-3xl font-bold font-mono ${accentColors[accent]}`}>{value}</p>
      {sub && <p className="text-xs text-gray-600">{sub}</p>}
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

interface DashboardProps {
  config: GitLabConfig;
  fetchState: FetchState;
  onFetch: (
    config: GitLabConfig,
    authors: string[],
    dateRange: DateRange,
    applyWhitespaceDiscount: boolean
  ) => void;
  onReset: () => void;
}

export function Dashboard({
  config,
  fetchState,
  onFetch,
  onReset,
}: DashboardProps) {
  const [authors, setAuthors] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>(defaultDateRange);
  const [applyWhitespaceDiscount, setApplyWhitespaceDiscount] = useState(false);

  const { isLoading, error, progress, data, lastFetched } = fetchState;

  const canFetch =
    !isLoading &&
    config.token.trim() !== '' &&
    (config.projectIds.some((id) => id.trim() !== '') ||
      config.groupId.trim() !== '');

  const handleFetch = () => {
    if (canFetch) {
      onFetch(config, authors, dateRange, applyWhitespaceDiscount);
    }
  };

  const summary = data.length > 0 ? computeGlobalSummary(data) : null;

  return (
    <div className="flex flex-col gap-5">
      {/* ── Filter Bar ─────────────────────────────────────────────────────── */}
      <section className="bg-gray-900 border border-gray-700 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-300 mb-4 uppercase tracking-wide">
          Filters
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <UserSelector
            authors={authors}
            onChange={setAuthors}
            disabled={isLoading}
          />
          <DateRangePicker
            range={dateRange}
            onChange={setDateRange}
            disabled={isLoading}
          />
        </div>

        {/* Options row */}
        <div className="flex flex-wrap items-center justify-between gap-4 mt-5 pt-4 border-t border-gray-800">
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={applyWhitespaceDiscount}
              onChange={(e) => setApplyWhitespaceDiscount(e.target.checked)}
              disabled={isLoading}
              className="w-4 h-4 rounded accent-brand-500"
            />
            <span className="text-sm text-gray-400">
              Apply ~5% whitespace discount to LOC counts
            </span>
          </label>

          <div className="flex items-center gap-3">
            {/* Reset */}
            {data.length > 0 && (
              <button
                onClick={onReset}
                disabled={isLoading}
                className="px-4 py-2 text-sm rounded-lg border border-gray-700 text-gray-400
                           hover:border-gray-500 hover:text-gray-200 disabled:opacity-50
                           transition-colors"
              >
                Clear
              </button>
            )}

            {/* Fetch */}
            <button
              onClick={handleFetch}
              disabled={!canFetch}
              title={
                !config.token
                  ? 'Enter a Personal Access Token first'
                  : !canFetch
                  ? 'Enter a Project ID or Group ID first'
                  : 'Fetch commit data'
              }
              className={`
                px-5 py-2 text-sm font-semibold rounded-lg transition-all
                ${
                  canFetch
                    ? 'bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-900/40'
                    : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                }
              `}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                  Fetching…
                </span>
              ) : (
                'Fetch Data'
              )}
            </button>
          </div>
        </div>

        {/* Validation hint */}
        {!config.token && (
          <p className="mt-3 text-xs text-yellow-600">
            ⚠ Open Configuration above and enter your GitLab Personal Access Token.
          </p>
        )}
        {config.token && !config.projectIds.some((id) => id.trim() !== '') && config.groupId.trim() === '' && (
          <p className="mt-3 text-xs text-yellow-600">
            ⚠ Enter a Group ID or at least one Project ID in Configuration above to enable fetching.
          </p>
        )}
      </section>

      {/* ── Error Banner ────────────────────────────────────────────────────── */}
      {error && (
        <div className="bg-red-950/50 border border-red-800 rounded-xl px-5 py-4 flex items-start gap-3">
          <span className="text-red-400 text-lg mt-0.5 shrink-0">✕</span>
          <div>
            <p className="text-sm font-semibold text-red-300 mb-1">Fetch failed</p>
            <p className="text-sm text-red-400/80 leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {/* ── Loading ─────────────────────────────────────────────────────────── */}
      {isLoading && <LoadingSpinner progress={progress} />}

      {/* ── Results ─────────────────────────────────────────────────────────── */}
      {!isLoading && data.length > 0 && summary && (
        <>
          {/* Last fetched timestamp */}
          {lastFetched && (
            <p className="text-xs text-gray-600 text-right">
              Last fetched:{' '}
              {lastFetched.toLocaleTimeString(undefined, {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </p>
          )}

          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <KpiCard
              label="Developers"
              value={summary.totalDevelopers}
              sub="unique authors"
            />
            <KpiCard
              label="Total Commits"
              value={fmt(summary.totalCommits)}
              sub="non-merge commits"
            />
            <KpiCard
              label="Total LOC"
              value={fmt(summary.totalLOC)}
              sub="lines added"
            />
            <KpiCard
              label="Manual LOC"
              value={fmt(summary.manualLOC)}
              sub={`${100 - summary.aiPercentage}% of total`}
              accent="teal"
            />
            <KpiCard
              label="AI Generated"
              value={fmt(summary.aiLOC)}
              sub={`${summary.aiPercentage}% of total`}
              accent="purple"
            />
          </div>

          {/* Chart */}
          <CommitChart data={data} />

          {/* Table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-200">
                Developer Breakdown
              </h3>
              <p className="text-xs text-gray-500">Click a row to expand commits</p>
            </div>
            <StatsTable data={data} />
          </div>
        </>
      )}

      {/* ── Empty State ─────────────────────────────────────────────────────── */}
      {!isLoading && !error && data.length === 0 && lastFetched && (
        <EmptyState
          since={dateRange.since}
          until={dateRange.until}
          authors={authors}
        />
      )}
    </div>
  );
}
