import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Header } from './components/layout/Header';
import { ControlBar } from './components/layout/ControlBar';
import { SimulationStudio } from './components/dashboard/SimulationStudio';
import { BenchmarkSuite } from './components/benchmarks/BenchmarkSuite';
import { TraceEditor } from './components/trace-editor/TraceEditor';
import { TunableParamsModal } from './components/dashboard/TunableParamsModal';
import { TheoryModal } from './components/theory/TheoryModal';
import { BootSequence } from './components/common/BootSequence';
import { useSimulationStore } from './store/useSimulationStore';

export const App: React.FC = () => {
  const { init, activeTab } = useSimulationStore();
  const [paramsModalOpen, setParamsModalOpen] = useState(false);
  const [theoryModalOpen, setTheoryModalOpen] = useState(false);
  const [isBooting, setIsBooting] = useState(() => {
    // Only show boot sequence on initial session load
    return !sessionStorage.getItem('neuroos_booted');
  });

  useEffect(() => {
    init();
  }, [init]);

  const handleBootComplete = () => {
    sessionStorage.setItem('neuroos_booted', 'true');
    setIsBooting(false);
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200 overflow-x-hidden">
      {/* Bootloader Stage Animation */}
      <AnimatePresence>
        {isBooting && (
          <BootSequence onComplete={handleBootComplete} />
        )}
      </AnimatePresence>

      {/* Top Brand Header */}
      <Header
        onOpenParams={() => setParamsModalOpen(true)}
        onOpenTheory={() => setTheoryModalOpen(true)}
      />

      {/* Control Bar (shown for Studio & Trace Builder) */}
      <ControlBar />

      {/* Main Content Body with Animated Tab Transitions */}
      <main className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'STUDIO' && (
            <motion.div
              key="studio"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
            >
              <SimulationStudio />
            </motion.div>
          )}
          {activeTab === 'BENCHMARKS' && (
            <motion.div
              key="benchmarks"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
            >
              <BenchmarkSuite />
            </motion.div>
          )}
          {activeTab === 'TRACE_BUILDER' && (
            <motion.div
              key="trace-builder"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
            >
              <TraceEditor />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Modals */}
      <TunableParamsModal
        isOpen={paramsModalOpen}
        onClose={() => setParamsModalOpen(false)}
      />

      <TheoryModal
        isOpen={theoryModalOpen}
        onClose={() => setTheoryModalOpen(false)}
      />
    </div>
  );
};

export default App;

