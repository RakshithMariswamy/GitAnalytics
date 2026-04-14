/**
 * EmptyState.tsx
 *
 * Shown when a fetch completes successfully but returns zero commits
 * for the selected filter combination.
 */



interface EmptyStateProps {
  since: string;
  until: string;
  authors: string[];
}

export function EmptyState({ since, until, authors }: EmptyStateProps) {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  return (
    <div className="flex flex-col items-center justify-center py-20 gap-5 text-center">
      {/* Illustration */}
      <div className="relative">
        <div className="w-24 h-24 rounded-full bg-gray-800/80 flex items-center justify-center text-5xl">
          📭
        </div>
        <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-gray-900 border-2 border-gray-700 flex items-center justify-center text-lg">
          🔍
        </div>
      </div>

      <div className="flex flex-col gap-2 max-w-md">
        <h3 className="text-lg font-semibold text-gray-200">
          No commits found
        </h3>
        <p className="text-sm text-gray-400 leading-relaxed">
          No non-merge commits match your current filters for the period{' '}
          <span className="text-gray-300 font-medium">
            {fmt(since)} — {fmt(until)}
          </span>
          {authors.length > 0 && (
            <>
              {' '}by authors:{' '}
              <span className="text-brand-400 font-mono">
                {authors.join(', ')}
              </span>
            </>
          )}
          .
        </p>
      </div>

      {/* Suggestions */}
      <ul className="text-xs text-gray-500 list-disc list-inside space-y-1 text-left">
        <li>Expand the date range using the preset shortcuts above.</li>
        <li>Clear the author filter to include all team members.</li>
        <li>Verify the Project / Group ID is correct and accessible.</li>
        <li>Check that commits exist in the default branch for this period.</li>
      </ul>
    </div>
  );
}
