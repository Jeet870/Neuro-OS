import React from 'react';
import { LiveMetricsPanel } from './LiveMetricsPanel';
import { ContextRadar } from './ContextRadar';
import { QueueVisualizer } from './QueueVisualizer';
import { GanttTimeline } from './GanttTimeline';
import { ProcessExplorer } from './ProcessExplorer';

export const SimulationStudio: React.FC = () => {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {/* Row 1: Live Telemetry Metrics */}
      <LiveMetricsPanel />

      {/* Row 2: Context Radar (Left) + Queue Visualizer (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-4 h-full">
          <ContextRadar />
        </div>
        <div className="lg:col-span-8 h-full">
          <QueueVisualizer />
        </div>
      </div>

      {/* Row 3: Live Gantt Timeline */}
      <GanttTimeline />

      {/* Row 4: Process Explorer & PCB Table */}
      <ProcessExplorer />
    </div>
  );
};
