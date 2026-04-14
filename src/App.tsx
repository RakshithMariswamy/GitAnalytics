/**
 * App.tsx
 *
 * Root application component. Owns the GitLab config state and wires the
 * ConfigPanel, Dashboard, and useGitLabData hook together.
 *
 * Token storage policy:
 *  The PAT is held in React component state only. It is never written to
 *  localStorage, sessionStorage, cookies, or any external endpoint.
 *  Refreshing the browser tab clears the token automatically.
 */

import { useState } from 'react';
import type { GitLabConfig } from './types';
import { useGitLabData } from './hooks/useGitLabData';
import { ConfigPanel } from './components/ConfigPanel';
import { Dashboard } from './components/Dashboard';

// ─── Default Config ───────────────────────────────────────────────────────────

const DEFAULT_CONFIG: GitLabConfig = {
  baseUrl: 'https://gitlab.com',
  token: '',
  groupId: '',
  projectIds: [],
};

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [config, setConfig] = useState<GitLabConfig>(DEFAULT_CONFIG);
  const { state, fetchData, reset } = useGitLabData();

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans">
      {/* ── Top nav ────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 bg-gray-950/80 backdrop-blur border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Logo mark */}
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-600 to-purple-600
                            flex items-center justify-center text-white font-bold text-sm shadow-lg">
              G
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-100 leading-none">
                GitAnalytics AI
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">Dashboard</p>
            </div>
          </div>

          {/* Status indicator */}
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                config.token ? 'bg-green-500 shadow-sm shadow-green-500/50' : 'bg-gray-600'
              }`}
            />
            <span className="text-xs text-gray-500 hidden sm:block">
              {config.token ? 'Token configured' : 'No token'}
            </span>
          </div>
        </div>
      </header>

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5">
        <ConfigPanel
          config={config}
          onChange={setConfig}
          disabled={state.isLoading}
        />

        <Dashboard
          config={config}
          fetchState={state}
          onFetch={fetchData}
          onReset={reset}
        />
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 py-6 border-t border-gray-800 mt-10">
        <p className="text-xs text-gray-700 text-center">
          GitAnalytics AI Dashboard · Read-only · No data persisted · GitLab REST API v4
        </p>
      </footer>
    </div>
  );
}
