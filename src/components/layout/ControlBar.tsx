import React from 'react';
import { Play, Pause, StepForward, RotateCcw, Zap, Compass, FolderOpen, Sparkles } from 'lucide-react';
import { useSimulationStore } from '../../store/useSimulationStore';
import { AlgorithmType } from '../../types/scheduler';
import { LearningGoal } from '../../types/context';
import { BUILTIN_SCENARIOS } from '../../simulation/benchmarks/BenchmarkScenarios';

export const ControlBar: React.FC = () => {
  const {
    isRunning,
    isTerminated,
    speedMs,
    activeAlgorithm,
    selectedGoal,
    currentTrace,
    togglePlay,
    step,
    reset,
    setSpeed,
    setAlgorithm,
    setGoal,
    loadScenarioById,
    loadRandomWorkload,
  } = useSimulationStore();

  const goals: { id: LearningGoal; label: string }[] = [
    { id: 'PROGRAMMING', label: '💻 Coding / Development' },
    { id: 'MATHEMATICS', label: '📐 Mathematics / Solving' },
    { id: 'LECTURE_VIEWING', label: '🎥 Online Lecture' },
    { id: 'RESEARCH_READING', label: '📖 Research & Docs' },
    { id: 'GENERAL_STUDY', label: '📝 General Study' },
  ];

  return (
    <div className="w-full bg-[#090e1c] border-b border-slate-800/80 px-5 py-2 flex flex-wrap items-center justify-between gap-3 text-xs select-none">
      {/* Simulation Playback Console */}
      <div className="flex items-center space-x-2">
        <button
          onClick={togglePlay}
          className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-md font-semibold text-xs transition-all shadow-sm ${
            isTerminated
              ? 'bg-amber-700 hover:bg-amber-600 text-white'
              : isRunning
              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold'
              : 'bg-cyan-600 hover:bg-cyan-500 text-white'
          }`}
        >
          {isTerminated ? (
            <>
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restart Simulation</span>
            </>
          ) : isRunning ? (
            <>
              <Pause className="w-3.5 h-3.5 fill-current" />
              <span>Pause Simulation</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start Simulation</span>
            </>
          )}
        </button>

        <button
          onClick={step}
          disabled={isRunning || isTerminated}
          title="Step forward by exactly 1 second"
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-200 font-semibold border border-slate-700 transition"
        >
          <StepForward className="w-3.5 h-3.5 text-cyan-400" />
          <span>Step 1 Second</span>
        </button>

        <button
          onClick={reset}
          title="Reset Simulation to Second 0"
          className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Speed Slider */}
      <div className="flex items-center space-x-2.5 bg-[#050811] px-3 py-1 rounded-md border border-slate-800">
        <div className="flex items-center space-x-1 text-slate-400 text-[11px]">
          <Zap className="w-3 h-3 text-amber-400" />
          <span>Execution Speed:</span>
        </div>
        <input
          type="range"
          min="0"
          max="500"
          step="25"
          value={speedMs}
          onChange={(e) => setSpeed(Number(e.target.value))}
          className="w-20 accent-cyan-500 cursor-pointer h-1.5 bg-slate-800 rounded"
        />
        <span className="font-mono text-cyan-400 font-bold w-16 text-right text-[11px]">
          {speedMs === 0 ? 'Instant' : `${speedMs} ms`}
        </span>
      </div>

      {/* Algorithm Selector Switch */}
      <div className="flex items-center space-x-1 bg-[#050811] p-1 rounded-md border border-slate-800">
        <span className="text-slate-500 font-semibold px-1.5 text-[11px]">Scheduling Algorithm:</span>
        {(['RR', 'MLFQ', 'CA_MLFQ'] as AlgorithmType[]).map((alg) => (
          <button
            key={alg}
            onClick={() => setAlgorithm(alg)}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
              activeAlgorithm === alg
                ? alg === 'CA_MLFQ'
                  ? 'bg-cyan-900/80 text-cyan-300 border border-cyan-700/60 font-bold'
                  : 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {alg === 'CA_MLFQ' ? 'Context-Aware Multi-Level Queue' : alg === 'MLFQ' ? 'Classical Multi-Level Queue' : 'Round Robin'}
          </button>
        ))}
      </div>

      {/* Active Goal Selector */}
      <div className="flex items-center space-x-1.5 bg-[#050811] px-2 py-1 rounded-md border border-slate-800">
        <Compass className="w-3.5 h-3.5 text-cyan-400" />
        <span className="text-slate-500 font-semibold text-[11px]">Goal:</span>
        <select
          value={selectedGoal}
          onChange={(e) => setGoal(e.target.value as LearningGoal)}
          className="bg-transparent border-none text-xs font-semibold text-cyan-300 focus:outline-none cursor-pointer"
        >
          {goals.map((g) => (
            <option key={g.id} value={g.id} className="bg-[#0b1120] text-slate-200">
              {g.label}
            </option>
          ))}
        </select>
      </div>

      {/* Preset Scenarios Selector */}
      <div className="flex items-center space-x-1.5 bg-[#050811] px-2 py-1 rounded-md border border-slate-800">
        <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-slate-500 font-semibold text-[11px]">Scenario:</span>
        <select
          value={currentTrace.traceId}
          onChange={(e) => loadScenarioById(e.target.value)}
          className="bg-transparent border-none text-xs font-semibold text-slate-200 focus:outline-none max-w-[180px] truncate cursor-pointer"
        >
          {BUILTIN_SCENARIOS.map((sc) => (
            <option key={sc.traceId} value={sc.traceId} className="bg-[#0b1120] text-slate-200">
              {sc.name}
            </option>
          ))}
        </select>
        <button
          onClick={() => loadRandomWorkload()}
          title="Procedurally generate a random workload trace with dynamic affinities"
          className="p-1 px-2 rounded bg-purple-950/60 hover:bg-purple-900/80 border border-purple-500/40 text-purple-300 font-semibold text-[11px] flex items-center space-x-1 transition ml-1"
        >
          <Sparkles className="w-3 h-3 text-purple-400" />
          <span>Random</span>
        </button>
      </div>
    </div>
  );
};
