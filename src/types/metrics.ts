import { AlgorithmType } from './scheduler';
import { ProcessCategory } from './process';

export interface ProcessMetrics {
  pid: number;
  name: string;
  category: ProcessCategory;
  isCritical: boolean;
  arrivalTime: number;
  completionTime: number;
  waitingTime: number;
  turnaroundTime: number;
  responseTime: number;
  deadlineMet: boolean | null;
  contextSwitches: number;
}

export interface AlgorithmMetricsReport {
  algorithm: AlgorithmType;
  totalTicks: number;
  cpuBusyTicks: number;
  cpuIdleTicks: number;
  cpuContextSwitchTicks: number;
  cpuUtilization: number;       // (busy / total) * 100
  averageWaitingTime: number;
  averageTurnaroundTime: number;
  averageResponseTime: number;
  criticalWaitingTime: number;
  criticalTurnaroundTime: number;
  criticalResponseTime: number;
  nonCriticalWaitingTime: number;
  maximumWaitingTime: number;
  starvationIndex: number;      // maxWait / maxAgingWait threshold
  totalContextSwitches: number;
  deadlineMissCount: number;
  deadlineMissRatio: number;
  perProcessMetrics: ProcessMetrics[];
}

export interface ScenarioComparisonReport {
  scenarioId: string;
  scenarioName: string;
  hypothesis: string;
  results: Record<AlgorithmType, AlgorithmMetricsReport>;
  deltas: {
    // Relative to Classical MLFQ
    criticalResponseTimeDeltaPercent: number;
    criticalTurnaroundDeltaPercent: number;
    averageWaitingDeltaPercent: number;
    contextSwitchDeltaCount: number;
    starvationIndexDiff: number;
  };
}

export interface GanttSegment {
  pid: number | 'CS' | 'IDLE';
  name: string;
  category?: ProcessCategory;
  startTick: number;
  endTick: number;
  queueLevel?: number;
  isContextSwitch: boolean;
}
