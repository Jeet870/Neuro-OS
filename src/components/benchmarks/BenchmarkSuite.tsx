import React, { useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import { Play, Download, CheckCircle, ArrowDown, BarChart3, HelpCircle, FlaskConical, Sparkles } from 'lucide-react';
import { useSimulationStore } from '../../store/useSimulationStore';
import { BUILTIN_SCENARIOS } from '../../simulation/benchmarks/BenchmarkScenarios';

export const BenchmarkSuite: React.FC = () => {
  const {
    selectedScenarioId,
    benchmarkReport,
    isBenchmarkRunning,
    runBenchmark,
    runRandomBenchmark,
  } = useSimulationStore();

  useEffect(() => {
    if (!benchmarkReport) {
      runBenchmark('scenario-b');
    }
  }, [benchmarkReport, runBenchmark]);

  const handleExportJson = () => {
    if (!benchmarkReport) return;
    const blob = new Blob([JSON.stringify(benchmarkReport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `neuroos-benchmark-${benchmarkReport.scenarioId}.json`;
    a.click();
  };

  const chartData = benchmarkReport ? [
    {
      metric: 'Critical Response Time',
      'Round Robin': benchmarkReport.results.RR.criticalResponseTime,
      'Classical Multi-Level Queue': benchmarkReport.results.MLFQ.criticalResponseTime,
      'Context-Aware Multi-Level Queue': benchmarkReport.results.CA_MLFQ.criticalResponseTime,
    },
    {
      metric: 'Average Turnaround Time',
      'Round Robin': benchmarkReport.results.RR.averageTurnaroundTime,
      'Classical Multi-Level Queue': benchmarkReport.results.MLFQ.averageTurnaroundTime,
      'Context-Aware Multi-Level Queue': benchmarkReport.results.CA_MLFQ.averageTurnaroundTime,
    },
    {
      metric: 'Average Waiting Time',
      'Round Robin': benchmarkReport.results.RR.averageWaitingTime,
      'Classical Multi-Level Queue': benchmarkReport.results.MLFQ.averageWaitingTime,
      'Context-Aware Multi-Level Queue': benchmarkReport.results.CA_MLFQ.averageWaitingTime,
    },
    {
      metric: 'Context Switches',
      'Round Robin': benchmarkReport.results.RR.totalContextSwitches,
      'Classical Multi-Level Queue': benchmarkReport.results.MLFQ.totalContextSwitches,
      'Context-Aware Multi-Level Queue': benchmarkReport.results.CA_MLFQ.totalContextSwitches,
    },
  ] : [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header & Scenario Selector */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-cyan-950/80 text-cyan-400 border border-cyan-800/40">
            <FlaskConical className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <span>Comparative Research Benchmark Harness</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Deterministic side-by-side evaluation across Round Robin (RR), Classical MLFQ, and NeuroOS CA-MLFQ
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-3">
          <select
            value={selectedScenarioId}
            onChange={(e) => runBenchmark(e.target.value)}
            className="bg-[#0b101d] border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-cyan-300 focus:outline-none focus:border-cyan-500 font-mono"
          >
            {BUILTIN_SCENARIOS.map((sc) => (
              <option key={sc.traceId} value={sc.traceId}>
                {sc.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => runBenchmark(selectedScenarioId)}
            disabled={isBenchmarkRunning}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/20 disabled:opacity-50 transition"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{isBenchmarkRunning ? 'Evaluating...' : 'Run 3-Way Benchmark'}</span>
          </button>

          <button
            onClick={() => runRandomBenchmark()}
            disabled={isBenchmarkRunning}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-purple-950/60 hover:bg-purple-900/80 border border-purple-500/40 text-purple-300 text-xs font-semibold shadow-sm transition"
            title="Procedurally generate a random workload and benchmark it dynamically"
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>🎲 Random Workload</span>
          </button>

          <button
            onClick={handleExportJson}
            disabled={!benchmarkReport}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
          >
            <Download className="w-4 h-4" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {benchmarkReport && (
        <>
          {/* Research Hypothesis & Quantitative Delta Card */}
          <div className="glass-panel p-5 rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/20 via-[#080d19]/90 to-[#080d19]/90 flex flex-col space-y-4">
            <div className="flex items-start space-x-3">
              <div className="p-2 rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-800/40 mt-0.5">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <h4 className="text-xs uppercase tracking-wider font-bold text-cyan-400 font-mono">
                    Experimental Hypothesis & Rigor Check
                  </h4>
                  <span className="text-[11px] px-2 py-0.2 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/50 font-mono">
                    {benchmarkReport.scenarioId}
                  </span>
                </div>
                <p className="text-sm font-medium text-slate-200 mt-1 leading-relaxed">
                  {benchmarkReport.hypothesis}
                </p>

                {/* Quantitative Delta Grid */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-[#0b101d] border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold font-mono">Response Time Reduction</span>
                    <div className="flex items-center space-x-1 text-base font-bold font-mono text-emerald-400 mt-1">
                      <ArrowDown className="w-4 h-4" />
                      <span>{benchmarkReport.deltas.criticalResponseTimeDeltaPercent}%</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#0b101d] border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold font-mono">Turnaround Time Reduction</span>
                    <div className="flex items-center space-x-1 text-base font-bold font-mono text-emerald-400 mt-1">
                      <ArrowDown className="w-4 h-4" />
                      <span>{benchmarkReport.deltas.criticalTurnaroundDeltaPercent}%</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#0b101d] border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold font-mono">Change in Context Switches</span>
                    <div className="flex items-center space-x-1 text-base font-bold font-mono text-purple-400 mt-1">
                      <span>{benchmarkReport.deltas.contextSwitchDeltaCount > 0 ? `+${benchmarkReport.deltas.contextSwitchDeltaCount}` : benchmarkReport.deltas.contextSwitchDeltaCount}</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#0b101d] border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold font-mono">Starvation Risk Score</span>
                    <div className="flex items-center space-x-1 text-base font-bold font-mono text-cyan-400 mt-1">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <span>{benchmarkReport.results.CA_MLFQ.starvationIndex} (Safe & Bounded)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3-Way Algorithm Metric Comparison Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Round Robin Card */}
            <div className="glass-panel p-4 rounded-2xl border border-slate-800 bg-[#080d19]/80 flex flex-col space-y-3">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                  <span className="font-bold text-sm text-slate-200">Round Robin</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">Baseline 1</span>
              </div>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Critical Response Time:</span>
                  <span className="text-white font-bold">{benchmarkReport.results.RR.criticalResponseTime} seconds</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Critical Turnaround Time:</span>
                  <span className="text-white font-bold">{benchmarkReport.results.RR.criticalTurnaroundTime} seconds</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Average Waiting Time:</span>
                  <span className="text-white">{benchmarkReport.results.RR.averageWaitingTime} seconds</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Context Switches:</span>
                  <span className="text-purple-300">{benchmarkReport.results.RR.totalContextSwitches}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Processor Utilization:</span>
                  <span className="text-emerald-400">{benchmarkReport.results.RR.cpuUtilization}%</span>
                </div>
              </div>
            </div>

            {/* Classical MLFQ Card */}
            <div className="glass-panel p-4 rounded-2xl border border-slate-800 bg-[#080d19]/80 flex flex-col space-y-3">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                  <span className="font-bold text-sm text-blue-300">Classical Multi-Level Queue</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">Baseline 2</span>
              </div>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Critical Response Time:</span>
                  <span className="text-white font-bold">{benchmarkReport.results.MLFQ.criticalResponseTime} seconds</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Critical Turnaround Time:</span>
                  <span className="text-white font-bold">{benchmarkReport.results.MLFQ.criticalTurnaroundTime} seconds</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Average Waiting Time:</span>
                  <span className="text-white">{benchmarkReport.results.MLFQ.averageWaitingTime} seconds</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Context Switches:</span>
                  <span className="text-purple-300">{benchmarkReport.results.MLFQ.totalContextSwitches}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Processor Utilization:</span>
                  <span className="text-emerald-400">{benchmarkReport.results.MLFQ.cpuUtilization}%</span>
                </div>
              </div>
            </div>

            {/* NeuroOS CA-MLFQ Card */}
            <div className="glass-panel p-4 rounded-2xl border border-cyan-500/40 bg-gradient-to-br from-cyan-950/30 via-[#080d19]/90 to-[#080d19]/90 flex flex-col space-y-3 shadow-lg shadow-cyan-500/10">
              <div className="flex items-center justify-between pb-2.5 border-b border-cyan-800/40">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                  <span className="font-bold text-sm text-cyan-300">Context-Aware Multi-Level Queue</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/60 font-bold">
                  Proposed Model
                </span>
              </div>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between text-cyan-300">
                  <span>Critical Response Time:</span>
                  <span className="text-emerald-400 font-bold">{benchmarkReport.results.CA_MLFQ.criticalResponseTime} seconds</span>
                </div>
                <div className="flex justify-between text-cyan-300">
                  <span>Critical Turnaround Time:</span>
                  <span className="text-emerald-400 font-bold">{benchmarkReport.results.CA_MLFQ.criticalTurnaroundTime} seconds</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Average Waiting Time:</span>
                  <span className="text-white">{benchmarkReport.results.CA_MLFQ.averageWaitingTime} seconds</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Context Switches:</span>
                  <span className="text-purple-300">{benchmarkReport.results.CA_MLFQ.totalContextSwitches}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Processor Utilization:</span>
                  <span className="text-emerald-400">{benchmarkReport.results.CA_MLFQ.cpuUtilization}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recharts Comparative Breakdown Chart */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 bg-[#080d19]/80">
            <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              <span>Comparative Metrics Distribution Chart</span>
            </h3>
            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="metric" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }} />
                  <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#090d18', borderColor: '#334155', borderRadius: '12px', fontSize: '12px', fontFamily: 'monospace' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px', fontFamily: 'monospace' }} />
                  <Bar dataKey="Round Robin" fill="#64748b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Classical Multi-Level Queue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Context-Aware Multi-Level Queue" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

