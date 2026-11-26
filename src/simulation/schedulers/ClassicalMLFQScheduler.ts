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

export class ClassicalMLFQScheduler implements IScheduler {
  public readonly algorithm: AlgorithmType = 'MLFQ';
  private queues: [ProcessQueue, ProcessQueue, ProcessQueue];
  private params: TunableParameters;

  constructor(params: TunableParameters = DEFAULT_TUNABLE_PARAMETERS) {
    this.params = { ...params };
    this.queues = [
      new ProcessQueue('MLFQ_Q0', 0),
      new ProcessQueue('MLFQ_Q1', 1),
      new ProcessQueue('MLFQ_Q2', 2),
    ];
  }

  public init(params: TunableParameters): void {
    this.params = { ...params };
    for (const q of this.queues) {
      q.clear();
    }
  }

  public admitProcess(process: IProcessControlBlock, _context: ContextSnapshot): void {
    const pcb = process as ProcessControlBlock;
    pcb.state = 'READY';
    pcb.currentQuantumUsed = 0;
    // New or unblocked process returns to its preserved queue level (default Q0)
    const targetLevel = Math.min(2, Math.max(0, pcb.currentQueueLevel));
    this.queues[targetLevel].enqueue(pcb);
  }

  public onTick(_currentTick: number, _context: ContextSnapshot): void {
    // 1. Advance waiting counters
    for (const q of this.queues) {
      q.onTickWait();
    }

    // 2. Classical Aging mechanism: promote if waiting exceeds maxAgingWait
    // Check Q2 -> promote to Q1
    for (const p of this.queues[2].getAll()) {
      if (p.continuousWaitTime >= this.params.maxAgingWait) {
        this.queues[2].remove(p.pid);
        p.continuousWaitTime = 0;
        p.currentQueueLevel = 1;
        this.queues[1].enqueue(p);
      }
    }

    // Check Q1 -> promote to Q0
    for (const p of this.queues[1].getAll()) {
      if (p.continuousWaitTime >= this.params.maxAgingWait) {
        this.queues[1].remove(p.pid);
        p.continuousWaitTime = 0;
        p.currentQueueLevel = 0;
        this.queues[0].enqueue(p);
      }
    }
  }

  public scheduleNext(
    currentRunning: IProcessControlBlock | null,
    _context: ContextSnapshot,
    _currentTick: number
  ): SchedulerDecision {
    const runningPcb = currentRunning as ProcessControlBlock | null;

    // Check if a higher-priority queue has ready processes that should preempt running process
    if (runningPcb && runningPcb.state === 'RUNNING') {
      const runningLevel = runningPcb.currentQueueLevel;
      // If higher level queue has processes, preempt!
      let higherReady = false;
      for (let lvl = 0; lvl < runningLevel; lvl++) {
        if (!this.queues[lvl].isEmpty()) {
          higherReady = true;
          break;
        }
      }

      if (!higherReady) {
        // Continue running with appropriate quantum
        const quantum = this.getQuantumForLevel(runningLevel);
        return {
          nextProcess: runningPcb,
          isContextSwitch: false,
          selectedQuantum: quantum,
          preemptedProcess: null,
          reason: `MLFQ_CONTINUE_Q${runningLevel}`,
        };
      } else {
        // Preempt current running process and return it to the head of its queue
        runningPcb.state = 'READY';
        this.queues[runningLevel].enqueueHead(runningPcb);
      }
    }

    // Strict priority dequeue: Q0 -> Q1 -> Q2
    let nextPcb: ProcessControlBlock | null = null;
    let selectedLevel = 0;

    for (let lvl = 0; lvl <= 2; lvl++) {
      if (!this.queues[lvl].isEmpty()) {
        nextPcb = this.queues[lvl].dequeue();
        selectedLevel = lvl;
        break;
      }
    }

    if (!nextPcb) {
      return {
        nextProcess: null,
        isContextSwitch: false,
        selectedQuantum: this.params.q0Quantum,
        preemptedProcess: null,
        reason: 'MLFQ_CPU_IDLE',
      };
    }

    nextPcb.state = 'RUNNING';
    nextPcb.continuousWaitTime = 0;
    const selectedQuantum = this.getQuantumForLevel(selectedLevel);

    const isContextSwitch = runningPcb ? runningPcb.pid !== nextPcb.pid : false;
    if (isContextSwitch) {
      nextPcb.contextSwitchCount += 1;
    }

    return {
      nextProcess: nextPcb,
      isContextSwitch,
      selectedQuantum,
      preemptedProcess: runningPcb && runningPcb.state !== 'TERMINATED' && runningPcb.state !== 'WAITING' ? runningPcb : null,
      reason: `MLFQ_DISPATCH_Q${selectedLevel}`,
    };
  }

  public onQuantumExpired(process: IProcessControlBlock, _context: ContextSnapshot): void {
    const pcb = process as ProcessControlBlock;
    pcb.state = 'READY';
    pcb.currentQuantumUsed = 0;
    // Demote to lower queue (Q0 -> Q1 -> Q2)
    pcb.currentQueueLevel = Math.min(2, pcb.currentQueueLevel + 1);
    this.queues[pcb.currentQueueLevel].enqueue(pcb);
  }

  public onProcessYield(process: IProcessControlBlock, _context: ContextSnapshot): void {
    const pcb = process as ProcessControlBlock;
    pcb.currentQuantumUsed = 0;
    // Rule: I/O yield preserves current queue level
  }

  public onProcessTerminated(process: IProcessControlBlock): void {
    const pcb = process as ProcessControlBlock;
    pcb.state = 'TERMINATED';
    for (const q of this.queues) {
      q.remove(pcb.pid);
    }
  }

  public getQueueSnapshot(): {
    q0: number[];
    q1: number[];
    q2: number[];
    allReadyPids: number[];
  } {
    return {
      q0: this.queues[0].getPids(),
      q1: this.queues[1].getPids(),
      q2: this.queues[2].getPids(),
      allReadyPids: [
        ...this.queues[0].getPids(),
        ...this.queues[1].getPids(),
        ...this.queues[2].getPids(),
      ],
    };
  }

  private getQuantumForLevel(level: number): number {
    switch (level) {
      case 0: return this.params.q0Quantum;
      case 1: return this.params.q1Quantum;
      case 2: return this.params.q2Quantum;
      default: return this.params.q0Quantum;
    }
  }
}
