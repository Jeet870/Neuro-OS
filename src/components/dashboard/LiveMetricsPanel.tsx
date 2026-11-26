import React from 'react';
import { Timer, ArrowRightLeft, Activity, Gauge, Cpu } from 'lucide-react';
import { useSimulationStore } from '../../store/useSimulationStore';

export const LiveMetricsPanel: React.FC = () => {
  const { 
    liveMetrics, 
    activeAlgorithm, 
    finalReport, 
    activePid, 
    pcbs, 
    contextSnapshot,
    currentTick 
  } = useSimulationStore();

  const metrics = finalReport ? {
    wAvg: finalReport.averageWaitingTime,
    tAvg: finalReport.averageTurnaroundTime,
    rCritAvg: finalReport.criticalResponseTime,
    contextSwitches: finalReport.totalContextSwitches,
    cpuUtilization: finalReport.cpuUtilization,
  } : liveMetrics;

  const runningPcb = activePid ? pcbs.find(p => p.pid === activePid) : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
      {/* Hero CPU & Context Core State (Cols 1-4) */}
      <div className="lg:col-span-4 bg-[#0c1322] p-3.5 rounded-xl border border-slate-800 flex flex-col justify-between space-y-2 relative overflow-hidden">
        {/* Top line: Core status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`p-1.5 rounded-md ${runningPcb ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50' : 'bg-slate-900 text-slate-500'}`}>
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Processor Core</span>
              <div className="text-xs font-bold text-white font-mono flex items-center space-x-1.5">
                {runningPcb ? (
                  <>
                    <span className="text-emerald-400">RUNNING: Process {runningPcb.pid}</span>
                    <span className="text-slate-400 text-[11px]">({runningPcb.name})</span>
                  </>
                ) : (
                  <span className="text-slate-500">IDLE (Awaiting Processes)</span>
                )}
              </div>
            </div>
          </div>

          {/* Context State Chip */}
          <div className="text-right">
            <span className="text-[9px] uppercase font-bold text-slate-500 block">Context State</span>
            <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
              contextSnapshot.state === 'FOCUSED' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60' :
              contextSnapshot.state === 'STABLE' ? 'bg-blue-950 text-blue-300 border border-blue-800/60' :
              contextSnapshot.state === 'DRIFT' ? 'bg-amber-950 text-amber-300 border border-amber-800/60' :
              'bg-rose-950 text-rose-300 border border-rose-800/60'
            }`}>
              {contextSnapshot.state} ({Math.round(contextSnapshot.score)})
            </span>
          </div>
        </div>

        {/* Quantum execution progress bar */}
        {runningPcb ? (
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>Queue Tier: <span className="text-cyan-400 font-bold">Tier {runningPcb.currentQueueLevel}</span></span>
              <span>Time Slice Used: <span className="text-emerald-400 font-bold">{runningPcb.currentQuantumUsed} seconds</span></span>
            </div>
            <div className="w-full bg-[#070b14] h-1.5 rounded-full overflow-hidden border border-slate-800">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-200"
                style={{ width: `${Math.min(100, (runningPcb.currentQuantumUsed / Math.max(1, runningPcb.currentQuantumUsed + 1)) * 100)}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="text-[11px] font-mono text-slate-600 italic py-1">
            Processor idle at second {currentTick}
          </div>
        )}
      </div>

      {/* Metric 1: Critical Response Time (Cols 5-6) */}
      <div className="lg:col-span-2 bg-[#0c1322] p-3 rounded-xl border border-cyan-900/40 flex flex-col justify-between">
        <div className="flex items-center justify-between text-[11px] text-cyan-400 font-semibold">
          <span>Critical Task Response</span>
          <Timer className="w-3.5 h-3.5 text-cyan-400" />
        </div>
        <div>
          <div className="text-2xl font-bold font-mono text-white tracking-tight">
            {metrics.rCritAvg} <span className="text-xs text-slate-400 font-normal">seconds</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            {activeAlgorithm === 'CA_MLFQ' ? '✨ Priority Boosted' : 'Standard Baseline'}
          </span>
        </div>
      </div>

      {/* Metric 2: Avg Waiting Time (Cols 7-8) */}
      <div className="lg:col-span-2 bg-[#0c1322] p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
          <span>Average Waiting Time</span>
          <Activity className="w-3.5 h-3.5 text-indigo-400" />
        </div>
        <div>
          <div className="text-2xl font-bold font-mono text-white tracking-tight">
            {metrics.wAvg} <span className="text-xs text-slate-400 font-normal">seconds</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">Global Queue Latency</span>
        </div>
      </div>

      {/* Metric 3: Avg Turnaround Time (Cols 9-10) */}
      <div className="lg:col-span-2 bg-[#0c1322] p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
          <span>Average Turnaround Time</span>
          <Gauge className="w-3.5 h-3.5 text-amber-400" />
        </div>
        <div>
          <div className="text-2xl font-bold font-mono text-white tracking-tight">
            {metrics.tAvg} <span className="text-xs text-slate-400 font-normal">seconds</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">Arrival to Completion</span>
        </div>
      </div>

      {/* Metric 4: CPU Utilization & Context Switches (Cols 11-12) */}
      <div className="lg:col-span-2 bg-[#0c1322] p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
          <span>Processor Utilization</span>
          <ArrowRightLeft className="w-3.5 h-3.5 text-purple-400" />
        </div>
        <div>
          <div className="text-lg font-bold font-mono text-emerald-400 tracking-tight flex items-baseline justify-between">
            <span>{metrics.cpuUtilization}%</span>
            <span className="text-xs font-mono text-purple-300 font-semibold">{metrics.contextSwitches} Switches</span>
          </div>
          <div className="w-full bg-[#070b14] h-1.5 rounded-full mt-1 overflow-hidden border border-slate-800">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, metrics.cpuUtilization)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
