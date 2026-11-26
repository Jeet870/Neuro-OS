import React from 'react';
import { Layers, Clock, ArrowUpCircle, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSimulationStore } from '../../store/useSimulationStore';
import { IProcessControlBlock } from '../../types/process';

export const QueueVisualizer: React.FC = () => {
  const { queues, pcbs, activePid, activeAlgorithm, tunableParams, contextSnapshot } = useSimulationStore();

  const getPcb = (pid: number): IProcessControlBlock | undefined => {
    return pcbs.find((p) => p.pid === pid);
  };

  const renderProcessCard = (pid: number, isRunning: boolean = false) => {
    const pcb = getPcb(pid);
    if (!pcb) return null;

    const currentBurst = pcb.bursts[pcb.currentBurstIndex];
    const isCritical = pcb.goalAffinity >= 0.7;
    const isDistracting = pcb.goalAffinity < 0;

    // Aging progress toward effective max wait
    const maxWait = pcb.effectiveMaxWaitThreshold || 20;
    const agingPercent = Math.min(100, (pcb.continuousWaitTime / maxWait) * 100);

    return (
      <motion.div
        key={pid}
        layout
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className={`p-2.5 rounded-xl border flex flex-col space-y-1.5 transition-all select-none ${
          isRunning
            ? 'bg-gradient-to-r from-emerald-950/90 to-slate-900/90 border-emerald-500/70 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/40'
            : isCritical
            ? 'bg-[#0b1324]/90 border-cyan-500/40 hover:border-cyan-400'
            : isDistracting
            ? 'bg-[#180d12]/90 border-rose-950/80 hover:border-rose-800/80'
            : 'bg-[#0b101d]/90 border-slate-800/90 hover:border-slate-700'
        }`}
      >
        {/* Top line: PID, Name, Goal Affinity */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5 overflow-hidden">
            <span className={`font-mono font-bold text-[10.5px] px-1.5 py-0.5 rounded ${
              isRunning ? 'bg-emerald-900 text-emerald-200' : 'bg-slate-800 text-slate-200'
            }`}>
              Process {pcb.pid}
            </span>
            <span className="text-xs font-semibold text-slate-200 truncate max-w-[100px]" title={pcb.name}>
              {pcb.name}
            </span>
          </div>

          {/* Goal Affinity Badge */}
          <span
            className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
              pcb.goalAffinity > 0
                ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-800/60'
                : pcb.goalAffinity < 0
                ? 'bg-rose-950/80 text-rose-300 border border-rose-800/60'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            {pcb.goalAffinity > 0 ? `+${pcb.goalAffinity}` : pcb.goalAffinity}
          </span>
        </div>

        {/* Mid line: Burst Remaining & Quantum */}
        <div className="flex items-center justify-between text-[10.5px] text-slate-400 font-mono">
          <span>Burst: {currentBurst ? `${currentBurst.remaining} of ${currentBurst.duration} seconds` : 'Finished'}</span>
          <span>Used: {pcb.currentQuantumUsed} seconds</span>
        </div>

        {/* Bottom line: Aging Counter & Starvation Threshold */}
        <div className="pt-1 border-t border-slate-800/60 flex flex-col space-y-1">
          <div className="flex justify-between items-center text-[9.5px] text-slate-400 font-mono">
            <span className="flex items-center space-x-1">
              <Clock className="w-2.5 h-2.5 text-amber-400" />
              <span>Wait: {pcb.continuousWaitTime} of {maxWait} seconds</span>
            </span>
            {agingPercent >= 75 && (
              <span className="text-amber-400 font-bold flex items-center space-x-0.5">
                <ArrowUpCircle className="w-2.5 h-2.5" />
                <span>Aging</span>
              </span>
            )}
          </div>
          {/* Aging progress bar */}
          <div className="w-full bg-slate-950 h-1 rounded-full overflow-hidden border border-slate-900">
            <div
              className={`h-full rounded-full transition-all duration-200 ${
                agingPercent >= 80 ? 'bg-amber-400' : 'bg-slate-600'
              }`}
              style={{ width: `${agingPercent}%` }}
            />
          </div>
        </div>
      </motion.div>
    );
  };

  const runningPcb = activePid ? getPcb(activePid) : null;
  const isQ0Boosted = contextSnapshot.state === 'FOCUSED' && activeAlgorithm === 'CA_MLFQ';
  const effectiveQ0Quantum = isQ0Boosted ? tunableParams.q0Quantum * tunableParams.focusedQuantumMultiplier : tunableParams.q0Quantum;

  return (
    <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col h-full space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 rounded-lg bg-indigo-950/70 text-indigo-400 border border-indigo-800/40">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
              <span>Multilevel Scheduler Queue Register</span>
              {activeAlgorithm === 'CA_MLFQ' && (
                <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800/50">
                  Context-Aware Active
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-400">
              {activeAlgorithm === 'CA_MLFQ'
                ? 'Context-Aware Priority Routing with 10% Floor Quota & Mathematical Starvation Ceiling'
                : activeAlgorithm === 'MLFQ'
                ? 'Classical 3-Queue Multilevel Feedback Model (Priority Degradation)'
                : 'Single First-In First-Out Ready Queue with 4 Seconds Time Slice'}
            </p>
          </div>
        </div>

        {/* Active Running Process Badge */}
        {runningPcb && (
          <div className="flex items-center space-x-2 px-3 py-1 rounded-xl bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 text-xs font-semibold shadow-sm">
            <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="font-mono">Running: Process {runningPcb.pid} ({runningPcb.name})</span>
          </div>
        )}
      </div>

      {/* Queue Lanes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 flex-1">
        {/* Queue 0: High Priority */}
        <div className="bg-[#080d19]/80 rounded-xl p-3 border border-cyan-500/30 flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span className="text-xs font-bold text-cyan-300">Tier 0 (High Priority / Critical)</span>
            </div>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
              isQ0Boosted
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                : 'bg-cyan-950 text-cyan-300 border border-cyan-800/40'
            }`}>
              Time Slice: {effectiveQ0Quantum} seconds {isQ0Boosted ? '(2× Boosted)' : ''}
            </span>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto max-h-56 pr-1">
            <AnimatePresence>
              {queues.q0.length === 0 ? (
                <div className="text-[11px] text-slate-600 italic text-center py-8">Queue Empty</div>
              ) : (
                queues.q0.map((pid) => renderProcessCard(pid, pid === activePid))
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Queue 1: Normal Priority */}
        <div className="bg-[#080d19]/80 rounded-xl p-3 border border-slate-800 flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              <span className="text-xs font-bold text-slate-300">Tier 1 (Normal Priority)</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800 font-semibold">
              Time Slice: {tunableParams.q1Quantum} seconds
            </span>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto max-h-56 pr-1">
            <AnimatePresence>
              {queues.q1.length === 0 ? (
                <div className="text-[11px] text-slate-600 italic text-center py-8">Queue Empty</div>
              ) : (
                queues.q1.map((pid) => renderProcessCard(pid, pid === activePid))
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Queue 2: Throttled Priority */}
        <div className="bg-[#080d19]/80 rounded-xl p-3 border border-slate-800 flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              <span className="text-xs font-bold text-rose-300">Tier 2 (Background / Low Priority)</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800 font-semibold">
              Time Slice: {tunableParams.q2Quantum} seconds (10% Share)
            </span>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto max-h-56 pr-1">
            <AnimatePresence>
              {queues.q2.length === 0 ? (
                <div className="text-[11px] text-slate-600 italic text-center py-8">Queue Empty</div>
              ) : (
                queues.q2.map((pid) => renderProcessCard(pid, pid === activePid))
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Waiting / I/O Lane */}
        <div className="bg-[#080d19]/80 rounded-xl p-3 border border-amber-900/30 flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-xs font-bold text-amber-400">Waiting (Input/Output Operations)</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800/40 font-semibold">
              Device Wait
            </span>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto max-h-56 pr-1">
            <AnimatePresence>
              {queues.waiting.length === 0 ? (
                <div className="text-[11px] text-slate-600 italic text-center py-8">No Blocked Tasks</div>
              ) : (
                queues.waiting.map((pid) => renderProcessCard(pid, false))
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

