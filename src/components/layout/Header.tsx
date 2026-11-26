import React from 'react';
import { Cpu, BookOpen, GraduationCap, Settings2, BarChart3, Layers, Sliders } from 'lucide-react';
import { useSimulationStore } from '../../store/useSimulationStore';

interface HeaderProps {
  onOpenParams: () => void;
  onOpenTheory: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenParams, onOpenTheory }) => {
  const { activeTab, setTab, activeAlgorithm, isRunning, currentTick } = useSimulationStore();

  return (
    <header className="w-full bg-[#080d1a] border-b border-slate-800/90 px-5 py-2.5 flex items-center justify-between sticky top-0 z-30 shadow-md select-none">
      {/* Brand & Systems Identifier */}
      <div className="flex items-center space-x-3.5">
        <div className="w-8 h-8 rounded-lg bg-slate-900 border border-cyan-500/40 flex items-center justify-center shadow-inner">
          <Cpu className="w-4 h-4 text-cyan-400" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-black tracking-wider text-white font-mono">
              NEURO<span className="text-cyan-400">OS</span>
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-800 font-semibold">
              Version 1.0
            </span>
          </div>
          <p className="text-[10.5px] text-slate-400 font-mono tracking-tight">
            Attention-Aware Operating System Resource Management &amp; Context-Aware Scheduler Simulator
          </p>
        </div>
      </div>

      {/* Navigation Switcher */}
      <nav className="flex items-center space-x-1 bg-[#050811] p-1 rounded-lg border border-slate-800/80">
        <button
          onClick={() => setTab('STUDIO')}
          className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
            activeTab === 'STUDIO'
              ? 'bg-slate-800 text-cyan-300 shadow-sm border border-slate-700'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Simulation Studio</span>
        </button>

        <button
          onClick={() => setTab('BENCHMARKS')}
          className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
            activeTab === 'BENCHMARKS'
              ? 'bg-slate-800 text-cyan-300 shadow-sm border border-slate-700'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Comparative Benchmarks</span>
        </button>

        <button
          onClick={() => setTab('TRACE_BUILDER')}
          className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
            activeTab === 'TRACE_BUILDER'
              ? 'bg-slate-800 text-cyan-300 shadow-sm border border-slate-700'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Trace Designer</span>
        </button>
      </nav>

      {/* Status, SDG 4 Badge & System Controls */}
      <div className="flex items-center space-x-3">
        {/* United Nations Sustainable Development Goal 4 Badge */}
        <div className="hidden xl:flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-red-950/30 border border-red-900/50 text-red-300 text-[11px]">
          <GraduationCap className="w-3.5 h-3.5 text-red-400" />
          <span className="font-semibold">United Nations Goal 4:</span>
          <span className="text-red-200">Quality Education Guarantee</span>
        </div>

        {/* Live Simulation Clock Badge */}
        <div className="flex items-center space-x-2 bg-[#050811] px-2.5 py-1 rounded-md border border-slate-800 font-mono text-xs">
          <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
          <span className="text-slate-500 font-semibold">TIME:</span>
          <span className="text-cyan-400 font-bold tracking-wider">{currentTick}s</span>
        </div>

        {/* Active Algorithm Badge */}
        <div className="px-2.5 py-1 rounded-md bg-[#050811] border border-cyan-900/50 text-cyan-300 font-mono text-[11px] font-semibold">
          {activeAlgorithm === 'CA_MLFQ' ? 'Context-Aware Multi-Level Queue' : activeAlgorithm === 'MLFQ' ? 'Classical Multi-Level Feedback Queue' : 'Round Robin'}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-1 pl-1 border-l border-slate-800">
          <button
            onClick={onOpenParams}
            title="Configure Tunable Scheduler Parameters"
            className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-transparent hover:border-slate-700 transition"
          >
            <Settings2 className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenTheory}
            title="OS Theory, Mathematical Rules & Academic Guidelines"
            className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-transparent hover:border-slate-700 transition"
          >
            <BookOpen className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
