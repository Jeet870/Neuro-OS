import React, { useState, useEffect } from 'react';
import { Terminal, Cpu, ShieldCheck, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface BootSequenceProps {
  onComplete: () => void;
}

const BOOT_LOGS = [
  'Operating System Simulation Kernel starting up...',
  '[ OK ] Discrete integer clock initialized (starting at second 0).',
  '[ OK ] Process Control Table allocated (64 concurrent process capacity).',
  '[ OK ] Context-Aware Multi-Level Queue scheduler registered [Tier 0: 2 seconds | Tier 1: 4 seconds | Tier 2: 8 seconds].',
  '[ OK ] Real-time Attention Telemetry Engine mounted (Goal Alignment, Focus Continuity, Switching Rate, Activity).',
  '[ OK ] Anti-Starvation Ceiling active (maximum wait before automatic promotion: 20 seconds).',
  '[ OK ] Student Educational Experience Optimization profile active.',
  '[ OK ] Standardized Evaluation Scenarios loaded and verified.',
  'System initialization complete. Launching Interactive Dashboard...',
];

export const BootSequence: React.FC<BootSequenceProps> = ({ onComplete }) => {
  const [displayedCount, setDisplayedCount] = useState(1);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setDisplayedCount((prev) => {
        if (prev < BOOT_LOGS.length) {
          return prev + 1;
        } else {
          clearInterval(timer);
          setIsReady(true);
          setTimeout(() => {
            onComplete();
          }, 600);
          return prev;
        }
      });
    }, 120);

    return () => clearInterval(timer);
  }, [onComplete]);

  const activeLogs = BOOT_LOGS.slice(0, displayedCount);

  return (
    <div className="fixed inset-0 z-50 bg-[#050811] text-slate-200 flex items-center justify-center p-4 select-none font-mono">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        className="w-full max-w-2xl bg-[#090d18] border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Terminal Header */}
        <div className="bg-[#0f172a] px-4 py-2.5 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-slate-200">Operating System Startup Loader</span>
          </div>
          <button
            onClick={onComplete}
            className="flex items-center space-x-1 text-[11px] text-cyan-400 hover:text-cyan-300 transition cursor-pointer"
          >
            <span>Skip Boot</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Terminal Output Body */}
        <div className="p-5 text-xs space-y-1.5 min-h-[260px] bg-[#070b14] overflow-y-auto">
          {activeLogs.map((line, idx) => {
            if (!line) return null;
            const isOk = line.startsWith('[ OK ]');
            return (
              <div key={idx} className="flex items-start space-x-2">
                {isOk ? (
                  <span className="text-emerald-400 font-bold">[ OK ]</span>
                ) : (
                  <span className="text-cyan-400 font-bold">&gt;&gt;</span>
                )}
                <span className={isOk ? 'text-slate-300' : 'text-cyan-300 font-semibold'}>
                  {isOk ? line.slice(6) : line}
                </span>
              </div>
            );
          })}
          {!isReady && (
            <div className="inline-block w-2 h-4 bg-cyan-400 animate-pulse ml-1" />
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-[#0b1120] border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center space-x-1.5">
            <Cpu className="w-3.5 h-3.5 text-slate-400" />
            <span>Architecture: Discrete-Event Simulator</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Security: Local Sandbox</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

