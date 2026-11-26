import { IProcessControlBlock } from './process';
import { ContextSnapshot } from './context';

export type AlgorithmType = 'RR' | 'MLFQ' | 'CA_MLFQ';

export interface TunableParameters {
  q0Quantum: number;            // Default: 2 ticks
  q1Quantum: number;            // Default: 4 ticks
  q2Quantum: number;            // Default: 8 ticks
  rrQuantum: number;            // Default: 4 ticks
  maxAgingWait: number;         // Default: 20 ticks
  contextSwitchCost: number;    // Default: 1 tick
  q2QuotaFloorPercent: number;  // Default: 10%
  focusedQuantumMultiplier: number; // Default: 2x boost on Q0
}

export const DEFAULT_TUNABLE_PARAMETERS: TunableParameters = {
  q0Quantum: 2,
  q1Quantum: 4,
  q2Quantum: 8,
  rrQuantum: 4,
  maxAgingWait: 20,
  contextSwitchCost: 1,
  q2QuotaFloorPercent: 10,
  focusedQuantumMultiplier: 2,
};

export interface SchedulerDecision {
  nextProcess: IProcessControlBlock | null;
  isContextSwitch: boolean;
  selectedQuantum: number;      // Communicated directly to the Dispatcher
  preemptedProcess: IProcessControlBlock | null;
  reason: string;
}

export interface IScheduler {
  readonly algorithm: AlgorithmType;
  
  /** Initialize or reset scheduler queues */
  init(params: TunableParameters): void;
  
  /** Add a newly arriving or unblocked process */
  admitProcess(process: IProcessControlBlock, context: ContextSnapshot): void;
  
  /** Update waiting times / aging for all queued processes */
  onTick(currentTick: number, context: ContextSnapshot): void;
  
  /** Select the next process to execute and communicate selected quantum */
  scheduleNext(
    currentRunning: IProcessControlBlock | null, 
    context: ContextSnapshot, 
    currentTick: number
  ): SchedulerDecision;
  
  /** Handle time-quantum expiration */
  onQuantumExpired(process: IProcessControlBlock, context: ContextSnapshot): void;
  
  /** Handle voluntary yield (e.g. process enters I/O) */
  onProcessYield(process: IProcessControlBlock, context: ContextSnapshot): void;
  
  /** Handle process completion */
  onProcessTerminated(process: IProcessControlBlock): void;
  
  /** Get current snapshot of all internal queues */
  getQueueSnapshot(): {
    q0: number[];
    q1: number[];
    q2: number[];
    allReadyPids: number[];
  };
}
