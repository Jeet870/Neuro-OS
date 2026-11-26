import { LearningGoal } from './context';
import { ProcessTraceInput } from './process';
import { TunableParameters } from './scheduler';

export interface SystemParameters {
  totalMemoryFrames: number;
  frameSizeKB: number;
  contextSwitchCostTicks: number;
}

export interface WorkloadTrace {
  traceId: string;
  name: string;
  description: string;
  learningGoal: LearningGoal;
  systemParameters: SystemParameters;
  tunableParameters: TunableParameters;
  processes: ProcessTraceInput[];
}
