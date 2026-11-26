import { 
  AlgorithmType, 
  IScheduler, 
  SchedulerDecision, 
  TunableParameters, 
  DEFAULT_TUNABLE_PARAMETERS 
} from '../../types/scheduler';
import { IProcessControlBlock } from '../../types/process';
import { ContextSnapshot } from '../../types/context';
import { ProcessControlBlock } from '../core/PCB';
import { ProcessQueue } from '../core/ProcessQueue';

export class RoundRobinScheduler implements IScheduler {
  public readonly algorithm: AlgorithmType = 'RR';
  private readyQueue: ProcessQueue;
  private params: TunableParameters;

  constructor(params: TunableParameters = DEFAULT_TUNABLE_PARAMETERS) {
    this.params = { ...params };
    this.readyQueue = new ProcessQueue('RR_ReadyQueue', 0);
  }

  public init(params: TunableParameters): void {
    this.params = { ...params };
    this.readyQueue.clear();
  }

  public admitProcess(process: IProcessControlBlock, _context: ContextSnapshot): void {
    const pcb = process as ProcessControlBlock;
    pcb.state = 'READY';
    pcb.currentQuantumUsed = 0;
    this.readyQueue.enqueue(pcb);
  }

  public onTick(_currentTick: number, _context: ContextSnapshot): void {
    this.readyQueue.onTickWait();
  }

  public scheduleNext(
    currentRunning: IProcessControlBlock | null,
    _context: ContextSnapshot,
    _currentTick: number
  ): SchedulerDecision {
    const runningPcb = currentRunning as ProcessControlBlock | null;

    // If currently running process can continue (e.g. quantum not yet expired and not yielded)
    if (runningPcb && runningPcb.state === 'RUNNING') {
      return {
        nextProcess: runningPcb,
        isContextSwitch: false,
        selectedQuantum: this.params.rrQuantum,
        preemptedProcess: null,
        reason: 'RR_CONTINUE_BURST',
      };
    }

    // Select next process from FIFO ready queue
    const nextPcb = this.readyQueue.dequeue();
    if (!nextPcb) {
      return {
        nextProcess: null,
        isContextSwitch: false,
        selectedQuantum: this.params.rrQuantum,
        preemptedProcess: null,
        reason: 'RR_CPU_IDLE',
      };
    }

    nextPcb.state = 'RUNNING';
    nextPcb.continuousWaitTime = 0;

    const isContextSwitch = runningPcb ? runningPcb.pid !== nextPcb.pid : false;
    if (isContextSwitch) {
      nextPcb.contextSwitchCount += 1;
    }

    return {
      nextProcess: nextPcb,
      isContextSwitch,
      selectedQuantum: this.params.rrQuantum,
      preemptedProcess: runningPcb && runningPcb.state !== 'TERMINATED' && runningPcb.state !== 'WAITING' ? runningPcb : null,
      reason: isContextSwitch ? 'RR_CONTEXT_SWITCH' : 'RR_DISPATCH',
    };
  }

  public onQuantumExpired(process: IProcessControlBlock, _context: ContextSnapshot): void {
    const pcb = process as ProcessControlBlock;
    pcb.state = 'READY';
    pcb.currentQuantumUsed = 0;
    this.readyQueue.enqueue(pcb);
  }

  public onProcessYield(process: IProcessControlBlock, _context: ContextSnapshot): void {
    const pcb = process as ProcessControlBlock;
    pcb.currentQuantumUsed = 0;
    // Process is moved to WAITING queue in SimulationEngine
  }

  public onProcessTerminated(process: IProcessControlBlock): void {
    const pcb = process as ProcessControlBlock;
    pcb.state = 'TERMINATED';
    this.readyQueue.remove(pcb.pid);
  }

  public getQueueSnapshot(): {
    q0: number[];
    q1: number[];
    q2: number[];
    allReadyPids: number[];
  } {
    const pids = this.readyQueue.getPids();
    return {
      q0: pids,
      q1: [],
      q2: [],
      allReadyPids: pids,
    };
  }
}
