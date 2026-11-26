import React from 'react';
import { Target, ScrollText, Activity } from 'lucide-react';
import { useSimulationStore } from '../../store/useSimulationStore';
import { ContextState } from '../../types/context';

export const ContextRadar: React.FC = () => {
  const { contextSnapshot } = useSimulationStore();
  const { score, state, signals, recentLogs, activeGoal } = contextSnapshot;

  const getStateBadge = (st: ContextState) => {
    switch (st) {
      case 'FOCUSED':
        return {
          bg: 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300 shadow-sm shadow-emerald-500/20',
          dot: 'bg-emerald-400',
          label: 'FOCUSED (Double Time Slice Boost)',
        };
      case 'STABLE':
        return {
          bg: 'bg-blue-950/80 border-blue-500/60 text-blue-300',
          dot: 'bg-blue-400',
          label: 'STABLE (Standard Execution)',
        };
      case 'DRIFT':
        return {
          bg: 'bg-amber-950/80 border-amber-500/60 text-amber-300',
          dot: 'bg-amber-400',
          label: 'ATTENTION DRIFTING',
        };
      case 'DISTRACTED':
        return {
          bg: 'bg-rose-950/80 border-rose-500/60 text-rose-300',
          dot: 'bg-rose-400',
          label: 'DISTRACTED (Background Throttled)',
        };
    }
  };

  const badge = getStateBadge(state);

  return (
    <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col h-full space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 rounded-lg bg-cyan-950/80 text-cyan-400 border border-cyan-800/40">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
              <span>Context Telemetry Engine</span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Active Goal: <span className="text-cyan-300 font-semibold font-mono">{activeGoal.replace('_', ' ')}</span>
            </p>
          </div>
        </div>

        {/* State Badge */}
        <div className={`flex items-center space-x-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${badge.bg}`}>
          <span className={`w-2 h-2 rounded-full animate-pulse ${badge.dot}`} />
          <span className="font-mono text-[11px]">{badge.label}</span>
        </div>
      </div>

      {/* Main Score Dial & Signal Breakdowns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
        {/* Score Circular Gauge */}
        <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#080d19]/80 border border-slate-800/80">
          <div className="relative w-24 h-24 flex items-center justify-center">
            {/* SVG Circle */}
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="38"
                className="stroke-slate-800"
                strokeWidth="7"
                fill="transparent"
              />
              <circle
                cx="50"
                cy="50"
                r="38"
                className={`transition-all duration-300 ${
                  score >= 80 ? 'stroke-emerald-400' : score >= 60 ? 'stroke-cyan-400' : score >= 40 ? 'stroke-amber-400' : 'stroke-rose-400'
                }`}
                strokeWidth="7"
                strokeDasharray={`${2 * Math.PI * 38}`}
                strokeDashoffset={`${2 * Math.PI * 38 * (1 - score / 100)}`}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-2xl font-extrabold font-mono text-white tracking-tight">{Math.round(score)}</span>
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Score</span>
            </div>
          </div>
          <div className="flex items-center space-x-1 text-[10px] text-slate-400 mt-1.5 font-mono">
            <Activity className="w-3 h-3 text-cyan-400" />
            <span>Overall Attention Score</span>
          </div>
        </div>

        {/* 4 Signals Progress Breakdown */}
        <div className="space-y-2 text-xs">
          {/* S_goal */}
          <div>
            <div className="flex justify-between text-slate-300 font-medium mb-0.5 text-[10.5px]">
              <span>Goal Affinity Alignment</span>
              <span className="font-mono text-cyan-400 font-bold">
                {signals.activeGoalMatch >= 0 ? `+${signals.activeGoalMatch}` : signals.activeGoalMatch}
              </span>
            </div>
            <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
              <div
                className="bg-cyan-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.max(0, Math.min(100, ((signals.activeGoalMatch + 1) / 2) * 100))}%` }}
              />
            </div>
          </div>

          {/* S_focus */}
          <div>
            <div className="flex justify-between text-slate-300 font-medium mb-0.5 text-[10.5px]">
              <span>Continuous Focus Duration</span>
              <span className="font-mono text-emerald-400 font-bold">{signals.focusContinuity}</span>
            </div>
            <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${signals.focusContinuity * 100}%` }}
              />
            </div>
          </div>

          {/* S_switch */}
          <div>
            <div className="flex justify-between text-slate-300 font-medium mb-0.5 text-[10.5px]">
              <span>Task Switching Stability</span>
              <span className="font-mono text-purple-400 font-bold">{signals.switchingVelocity}</span>
            </div>
            <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
              <div
                className="bg-purple-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${signals.switchingVelocity * 100}%` }}
              />
            </div>
          </div>

          {/* S_idle */}
          <div>
            <div className="flex justify-between text-slate-300 font-medium mb-0.5 text-[10.5px]">
              <span>Active Engagement Level</span>
              <span className="font-mono text-amber-400 font-bold">{signals.idleDegradation}</span>
            </div>
            <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
              <div
                className="bg-amber-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${signals.idleDegradation * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Auditable Justification Feed */}
      <div className="flex-1 flex flex-col min-h-0 bg-[#080d19]/80 rounded-xl p-2.5 border border-slate-800/80">
        <div className="flex items-center space-x-1.5 text-slate-400 text-xs font-semibold mb-2">
          <ScrollText className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-mono text-[11px] text-slate-300">Auditable State Transition Log:</span>
        </div>
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-36">
          {recentLogs.length === 0 ? (
            <div className="text-[11px] text-slate-500 italic py-4 text-center font-mono">
              No state transitions recorded yet
            </div>
          ) : (
            recentLogs.slice().reverse().map((log) => (
              <div
                key={log.id}
                className="p-1.5 rounded-lg bg-[#0c1222] border border-slate-800 text-[10.5px] font-mono flex flex-col space-y-0.5"
              >
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-cyan-400 font-bold">Second {log.tick}</span>
                  <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 text-[9.5px]">
                    {log.triggeringEvent}
                  </span>
                </div>
                <p className="text-slate-300 text-[10.5px] leading-tight font-sans">{log.reason}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

