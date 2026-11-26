import React, { useState } from 'react';
import { X, Sliders, CheckCircle2, RotateCcw } from 'lucide-react';
import { useSimulationStore } from '../../store/useSimulationStore';
import { DEFAULT_TUNABLE_PARAMETERS, TunableParameters } from '../../types/scheduler';

interface TunableParamsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TunableParamsModal: React.FC<TunableParamsModalProps> = ({ isOpen, onClose }) => {
  const { tunableParams, updateTunableParams } = useSimulationStore();
  const [params, setParams] = useState<TunableParameters>({ ...tunableParams });
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleChange = (key: keyof TunableParameters, val: number) => {
    setParams({ ...params, [key]: val });
    setSaved(false);
  };

  const handleSave = () => {
    updateTunableParams(params);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 500);
  };

  const handleResetDefaults = () => {
    setParams({ ...DEFAULT_TUNABLE_PARAMETERS });
    setSaved(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-panel-glow w-full max-w-xl rounded-2xl border border-slate-700 p-6 space-y-6 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white">Tunable Scheduler & Aging Parameters</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
          {/* Q0 Quantum */}
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1.5">
            <div className="flex justify-between text-slate-300 font-sans font-semibold">
              <span>Tier 0 Time Slice (High Priority)</span>
              <span className="text-cyan-400 font-mono font-bold">{params.q0Quantum} seconds</span>
            </div>
            <input
              type="range"
              min="1"
              max="8"
              value={params.q0Quantum}
              onChange={(e) => handleChange('q0Quantum', Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <p className="text-[10px] text-slate-500 font-sans">High-priority critical task time slice</p>
          </div>

          {/* Q1 Quantum */}
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1.5">
            <div className="flex justify-between text-slate-300 font-sans font-semibold">
              <span>Tier 1 Time Slice (Normal Priority)</span>
              <span className="text-cyan-400 font-mono font-bold">{params.q1Quantum} seconds</span>
            </div>
            <input
              type="range"
              min="2"
              max="12"
              value={params.q1Quantum}
              onChange={(e) => handleChange('q1Quantum', Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <p className="text-[10px] text-slate-500 font-sans">Normal priority time slice</p>
          </div>

          {/* Q2 Quantum */}
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1.5">
            <div className="flex justify-between text-slate-300 font-sans font-semibold">
              <span>Tier 2 Time Slice (Low Priority)</span>
              <span className="text-cyan-400 font-mono font-bold">{params.q2Quantum} seconds</span>
            </div>
            <input
              type="range"
              min="4"
              max="20"
              value={params.q2Quantum}
              onChange={(e) => handleChange('q2Quantum', Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <p className="text-[10px] text-slate-500 font-sans">Throttled background task time slice</p>
          </div>

          {/* Starvation Aging Ceiling (maxAgingWait) */}
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1.5">
            <div className="flex justify-between text-slate-300 font-sans font-semibold">
              <span>Maximum Wait Before Promotion</span>
              <span className="text-amber-400 font-mono font-bold">{params.maxAgingWait} seconds</span>
            </div>
            <input
              type="range"
              min="10"
              max="50"
              step="2"
              value={params.maxAgingWait}
              onChange={(e) => handleChange('maxAgingWait', Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <p className="text-[10px] text-slate-500 font-sans">
              Standard tasks: {params.maxAgingWait} seconds | Distracting tasks: {Math.round(params.maxAgingWait * 1.5)} seconds
            </p>
          </div>

          {/* Context Switch Cost */}
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1.5">
            <div className="flex justify-between text-slate-300 font-sans font-semibold">
              <span>Context Switch Overhead Penalty</span>
              <span className="text-purple-400 font-mono font-bold">{params.contextSwitchCost} seconds</span>
            </div>
            <input
              type="range"
              min="0"
              max="4"
              value={params.contextSwitchCost}
              onChange={(e) => handleChange('contextSwitchCost', Number(e.target.value))}
              className="w-full accent-purple-500 cursor-pointer"
            />
            <p className="text-[10px] text-slate-500 font-sans">Processor penalty charged during process preemption</p>
          </div>

          {/* Focused Quantum Multiplier */}
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1.5">
            <div className="flex justify-between text-slate-300 font-sans font-semibold">
              <span>Focused Priority Time Slice Multiplier</span>
              <span className="text-emerald-400 font-mono font-bold">{params.focusedQuantumMultiplier}x</span>
            </div>
            <input
              type="range"
              min="1"
              max="4"
              value={params.focusedQuantumMultiplier}
              onChange={(e) => handleChange('focusedQuantumMultiplier', Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <p className="text-[10px] text-slate-500 font-sans">Multiplies priority time slice when user attention is focused</p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <button
            onClick={handleResetDefaults}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center space-x-1.5 px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/20"
            >
              {saved ? <CheckCircle2 className="w-4 h-4" /> : null}
              <span>{saved ? 'Applied!' : 'Apply Parameters'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
