/**
 * DateRangePicker.tsx
 *
 * Date range input with preset shortcuts (Last 7 days, Last 30 days, etc.)
 * and manual date fields. Outputs ISO 8601 strings compatible with the
 * GitLab API's `since` and `until` query parameters.
 */


import type { DateRange } from '../types';

interface DateRangePickerProps {
  range: DateRange;
  onChange: (range: DateRange) => void;
  disabled: boolean;
}

/** Formats a Date as YYYY-MM-DD for <input type="date"> value attributes */
const toInputDate = (d: Date): string => d.toISOString().split('T')[0];

/** Converts a YYYY-MM-DD string to a full ISO 8601 date-time string */
const toIsoStart = (dateStr: string): string => `${dateStr}T00:00:00.000Z`;
const toIsoEnd = (dateStr: string): string => `${dateStr}T23:59:59.999Z`;

// Preset shortcut definitions
const PRESETS: { label: string; days: number }[] = [
  { label: '7d', days: 7 },
  { label: '14d', days: 14 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
];

export function DateRangePicker({ range, onChange, disabled }: DateRangePickerProps) {
  const sinceDate = range.since.split('T')[0];
  const untilDate = range.until.split('T')[0];

  const handleSinceChange = (value: string) => {
    onChange({ ...range, since: toIsoStart(value) });
  };

  const handleUntilChange = (value: string) => {
    onChange({ ...range, until: toIsoEnd(value) });
  };

  const applyPreset = (days: number) => {
    const until = new Date();
    const since = new Date();
    since.setDate(until.getDate() - days);

    onChange({
      since: toIsoStart(toInputDate(since)),
      until: toIsoEnd(toInputDate(until)),
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
        Date Range
      </label>

      {/* Preset buttons */}
      <div className="flex gap-2 flex-wrap">
        {PRESETS.map(({ label, days }) => (
          <button
            key={label}
            type="button"
            onClick={() => applyPreset(days)}
            disabled={disabled}
            className="px-3 py-1 text-xs rounded-md bg-gray-800 border border-gray-700
                       text-gray-300 hover:border-brand-500 hover:text-brand-400
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Last {label}
          </button>
        ))}
      </div>

      {/* Manual date inputs */}
      <div className="flex items-center gap-3">
        <div className="flex flex-col gap-1 flex-1">
          <span className="text-xs text-gray-500">From</span>
          <input
            type="date"
            value={sinceDate}
            onChange={(e) => handleSinceChange(e.target.value)}
            disabled={disabled}
            max={untilDate}
            className="input-field text-sm"
          />
        </div>

        <span className="text-gray-600 mt-5">→</span>

        <div className="flex flex-col gap-1 flex-1">
          <span className="text-xs text-gray-500">To</span>
          <input
            type="date"
            value={untilDate}
            onChange={(e) => handleUntilChange(e.target.value)}
            disabled={disabled}
            min={sinceDate}
            max={toInputDate(new Date())}
            className="input-field text-sm"
          />
        </div>
      </div>
    </div>
  );
}
