/**
 * LoadingSpinner.tsx
 *
 * Full-width loading overlay with live progress feedback.
 * Prevents "dead UI" during large multi-project fetches.
 */


import type { FetchProgress } from '../types';

interface LoadingSpinnerProps {
  progress: FetchProgress | null;
}

export function LoadingSpinner({ progress }: LoadingSpinnerProps) {
  const percentage =
    progress && progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : null;

  return (
    <div className="flex flex-col items-center justify-center py-20 gap-6">
      {/* Animated ring */}
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-4 border-gray-800" />
        <div
          className="absolute inset-0 rounded-full border-4 border-brand-500
                     border-t-transparent animate-spin"
        />
      </div>

      {/* Stage text */}
      <div className="flex flex-col items-center gap-2 max-w-sm text-center">
        <p className="text-gray-300 font-medium">
          {progress?.stage ?? 'Fetching data from GitLab…'}
        </p>

        {percentage !== null && (
          <>
            <div className="w-64 h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-500 rounded-full transition-all duration-300"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <p className="text-xs text-gray-500">
              {progress!.current} / {progress!.total} projects — {percentage}%
            </p>
          </>
        )}
      </div>

      <p className="text-xs text-gray-600 text-center max-w-xs">
        Large date ranges across many projects may take a minute.
        GitLab rate limits are handled automatically with back-off retries.
      </p>
    </div>
  );
}
