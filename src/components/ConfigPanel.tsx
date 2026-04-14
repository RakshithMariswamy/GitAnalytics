/**
 * ConfigPanel.tsx
 *
 * Collapsible panel for GitLab connection settings.
 * The token value is held in component state (React memory only) and is
 * NEVER written to localStorage, sessionStorage, or sent anywhere except
 * the PRIVATE-TOKEN header during API calls.
 */

import { useState } from 'react';
import type { GitLabConfig } from '../types';

interface ConfigPanelProps {
  config: GitLabConfig;
  onChange: (updated: GitLabConfig) => void;
  disabled: boolean;
}

export function ConfigPanel({ config, onChange, disabled }: ConfigPanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [showToken, setShowToken] = useState(false);

  const update = (field: keyof GitLabConfig, value: string | string[]) => {
    onChange({ ...config, [field]: value });
  };

  return (
    <section className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
      {/* Header / Toggle */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left
                   hover:bg-gray-800 transition-colors focus:outline-none focus-visible:ring-2
                   focus-visible:ring-brand-500"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3">
          <span className="text-brand-400 text-lg">⚙</span>
          <span className="font-semibold text-gray-100">GitLab Configuration</span>
          {!isOpen && config.token && (
            <span className="text-xs bg-green-900/50 text-green-400 border border-green-700 px-2 py-0.5 rounded-full">
              Connected
            </span>
          )}
        </div>
        <span className="text-gray-400 text-sm select-none">
          {isOpen ? '▲ Collapse' : '▼ Expand'}
        </span>
      </button>

      {/* Body */}
      {isOpen && (
        <div className="px-5 pb-5 pt-1 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* GitLab Base URL */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              GitLab Instance URL
            </label>
            <input
              type="url"
              value={config.baseUrl}
              onChange={(e) => update('baseUrl', e.target.value)}
              disabled={disabled}
              placeholder="https://gitlab.com"
              className="input-field"
            />
            <p className="text-xs text-gray-500">
              Your self-hosted GitLab URL, or https://gitlab.com
            </p>
          </div>

          {/* Personal Access Token */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              Personal Access Token (PAT)
            </label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={config.token}
                onChange={(e) => update('token', e.target.value)}
                disabled={disabled}
                placeholder="glpat-xxxxxxxxxxxxxxxxxxxx"
                className="input-field pr-20 font-mono text-sm"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowToken((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400
                           hover:text-gray-200 transition-colors"
              >
                {showToken ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Needs <code className="text-brand-400">read_api</code> scope. Stored in memory only.
            </p>
          </div>

          {/* Group ID */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              Group ID <span className="text-gray-600 normal-case font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={config.groupId}
              onChange={(e) => update('groupId', e.target.value)}
              disabled={disabled}
              placeholder="my-org or 12345"
              className="input-field"
            />
            <p className="text-xs text-gray-500">
              Auto-discovers all projects under this group (including sub-groups).
            </p>
          </div>

          {/* Project IDs */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              Project IDs <span className="text-gray-600 normal-case font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={config.projectIds.join(', ')}
              onChange={(e) =>
                update(
                  'projectIds',
                  e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean)
                )
              }
              disabled={disabled}
              placeholder="12345, 67890, 11111"
              className="input-field"
            />
            <p className="text-xs text-gray-500">
              Comma-separated numeric project IDs. Takes precedence over Group ID.
            </p>
          </div>

          {/* Privacy notice */}
          <div className="md:col-span-2 flex items-start gap-2 bg-gray-800/60 rounded-lg px-4 py-3">
            <span className="text-yellow-400 mt-0.5 shrink-0">🔒</span>
            <p className="text-xs text-gray-400 leading-relaxed">
              Your token is stored in React component state only and is never
              persisted to disk, cookies, or any external server.
              Refreshing the page will clear it.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
