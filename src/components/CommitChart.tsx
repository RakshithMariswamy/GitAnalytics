/**
 * CommitChart.tsx
 *
 * Recharts-based visualisation panel with two chart views:
 *  - Bar chart: LOC per developer, stacked Manual vs AI
 *  - Pie chart: Global AI vs Manual LOC split
 *
 * The user can toggle between views via tab buttons.
 */

import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  TooltipProps,
} from 'recharts';
import type { DeveloperStats } from '../types';

// ─── Constants ────────────────────────────────────────────────────────────────

const COLOR_MANUAL = '#2dd4bf'; // teal-400
const COLOR_AI = '#a78bfa';     // violet-400
const COLOR_GRID = '#1f2937';   // gray-800
const COLOR_AXIS = '#6b7280';   // gray-500

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function CustomBarTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null;

  const manualEntry = payload.find((p) => p.dataKey === 'manualLOC');
  const aiEntry = payload.find((p) => p.dataKey === 'aiLOC');
  const manual = manualEntry?.value ?? 0;
  const ai = aiEntry?.value ?? 0;
  const total = manual + ai;

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 shadow-xl text-sm">
      <p className="text-gray-200 font-semibold mb-2">{label}</p>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: COLOR_MANUAL }} />
          <span className="text-gray-400">Manual LOC:</span>
          <span className="text-teal-300 font-mono ml-auto pl-4">{manual.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: COLOR_AI }} />
          <span className="text-gray-400">AI LOC:</span>
          <span className="text-purple-300 font-mono ml-auto pl-4">{ai.toLocaleString()}</span>
        </div>
        <div className="border-t border-gray-700 mt-1 pt-1 flex justify-between">
          <span className="text-gray-500">Total:</span>
          <span className="text-gray-200 font-mono font-medium">{total.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

function CustomPieTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null;
  const entry = payload[0];
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 shadow-xl text-sm">
      <p className="font-semibold" style={{ color: entry.payload.fill }}>
        {entry.name}
      </p>
      <p className="text-gray-300 font-mono">{(entry.value as number).toLocaleString()} LOC</p>
      <p className="text-gray-500">{entry.payload.percent}%</p>
    </div>
  );
}

// ─── Chart Components ─────────────────────────────────────────────────────────

function BarView({ data }: { data: DeveloperStats[] }) {
  const chartData = data.map((dev) => ({
    name: dev.authorName.split(' ')[0], // First name for axis brevity
    fullName: dev.authorName,
    manualLOC: dev.manualLOC,
    aiLOC: dev.aiLOC,
  }));

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={COLOR_GRID} vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fill: COLOR_AXIS, fontSize: 12 }}
          axisLine={{ stroke: COLOR_GRID }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: COLOR_AXIS, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))}
        />
        <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
        <Legend
          wrapperStyle={{ fontSize: '12px', color: COLOR_AXIS, paddingTop: '12px' }}
          formatter={(value) => (value === 'manualLOC' ? 'Manual LOC' : 'AI LOC')}
        />
        <Bar dataKey="manualLOC" stackId="loc" fill={COLOR_MANUAL} radius={[0, 0, 0, 0]} />
        <Bar dataKey="aiLOC" stackId="loc" fill={COLOR_AI} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function PieView({ data }: { data: DeveloperStats[] }) {
  const totalManual = data.reduce((s, d) => s + d.manualLOC, 0);
  const totalAI = data.reduce((s, d) => s + d.aiLOC, 0);
  const total = totalManual + totalAI;

  const pieData = [
    {
      name: 'Manual LOC',
      value: totalManual,
      fill: COLOR_MANUAL,
      percent: total > 0 ? Math.round((totalManual / total) * 100) : 0,
    },
    {
      name: 'AI Generated LOC',
      value: totalAI,
      fill: COLOR_AI,
      percent: total > 0 ? Math.round((totalAI / total) * 100) : 0,
    },
  ];

  return (
    <div className="flex flex-col md:flex-row items-center gap-8">
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            innerRadius={72}
            outerRadius={110}
            paddingAngle={3}
            dataKey="value"
            strokeWidth={0}
          >
            {pieData.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip content={<CustomPieTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex flex-col gap-4 min-w-[180px]">
        {pieData.map((entry) => (
          <div key={entry.name} className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: entry.fill }} />
              <span className="text-sm text-gray-300">{entry.name}</span>
            </div>
            <p className="text-2xl font-bold font-mono" style={{ color: entry.fill }}>
              {entry.percent}%
            </p>
            <p className="text-xs text-gray-500">{entry.value.toLocaleString()} lines</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

interface CommitChartProps {
  data: DeveloperStats[];
}

export function CommitChart({ data }: CommitChartProps) {
  const [view, setView] = useState<'bar' | 'pie'>('bar');

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
      {/* Chart header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-semibold text-gray-100">LOC Distribution</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Lines added · manual vs AI-generated
          </p>
        </div>

        {/* View toggle */}
        <div className="flex bg-gray-800 rounded-lg p-1 gap-1">
          <button
            onClick={() => setView('bar')}
            className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
              view === 'bar'
                ? 'bg-gray-700 text-gray-100'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Bar
          </button>
          <button
            onClick={() => setView('pie')}
            className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
              view === 'pie'
                ? 'bg-gray-700 text-gray-100'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Pie
          </button>
        </div>
      </div>

      {view === 'bar' ? <BarView data={data} /> : <PieView data={data} />}
    </div>
  );
}
