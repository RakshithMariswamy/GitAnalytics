# GitAnalytics AI Dashboard

A production-grade, read-only dashboard that connects to GitLab to aggregate commit activity for your team, visualise total Lines of Code (LOC), and distinguish **manual** contributions from **AI-generated** code based on commit message patterns.

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 18 |
| npm | ≥ 9 |

---

## Quick Start

```bash
# 1. Install dependencies
cd gitanalytics-dashboard
npm install

# 2. Start the dev server
npm run dev
# → http://localhost:3000
```

---

## Setting Up Your GitLab Token

1. Log in to your GitLab instance (gitlab.com or self-hosted).
2. Go to **User Settings → Access Tokens** (or **Profile → Access Tokens** on older versions).
3. Click **Add new token**.
4. Give it a name (e.g. `gitanalytics-read`).
5. Set an expiry date and enable the **`read_api`** scope.
6. Click **Create personal access token** and copy the value.
7. Paste the token into the **GitLab Configuration → Personal Access Token** field in the dashboard.

> **Security**: The token is held in React component state only. It is never written to `localStorage`, `sessionStorage`, cookies, or sent to any server other than your GitLab instance. Refreshing the page clears it.

---

## Configuration

| Field | Required | Description |
|-------|----------|-------------|
| GitLab Instance URL | Yes | `https://gitlab.com` or your self-hosted URL |
| Personal Access Token | Yes | PAT with `read_api` scope |
| Group ID | One of these | Numeric or path-based group ID — auto-discovers all projects |
| Project IDs | One of these | Comma-separated numeric project IDs |

If both **Group ID** and **Project IDs** are supplied, the explicit Project IDs take precedence.

---

## AI vs Manual Detection Logic

Every commit message (title + full body) is tested against a list of regex patterns. A commit is classified as **AI Generated** if any pattern matches:

| Pattern | Tool |
|---------|------|
| `[AI]`, `[AI-Generated]`, `[AI-Assisted]` | Manual tagging convention |
| `co-pilot:`, `copilot:`, `[Copilot]`, `github-copilot` | GitHub Copilot |
| `[Claude]`, `claude:`, `claude-ai` | Anthropic Claude |
| `[ChatGPT]`, `chatgpt:` | OpenAI ChatGPT |
| `[Cursor]`, `cursor-ai` | Cursor IDE |
| `[Gemini]`, `gemini:` | Google Gemini |
| `Co-Authored-By: *[bot]*` | Autonomous AI agents |

All other commits are classified as **Manual**.

To add custom patterns, edit `src/utils/locParser.ts` → `AI_PATTERNS` array.

---

## LOC Calculation

- **Primary metric**: `additions` from GitLab commit stats (new lines written).
- **Deletions** are tracked separately but excluded from LOC totals (they represent removed code, not new contributions).
- **Merge commits** are filtered out to prevent double-counting lines from feature branches.
- **Whitespace discount** (optional): applies a conservative 5% reduction to approximate blank-line inflation. Full accuracy requires fetching every diff, which is prohibitively expensive at scale.

---

## Folder Structure

```
src/
├── types/
│   └── index.ts          # All TypeScript interfaces and types
├── services/
│   └── GitLabService.ts  # GitLab REST API v4 client (pagination, rate limiting)
├── hooks/
│   └── useGitLabData.ts  # Custom hook: fetch orchestration + state management
├── utils/
│   └── locParser.ts      # AI detection, LOC normalisation, aggregation
└── components/
    ├── App.tsx            # Root component, config state owner
    ├── ConfigPanel.tsx    # Collapsible GitLab connection form
    ├── Dashboard.tsx      # Filter bar + results composition
    ├── UserSelector.tsx   # Tag-style author filter input
    ├── DateRangePicker.tsx # Date range with preset shortcuts
    ├── StatsTable.tsx     # Per-developer table with commit drill-down
    ├── CommitChart.tsx    # Recharts bar + pie chart toggle
    ├── LoadingSpinner.tsx # Progress overlay during fetch
    └── EmptyState.tsx     # Zero-results illustration
```

---

## Edge Cases Handled

| Scenario | Handling |
|----------|----------|
| HTTP 429 Rate Limit | Exponential back-off with `Retry-After` header support (up to 4 retries) |
| HTTP 401 Unauthorized | Clear error message prompting token regeneration |
| HTTP 403 Forbidden | Guidance on required scopes and project permissions |
| HTTP 404 Not Found | Explains project/group visibility requirements |
| No commits found | Empty state illustration with actionable suggestions |
| Merge commits | Filtered out client-side to prevent double-counting |
| Large result sets | Paginated fetching (100 items/page) with live progress |
| Single inaccessible project | Logged as warning; other projects continue fetching |

---

## Production Build

```bash
npm run build
# Output in dist/ — serve with any static file server
```
