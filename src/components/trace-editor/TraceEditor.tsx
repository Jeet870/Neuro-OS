import React, { useState } from 'react';
import { Plus, Trash2, Play, Sliders, CheckCircle2, Sparkles } from 'lucide-react';
import { useSimulationStore } from '../../store/useSimulationStore';
import { ProcessTraceInput, ProcessCategory, BurstType } from '../../types/process';
import { WorkloadTrace } from '../../types/trace';
import { LearningGoal } from '../../types/context';
import { AffinityEngine } from '../../simulation/context/AffinityEngine';
import { RandomWorkloadGenerator } from '../../simulation/benchmarks/RandomWorkloadGenerator';

export const TraceEditor: React.FC = () => {
  const { currentTrace, loadTrace, setTab } = useSimulationStore();
  const [traceName, setTraceName] = useState(currentTrace.name);
  const [goal, setGoal] = useState<LearningGoal>(currentTrace.learningGoal);
  const [processes, setProcesses] = useState<ProcessTraceInput[]>(currentTrace.processes);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const categories: ProcessCategory[] = [
    'INTERACTIVE_DEV',
    'COMPUTE_CRITICAL',
    'EDUCATIONAL_MEDIA',
    'REFERENCE_DOCS',
    'SYSTEM_DAEMON',
    'BACKGROUND_MEDIA',
    'ENTERTAINMENT',
  ];

  const handleAddProcess = () => {
    const nextPid = processes.length > 0 ? Math.max(...processes.map((p) => p.pid)) + 1 : 101;
    const defaultCategory: ProcessCategory = 'INTERACTIVE_DEV';
    const computedAffinity = AffinityEngine.calculateAffinity(defaultCategory, goal);
    const newProcess: ProcessTraceInput = {
      pid: nextPid,
      name: `Process P${nextPid}`,
      processCategory: defaultCategory,
      goalAffinity: computedAffinity,
      arrivalTime: 0,
      basePriority: 1,
      memoryPages: 16,
      deadline: null,
      burstSequence: [
        { type: 'CPU', duration: 4 },
        { type: 'IO', duration: 2 },
        { type: 'CPU', duration: 4 },
      ],
    };
    setProcesses([...processes, newProcess]);
  };

  const handleGenerateProcedural = () => {
    const procedural = RandomWorkloadGenerator.generate({ learningGoal: goal });
    setTraceName(procedural.name);
    setGoal(procedural.learningGoal);
    setProcesses(procedural.processes);
    setSaveStatus('Procedural workload generated with dynamic affinities!');
    setTimeout(() => setSaveStatus(null), 2000);
  };

  const handleGoalChange = (newGoal: LearningGoal) => {
    setGoal(newGoal);
    // Dynamically recalculate affinities for all processes according to the new goal!
    setProcesses(processes.map(p => ({
      ...p,
      goalAffinity: AffinityEngine.calculateAffinity(p.processCategory, newGoal),
    })));
  };

  const handleCategoryChange = (pid: number, newCategory: ProcessCategory) => {
    const newAffinity = AffinityEngine.calculateAffinity(newCategory, goal);
    setProcesses(processes.map(p => {
      if (p.pid === pid) {
        return {
          ...p,
          processCategory: newCategory,
          goalAffinity: newAffinity,
        };
      }
      return p;
    }));
  };

  const handleRemoveProcess = (pid: number) => {
    setProcesses(processes.filter((p) => p.pid !== pid));
  };

  const handleUpdateProcess = (pid: number, field: keyof ProcessTraceInput, value: any) => {
    setProcesses(
      processes.map((p) => {
        if (p.pid === pid) {
          return { ...p, [field]: value };
        }
        return p;
      })
    );
  };

  const handleAddBurst = (pid: number, type: BurstType) => {
    setProcesses(
      processes.map((p) => {
        if (p.pid === pid) {
          return {
            ...p,
            burstSequence: [...p.burstSequence, { type, duration: 4 }],
          };
        }
        return p;
      })
    );
  };

  const handleRemoveBurst = (pid: number, burstIndex: number) => {
    setProcesses(
      processes.map((p) => {
        if (p.pid === pid) {
          const newBursts = [...p.burstSequence];
          newBursts.splice(burstIndex, 1);
          return { ...p, burstSequence: newBursts };
        }
        return p;
      })
    );
  };

  const handleBurstDurationChange = (pid: number, burstIndex: number, duration: number) => {
    setProcesses(
      processes.map((p) => {
        if (p.pid === pid) {
          const newBursts = [...p.burstSequence];
          newBursts[burstIndex] = { ...newBursts[burstIndex], duration: Math.max(1, duration) };
          return { ...p, burstSequence: newBursts };
        }
        return p;
      })
    );
  };

  const handleApplyToSimulation = () => {
    const customTrace: WorkloadTrace = {
      traceId: `custom-trace-${Date.now()}`,
      name: traceName,
      description: 'Custom user-designed workload trace',
      learningGoal: goal,
      systemParameters: { ...currentTrace.systemParameters },
      tunableParameters: { ...currentTrace.tunableParameters },
      processes,
    };
    loadTrace(customTrace);
    setSaveStatus('Workload trace mounted into simulation engine! Switching to Studio...');
    setTimeout(() => {
      setSaveStatus(null);
      setTab('STUDIO');
    }, 800);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-cyan-950/80 text-cyan-400 border border-cyan-800/40">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <span>Workload Trace Synthesizer & Burst Designer</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Construct deterministic multi-process arrival schedules, CPU/IO burst chains, and goal-affinity vectors
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleGenerateProcedural}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-purple-950/60 hover:bg-purple-900/80 text-purple-300 text-xs font-semibold border border-purple-500/40 shadow-sm transition"
            title="Procedurally generate a random non-hardcoded workload"
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>🎲 Random Workload</span>
          </button>

          <button
            onClick={handleAddProcess}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Process</span>
          </button>

          <button
            onClick={handleApplyToSimulation}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 transition"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Mount Trace into Engine</span>
          </button>
        </div>
      </div>

      {saveStatus && (
        <div className="p-3.5 rounded-xl bg-emerald-950/90 border border-emerald-500/60 text-emerald-300 text-xs font-semibold flex items-center space-x-2 shadow-lg">
          <CheckCircle2 className="w-4 h-4" />
          <span>{saveStatus}</span>
        </div>
      )}

      {/* Global Trace Metadata Configuration */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 bg-[#080d19]/80 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] text-slate-400 uppercase font-semibold font-mono">Trace Name / Identifier</label>
          <input
            type="text"
            value={traceName}
            onChange={(e) => setTraceName(e.target.value)}
            className="mt-1 w-full bg-[#0b101d] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-medium"
          />
        </div>

        <div>
          <label className="text-[10px] text-slate-400 uppercase font-semibold font-mono">Learning Goal Profile</label>
          <select
            value={goal}
            onChange={(e) => handleGoalChange(e.target.value as LearningGoal)}
            className="mt-1 w-full bg-[#0b101d] border border-slate-700 rounded-xl px-3 py-2 text-xs text-cyan-300 focus:outline-none focus:border-cyan-500 font-mono"
          >
            <option value="PROGRAMMING">PROGRAMMING</option>
            <option value="MATHEMATICS">MATHEMATICS</option>
            <option value="LECTURE_VIEWING">LECTURE_VIEWING</option>
            <option value="RESEARCH_READING">RESEARCH_READING</option>
            <option value="GENERAL_STUDY">GENERAL_STUDY</option>
          </select>
        </div>
      </div>

      {/* Process List Editor */}
      <div className="space-y-3">
        {processes.map((proc) => (
          <div key={proc.pid} className="glass-panel p-4 rounded-2xl border border-slate-800 bg-[#080d19]/80 space-y-3">
            {/* Row 1: Basic Info */}
            <div className="grid grid-cols-1 sm:grid-cols-6 gap-3 items-center">
              <div className="sm:col-span-1">
                <label className="text-[10px] text-slate-400 uppercase font-semibold font-mono">PID</label>
                <input
                  type="number"
                  value={proc.pid}
                  onChange={(e) => handleUpdateProcess(proc.pid, 'pid', Number(e.target.value))}
                  className="w-full bg-[#0b101d] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-500 font-bold"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[10px] text-slate-400 uppercase font-semibold font-mono">Process Name</label>
                <input
                  type="text"
                  value={proc.name}
                  onChange={(e) => handleUpdateProcess(proc.pid, 'name', e.target.value)}
                  className="w-full bg-[#0b101d] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-semibold"
                />
              </div>

              <div className="sm:col-span-1">
                <label className="text-[10px] text-slate-400 uppercase font-semibold font-mono">Category</label>
                <select
                  value={proc.processCategory}
                  onChange={(e) => handleCategoryChange(proc.pid, e.target.value as ProcessCategory)}
                  className="w-full bg-[#0b101d] border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500 font-mono"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] text-slate-400 uppercase font-semibold font-mono">Affinity</label>
                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold border ${AffinityEngine.getTier(proc.goalAffinity ?? 0).badgeClass}`}>
                    {AffinityEngine.getTier(proc.goalAffinity ?? 0).tier}
                  </span>
                </div>
                <input
                  type="number"
                  step="0.1"
                  min="-1"
                  max="1"
                  value={proc.goalAffinity}
                  onChange={(e) => handleUpdateProcess(proc.pid, 'goalAffinity', Number(e.target.value))}
                  className="mt-1 w-full bg-[#0b101d] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500 font-bold"
                />
              </div>

              <div className="sm:col-span-1 flex items-center justify-between pt-3">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-semibold block font-mono">Arrival Second</label>
                  <input
                    type="number"
                    min="0"
                    value={proc.arrivalTime}
                    onChange={(e) => handleUpdateProcess(proc.pid, 'arrivalTime', Number(e.target.value))}
                    className="w-16 bg-[#0b101d] border border-slate-700 rounded-lg px-2 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-500 font-bold"
                  />
                </div>

                <button
                  onClick={() => handleRemoveProcess(proc.pid)}
                  className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg border border-transparent hover:border-rose-800 transition"
                  title="Delete Process"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Row 2: Burst Sequence Designer */}
            <div className="pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-slate-400 font-mono font-semibold mr-1">Execution Bursts:</span>
              {proc.burstSequence.map((burst, idx) => (
                <div
                  key={idx}
                  className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono ${
                    burst.type === 'CPU'
                      ? 'bg-cyan-950/60 border-cyan-700/60 text-cyan-200'
                      : 'bg-amber-950/60 border-amber-700/60 text-amber-200'
                  }`}
                >
                  <span className="font-bold">{burst.type === 'CPU' ? 'Processor' : 'Device'}:</span>
                  <input
                    type="number"
                    min="1"
                    value={burst.duration}
                    onChange={(e) => handleBurstDurationChange(proc.pid, idx, Number(e.target.value))}
                    className="w-10 bg-[#070b14] border border-slate-700 rounded px-1 py-0.5 text-xs text-white text-center focus:outline-none font-mono"
                  />
                  <span>seconds</span>
                  <button
                    onClick={() => handleRemoveBurst(proc.pid, idx)}
                    className="ml-1 text-slate-400 hover:text-rose-400 transition"
                  >
                    ×
                  </button>
                </div>
              ))}

              <div className="flex items-center space-x-1.5 ml-2">
                <button
                  onClick={() => handleAddBurst(proc.pid, 'CPU')}
                  className="px-2.5 py-1 rounded bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 text-[10.5px] font-semibold font-mono transition"
                >
                  + CPU Burst
                </button>
                <button
                  onClick={() => handleAddBurst(proc.pid, 'IO')}
                  className="px-2.5 py-1 rounded bg-amber-950 hover:bg-amber-900 border border-amber-800 text-amber-300 text-[10.5px] font-semibold font-mono transition"
                >
                  + I/O Burst
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

