import { AlgorithmType, TunableParameters } from './scheduler';
import { WorkloadTrace } from './trace';
import { ContextSnapshot, LearningGoal } from './context';
import { IProcessControlBlock } from './process';
import { AlgorithmMetricsReport, GanttSegment, ScenarioComparisonReport } from './metrics';

export type WorkerInboundMessage =
  | { type: 'LOAD_TRACE'; payload: { trace: WorkloadTrace } }
  | { type: 'START_SIMULATION'; payload: { algorithm: AlgorithmType; speedMs: number } }
  | { type: 'PAUSE_SIMULATION' }
  | { type: 'RESUME_SIMULATION' }
  | { type: 'STEP_TICK' }
  | { type: 'RESET_SIMULATION' }
  | { type: 'SET_SPEED'; payload: { speedMs: number } }
  | { type: 'SET_GOAL'; payload: { goal: LearningGoal } }
  | { type: 'UPDATE_TUNABLE_PARAMS'; payload: { params: Partial<TunableParameters> } }
  | { type: 'RUN_BATCH_BENCHMARK'; payload: { trace: WorkloadTrace } };

export type WorkerOutboundMessage =
  | { type: 'TICK_SNAPSHOT'; payload: {
      tick: number;
      activePid: number | null;
      isContextSwitch: boolean;
      context: ContextSnapshot;
      queues: {
        q0: number[];
        q1: number[];
        q2: number[];
        waiting: number[];
        suspended: number[];
      };
      pcbs: IProcessControlBlock[];
      ganttHistory: GanttSegment[];
      liveMetrics: {
        wAvg: number;
        tAvg: number;
        rCritAvg: number;
        contextSwitches: number;
        cpuUtilization: number;
      };
      isTerminated: boolean;
    }}
  | { type: 'SIMULATION_COMPLETED'; payload: { finalReport: AlgorithmMetricsReport; ganttHistory: GanttSegment[] } }
  | { type: 'BENCHMARK_COMPLETED'; payload: { report: ScenarioComparisonReport } }
  | { type: 'SIMULATION_ERROR'; payload: { message: string; details?: string } };
