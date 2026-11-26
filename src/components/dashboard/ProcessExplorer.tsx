import React from 'react';
import { Table, CheckCircle2, XCircle } from 'lucide-react';
import { useSimulationStore } from '../../store/useSimulationStore';
import { ProcessState } from '../../types/process';

export const ProcessExplorer: React.FC = () => {
  const { pcbs, currentTick, activePid } = useSimulationStore();

  const getStateBadge = (st: ProcessState) => {
    switch (st) {
      case 'RUNNING':
        return 'bg-emerald-950/90 text-emerald-300 border-emerald-500/60 shadow-sm shadow-emerald-500/20';
      case 'READY':
        return 'bg-cyan-950/80 text-cyan-300 border-cyan-500/50';
      case 'WAITING':
        return 'bg-amber-950/80 text-amber-300 border-amber-500/50';
      case 'TERMINATED':
        return 'bg-slate-900/90 text-slate-400 border-slate-700/80';
      case 'SUSPENDED_READY':
        return 'bg-purple-950/80 text-purple-300 border-purple-500/50';
      default:
        return 'bg-slate-900 text-slate-500 border-slate-800';
    }
  };

  return (
    <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col space-y-3">
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 rounded-lg bg-cyan-950/80 text-cyan-400 border border-cyan-800/40">
            <Table className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
              <span>Process Control Table Inspector</span>
              <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-slate-800 text-slate-300">
                {pcbs.length} Processes
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Live kernel execution records, burst durations, wait counters, and turnaround metrics
            </p>
          </div>
        </div>
      </div>

      <div className="w-full overflow-x-auto rounded-xl border border-slate-800/80 bg-[#070b14]/90">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-[#0b101d] text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 select-none">
            <tr>
              <th className="py-2.5 px-3">Process ID</th>
              <th className="py-2.5 px-3">Process Name</th>
              <th className="py-2.5 px-3">Category</th>
              <th className="py-2.5 px-3">Current State</th>
              <th className="py-2.5 px-3">Goal Affinity</th>
              <th className="py-2.5 px-3">Arrival Time</th>
              <th className="py-2.5 px-3">Processor Time (Used / Total)</th>
              <th className="py-2.5 px-3">Waiting Time (Total / Current)</th>
              <th className="py-2.5 px-3">First Response</th>
              <th className="py-2.5 px-3">Turnaround Time</th>
              <th className="py-2.5 px-3">Memory Pages</th>
              <th className="py-2.5 px-3">Deadline Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50 font-sans">
            {pcbs.length === 0 ? (
              <tr>
                <td colSpan={12} className="text-center py-8 text-slate-500 italic text-xs font-mono">
                  No active processes loaded in PCB table
                </td>
              </tr>
            ) : (
              pcbs.map((p) => {
                const totalCpuRequired = p.initialBursts
                  .filter((b) => b.type === 'CPU')
                  .reduce((acc, b) => acc + b.duration, 0);

                const completion = p.completionTick ?? currentTick;
                const turnaround = Math.max(0, completion - p.arrivalTime);
                const response = p.firstResponseTick !== null ? p.firstResponseTick - p.arrivalTime : '-';
                const isRunning = p.pid === activePid;

                return (
                  <tr
                    key={p.pid}
                    className={`transition ${
                      isRunning
                        ? 'bg-emerald-950/20 font-medium'
                        : 'hover:bg-slate-900/40'
                    }`}
                  >
                    {/* PID */}
                    <td className="py-2 px-3 font-mono font-bold">
                      <span className={`px-1.5 py-0.5 rounded text-[11px] ${
                        isRunning ? 'bg-emerald-900 text-emerald-200 border border-emerald-700/60' : 'bg-slate-800 text-slate-200'
                      }`}>
                        Process {p.pid}
                      </span>
                    </td>

                    {/* Name */}
                    <td className="py-2 px-3 font-semibold text-slate-200 text-xs">
                      {p.name}
                    </td>

                    {/* Category */}
                    <td className="py-2 px-3 text-[10.5px] font-mono text-slate-400">
                      {p.processCategory.replace('_', ' ')}
                    </td>

                    {/* State */}
                    <td className="py-2 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9.5px] font-mono font-bold border ${getStateBadge(
                          p.state
                        )}`}
                      >
                        {p.state}
                      </span>
                    </td>

                    {/* Affinity */}
                    <td className="py-2 px-3 font-mono text-xs">
                      <span
                        className={`px-1.5 py-0.2 rounded font-bold ${
                          p.goalAffinity > 0
                            ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-800/60'
                            : p.goalAffinity < 0
                            ? 'bg-rose-950/80 text-rose-300 border border-rose-800/60'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {p.goalAffinity > 0 ? `+${p.goalAffinity}` : p.goalAffinity}
                      </span>
                    </td>

                    {/* Arrival */}
                    <td className="py-2 px-3 font-mono text-slate-300 text-xs">
                      {p.arrivalTime} seconds
                    </td>

                    {/* CPU Burst */}
                    <td className="py-2 px-3 font-mono text-slate-300 text-xs">
                      <span className="text-white font-semibold">{p.totalCpuTime}</span>
                      <span className="text-slate-500">/{totalCpuRequired} seconds</span>
                    </td>

                    {/* Wait Total/Continuous */}
                    <td className="py-2 px-3 font-mono text-slate-300 text-xs">
                      <span>{p.totalWaitTime} seconds</span>{' '}
                      <span className="text-slate-500 text-[10px]">({p.continuousWaitTime} seconds)</span>
                    </td>

                    {/* Response */}
                    <td className="py-2 px-3 font-mono text-slate-300 text-xs">
                      {typeof response === 'number' ? `${response} seconds` : response}
                    </td>

                    {/* Turnaround */}
                    <td className="py-2 px-3 font-mono text-slate-300 text-xs">
                      {turnaround} seconds
                    </td>

                    {/* Memory Pages */}
                    <td className="py-2 px-3 font-mono text-slate-400 text-xs">
                      {p.memoryPages} pages
                    </td>

                    {/* Deadline */}
                    <td className="py-2 px-3 font-mono text-[11px]">
                      {p.deadline !== null ? (
                        p.state === 'TERMINATED' ? (
                          p.completionTick! <= p.deadline ? (
                            <span className="text-emerald-400 flex items-center space-x-1 font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Met ({p.deadline} seconds)</span>
                            </span>
                          ) : (
                            <span className="text-rose-400 flex items-center space-x-1 font-semibold">
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Missed ({p.deadline} seconds)</span>
                            </span>
                          )
                        ) : (
                          <span className="text-slate-400">Due {p.deadline} seconds</span>
                        )
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

