/**
 * StatsTable.tsx
 *
 * Per-developer summary table with an expandable commit drill-down.
 * Columns: Developer | Total Commits | Total LOC | Manual LOC | AI LOC | AI%
 */

import { useState, Fragment } from 'react';
import type { DeveloperStats, EnrichedCommit } from '../types';

interface StatsTableProps {
  data: DeveloperStats[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number): string => n.toLocaleString();

const fmtDate = (iso: string): string =>
  new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const AI_REASON_LABEL: Record<NonNullable<EnrichedCommit['aiReason']>, string> = {
  'pattern':            'Message pattern',
  'committer-mismatch': 'Tool committer',
  'loc-burst':          'LOC burst',
};

function AiBadge({ commit }: { commit: EnrichedCommit }) {
  if (!commit.isAiGenerated) {
    return (
      <span className="inline-flex items-center gap-1 text-xs bg-teal-900/40 text-teal-300
                       border border-teal-700/50 rounded-full px-2 py-0.5">
        ✎ Manual
      </span>
    );
  }

  const label = commit.aiReason ? AI_REASON_LABEL[commit.aiReason] : 'AI';

  return (
    <span
      title={label}
      className="inline-flex items-center gap-1 text-xs bg-purple-900/40 text-purple-300
                 border border-purple-700/50 rounded-full px-2 py-0.5 cursor-default"
    >
      ✦ AI
      <span className="text-purple-500">· {label}</span>
    </span>
  );
}

/** Mini bar showing the AI/Manual LOC split */
function AiBar({ aiLOC, manualLOC }: { aiLOC: number; manualLOC: number }) {
  const total = aiLOC + manualLOC;
  if (total === 0) return <span className="text-gray-600 text-xs">—</span>;
  const aiPct = Math.round((aiLOC / total) * 100);

  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-purple-500 rounded-full transition-all"
          style={{ width: `${aiPct}%` }}
        />
      </div>
      <span className="text-xs text-gray-400 w-8 text-right">{aiPct}%</span>
    </div>
  );
}

// ─── Commit Drill-down Row ────────────────────────────────────────────────────

function CommitDrilldown({ commits }: { commits: EnrichedCommit[] }) {
  const [page, setPage] = useState(0);
  const pageSize = 10;
  const totalPages = Math.ceil(commits.length / pageSize);
  const visible = commits.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <tr>
      <td colSpan={6} className="p-0">
        <div className="bg-gray-950/70 border-t border-gray-800 px-6 py-3">
          <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">
            Commit breakdown — {commits.length} commit{commits.length !== 1 ? 's' : ''}
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-gray-400">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-1.5 pr-4 text-gray-500 font-medium w-20">SHA</th>
                  <th className="text-left py-1.5 pr-4 text-gray-500 font-medium">Title</th>
                  <th className="text-left py-1.5 pr-4 text-gray-500 font-medium w-28">Date</th>
                  <th className="text-right py-1.5 pr-4 text-gray-500 font-medium w-20">+Lines</th>
                  <th className="text-right py-1.5 pr-4 text-gray-500 font-medium w-20">−Lines</th>
                  <th className="text-left py-1.5 text-gray-500 font-medium w-24">Type</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((commit) => (
                  <tr
                    key={commit.id}
                    className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                  >
                    <td className="py-1.5 pr-4 font-mono text-brand-400">
                      {commit.shortId}
                    </td>
                    <td className="py-1.5 pr-4 text-gray-300 max-w-xs truncate">
                      {commit.title}
                    </td>
                    <td className="py-1.5 pr-4 text-gray-500">{fmtDate(commit.authoredDate)}</td>
                    <td className="py-1.5 pr-4 text-right text-green-400">
                      +{fmt(commit.additions)}
                    </td>
                    <td className="py-1.5 pr-4 text-right text-red-400">
                      −{fmt(commit.deletions)}
                    </td>
                    <td className="py-1.5">
                      <AiBadge commit={commit} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center gap-3 mt-3">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="text-xs text-gray-400 hover:text-gray-200 disabled:opacity-30
                           disabled:cursor-not-allowed transition-colors"
              >
                ← Prev
              </button>
              <span className="text-xs text-gray-600">
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="text-xs text-gray-400 hover:text-gray-200 disabled:opacity-30
                           disabled:cursor-not-allowed transition-colors"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Main Table ───────────────────────────────────────────────────────────────

export function StatsTable({ data }: StatsTableProps) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const toggleExpand = (key: string) => {
    setExpandedKey((prev) => (prev === key ? null : key));
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-700">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-800/80 border-b border-gray-700">
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Developer
            </th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Commits
            </th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Total LOC
            </th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Manual LOC
            </th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              AI LOC
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              AI Split
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((dev) => {
            const isExpanded = expandedKey === dev.authorEmail;
            return (
              <Fragment key={dev.authorEmail}>
                <tr
                  onClick={() => toggleExpand(dev.authorEmail)}
                  className={`
                    border-b border-gray-800 cursor-pointer transition-colors
                    ${isExpanded ? 'bg-gray-800/60' : 'hover:bg-gray-800/40'}
                  `}
                >
                  {/* Developer cell */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {/* Avatar placeholder with initials */}
                      <div className="w-8 h-8 rounded-full bg-brand-700/40 border border-brand-700/50
                                      flex items-center justify-center text-xs font-bold text-brand-300 shrink-0">
                        {dev.authorName
                          .split(' ')
                          .slice(0, 2)
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-200">{dev.authorName}</p>
                        <p className="text-xs text-gray-500 font-mono">{dev.authorEmail}</p>
                      </div>
                    </div>
                  </td>

                  {/* Commit counts */}
                  <td className="px-4 py-3 text-right">
                    <span className="text-gray-200 font-mono">{fmt(dev.totalCommits)}</span>
                  </td>

                  {/* Total LOC */}
                  <td className="px-4 py-3 text-right">
                    <span className="text-gray-100 font-mono font-medium">{fmt(dev.totalLOC)}</span>
                  </td>

                  {/* Manual LOC */}
                  <td className="px-4 py-3 text-right">
                    <span className="text-teal-400 font-mono">{fmt(dev.manualLOC)}</span>
                  </td>

                  {/* AI LOC */}
                  <td className="px-4 py-3 text-right">
                    <span className="text-purple-400 font-mono">{fmt(dev.aiLOC)}</span>
                  </td>

                  {/* AI split bar */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <AiBar aiLOC={dev.aiLOC} manualLOC={dev.manualLOC} />
                      <span className="text-gray-600 text-xs ml-1">
                        {isExpanded ? '▲' : '▼'}
                      </span>
                    </div>
                  </td>
                </tr>

                {/* Expandable drill-down */}
                {isExpanded && <CommitDrilldown commits={dev.commits} />}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
