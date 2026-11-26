import React from 'react';
import { X, BookOpen, GraduationCap, ShieldCheck, Cpu, Code2 } from 'lucide-react';

interface TheoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TheoryModal: React.FC<TheoryModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-panel-glow w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl border border-slate-700 p-6 space-y-6 text-slate-200 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-800/50">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Operating System Theory &amp; Context-Aware Queue Model</h3>
              <p className="text-xs text-slate-400 font-medium">Operating Systems Educational Architecture Documentation</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section 1: Academic Identity */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center space-x-1.5">
            <Cpu className="w-4 h-4" />
            <span>Academic Identity &amp; Boundaries</span>
          </h4>
          <p className="text-xs text-slate-300 leading-relaxed">
            <strong>NeuroOS</strong> is a discrete-event Operating System research simulator that evaluates the performance, fairness, and responsiveness of a <em>Context-Aware Multilevel Feedback Queue (CA-MLFQ)</em> scheduler against classical baselines (Round Robin and Classical MLFQ) under synthetic digital-learning workloads.
          </p>
          <div className="pt-2 text-[11px] text-slate-400 border-t border-slate-800 space-y-1">
            <p>🚫 <strong>What NeuroOS is NOT:</strong> Not a biological/psychological brainwave detector, not a productivity to-do widget, not a real C/C++ kernel patch, and not an AI LLM agent inside the scheduler.</p>
            <p>✅ <strong>What NeuroOS IS:</strong> A mathematically rigorous, deterministic discrete-event OS simulation demonstrating Process Control Blocks (PCBs), 6-state lifecycles, dynamic time quanta, bounded aging, and context switch penalties.</p>
          </div>
        </div>

        {/* Section 2: CA-MLFQ Mathematical Rules */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center space-x-1.5">
            <Code2 className="w-4 h-4" />
            <span>CA-MLFQ Algorithmic Rules</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-slate-950/60 rounded-xl border border-cyan-900/40">
              <span className="font-bold text-cyan-300 block mb-1">Tier 0 (Critical Tasks)</span>
              <p className="text-[11px] text-slate-400">Time slice = 2 seconds (Boosted to 4 seconds when Attention is Focused). High goal-affinity tasks (Affinity &ge; 0.7). Preemptive.</p>
            </div>
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <span className="font-bold text-slate-300 block mb-1">Tier 1 (Normal Tasks)</span>
              <p className="text-[11px] text-slate-400">Time slice = 4 seconds. Neutral processes (Affinity = 0.0) and demoted Tier 0 tasks. Preempts Tier 2.</p>
            </div>
            <div className="p-3 bg-slate-950/60 rounded-xl border border-rose-900/30">
              <span className="font-bold text-rose-300 block mb-1">Tier 2 (Throttled Background Tasks)</span>
              <p className="text-[11px] text-slate-400">Time slice = 8 seconds. Distracting/low-affinity tasks (Affinity &lt; 0). Receives 10% Quota Floor Reservation.</p>
            </div>
          </div>
        </div>

        {/* Section 3: Starvation Defense & Aging Policy */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4" />
            <span>Mathematical Starvation &amp; Aging Proof</span>
          </h4>
          <p className="text-xs text-slate-300 leading-relaxed">
            To prevent permanent starvation of low-priority background processes, NeuroOS enforces an <strong>Effective Maximum Wait Ceiling</strong>:
          </p>
          <ul className="list-disc list-inside text-xs text-slate-300 space-y-1 font-mono pl-1">
            <li>For normal/neutral processes (Affinity &ge; 0): Effective Max Wait = maxAgingWait = 20 seconds</li>
            <li>For distracting/negative processes (Affinity &lt; 0): Effective Max Wait = maxAgingWait &times; 1.5 = 30 seconds</li>
          </ul>
          <p className="text-[11px] text-slate-400 pt-1">
            When continuous waiting time reaches the Effective Max Wait, the process is immediately elevated to Q0 (Head), guaranteeing that the Starvation Index (S_idx = W_max / maxAgingWait) remains strictly bounded.
          </p>
        </div>

        {/* Section 4: UN SDG 4 Alignment */}
        <div className="p-4 rounded-xl bg-red-950/20 border border-red-900/40 space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-red-400 flex items-center space-x-1.5">
            <GraduationCap className="w-4 h-4" />
            <span>UN Sustainable Development Goal (SDG 4) Alignment</span>
          </h4>
          <p className="text-xs text-slate-300 leading-relaxed">
            <strong>Target 4.4 &amp; 4.a:</strong> NeuroOS addresses computational Quality-of-Service (QoS) on low-to-mid-tier student devices. By prioritizing learning tools (compilers, IDEs, lectures) over background distractions, context-aware scheduling ensures responsive execution on low-spec hardware without necessitating costly hardware upgrades.
          </p>
        </div>

        {/* Close Button */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/20"
          >
            Close Documentation
          </button>
        </div>
      </div>
    </div>
  );
};
