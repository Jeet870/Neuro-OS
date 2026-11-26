import React, { useRef, useEffect, useState } from 'react';
import { GanttChartSquare, ZoomIn, ZoomOut, Clock, ArrowRightLeft } from 'lucide-react';
import { useSimulationStore } from '../../store/useSimulationStore';

export const GanttTimeline: React.FC = () => {
  const { ganttHistory, currentTick, isRunning } = useSimulationStore();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<number>(1);

  // Auto-scroll to keep active playhead in viewport during simulation
  useEffect(() => {
    if (scrollContainerRef.current && isRunning) {
      scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
    }
  }, [currentTick, ganttHistory, isRunning]);

  const getSegmentColor = (pid: number | 'CS' | 'IDLE') => {
    if (pid === 'CS') return 'cs-pattern border-purple-500/70 text-purple-200';
    if (pid === 'IDLE') return 'bg-[#080d1a] border-slate-800 text-slate-600';

    const colors = [
      'bg-cyan-900/90 border-cyan-500/80 text-cyan-100',
      'bg-blue-900/90 border-blue-500/80 text-blue-100',
      'bg-emerald-900/90 border-emerald-500/80 text-emerald-100',
      'bg-amber-900/90 border-amber-500/80 text-amber-100',
      'bg-rose-900/90 border-rose-500/80 text-rose-100',
      'bg-indigo-900/90 border-indigo-500/80 text-indigo-100',
    ];
    return colors[pid % colors.length];
  };

  const tickWidth = 22 * zoom; // px per tick

  return (
    <div className="bg-[#0b1120] p-4 rounded-xl border border-slate-800 flex flex-col space-y-3 shadow-md">
      {/* Gantt Header & Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-md bg-[#050811] text-cyan-400 border border-cyan-900/50">
            <GanttChartSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
              Processor Execution Timeline
            </h3>
            <p className="text-[11px] text-slate-400">
              Discrete timeline of process execution bursts, preemption context switches, and processor idle periods
            </p>
          </div>
        </div>

        {/* Legend & Zoom Controls */}
        <div className="flex items-center space-x-3 text-xs">
          <div className="hidden sm:flex items-center space-x-3 text-[11px] text-slate-400 font-mono">
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-cyan-600 border border-cyan-400" />
              <span>Process Burst</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-sm cs-pattern border border-purple-500" />
              <span>Context Switch</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#080d1a] border border-slate-700" />
              <span>Idle</span>
            </span>
          </div>

          <div className="flex items-center space-x-1 bg-[#050811] border border-slate-800 rounded-md p-0.5">
            <button
              onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono font-bold px-1.5 text-cyan-400">{zoom.toFixed(2)}x</span>
            <button
              onClick={() => setZoom(Math.min(3, zoom + 0.25))}
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Gantt Timeline Viewport */}
      <div
        ref={scrollContainerRef}
        className="w-full overflow-x-auto bg-[#060a14] rounded-lg p-3 border border-slate-800/90 relative min-h-[110px]"
      >
        {ganttHistory.length === 0 ? (
          <div className="text-xs text-slate-500 font-mono italic py-8 text-center flex flex-col items-center justify-center space-y-1">
            <Clock className="w-5 h-5 text-slate-600 animate-pulse" />
            <span>Simulation timeline awaiting second 0 start...</span>
          </div>
        ) : (
          <div
            className="flex flex-col space-y-2 relative"
            style={{ minWidth: `${Math.max(120, currentTick * tickWidth + 120)}px` }}
          >
            {/* Process Execution Blocks */}
            <div className="flex h-12 items-center relative z-10">
              {ganttHistory.map((seg, idx) => {
                const duration = seg.endTick - seg.startTick;
                const width = Math.max(14, duration * tickWidth);
                const color = getSegmentColor(seg.pid);

                return (
                  <div
                    key={idx}
                    style={{ width: `${width}px` }}
                    className={`h-11 rounded border flex flex-col items-center justify-center text-xs font-mono font-bold px-1 mx-0.5 relative group shadow-sm transition-all ${color}`}
                  >
                    <span className="truncate text-[11px]">
                      {seg.pid === 'CS' ? 'Switch' : seg.pid === 'IDLE' ? 'Idle' : `Process ${seg.pid}`}
                    </span>
                    <span className="text-[9px] opacity-75 font-normal">{duration}s</span>

                    {/* Precision Tooltip */}
                    <div className="absolute bottom-full mb-1.5 hidden group-hover:flex flex-col bg-[#0f172a] text-slate-200 text-[11px] font-mono p-2.5 rounded-md shadow-2xl border border-slate-700 z-30 whitespace-nowrap pointer-events-none">
                      <div className="font-bold text-cyan-400 flex items-center space-x-1 border-b border-slate-800 pb-1 mb-1">
                        {seg.pid === 'CS' ? (
                          <>
                            <ArrowRightLeft className="w-3 h-3 text-purple-400" />
                            <span>Context Switch Overhead</span>
                          </>
                        ) : seg.pid === 'IDLE' ? (
                          <span>CPU Idle Cycle</span>
                        ) : (
                          <span>{seg.name} (Process ID {seg.pid})</span>
                        )}
                      </div>
                      <div className="text-[10px] space-y-0.5 text-slate-300">
                        <div>Time Interval: <span className="text-white">[{seg.startTick}s → {seg.endTick}s]</span></div>
                        <div>Duration: <span className="text-cyan-300">{duration} seconds</span></div>
                        {seg.queueLevel !== undefined && (
                          <div>Queue Tier: <span className="text-amber-300">Tier {seg.queueLevel}</span></div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Time Ruler with Second Marks */}
            <div className="flex text-[10px] font-mono text-slate-500 border-t border-slate-800/80 pt-1">
              {ganttHistory.map((seg, idx) => {
                const duration = seg.endTick - seg.startTick;
                const width = Math.max(14, duration * tickWidth);
                return (
                  <div key={idx} style={{ width: `${width}px` }} className="text-left pl-0.5 border-l border-slate-800/40">
                    {seg.startTick}s
                  </div>
                );
              })}
              <div className="pl-1 text-cyan-400 font-bold border-l border-cyan-500/60 font-mono">
                {currentTick}s
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
