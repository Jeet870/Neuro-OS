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

export class CAMLFQScheduler implements IScheduler {
  public readonly algorithm: AlgorithmType = 'CA_MLFQ';
  private queues: [ProcessQueue, ProcessQueue, ProcessQueue];
  private params: TunableParameters;

  constructor(params: TunableParameters = DEFAULT_TUNABLE_PARAMETERS) {
    this.params = { ...params };
    this.queues = [
      new ProcessQueue('CA_MLFQ_Q0_Critical', 0),
      new ProcessQueue('CA_MLFQ_Q1_Normal', 1),
      new ProcessQueue('CA_MLFQ_Q2_Throttled', 2),
    ];
  }

  public init(params: TunableParameters): void {
    this.params = { ...params };
    for (const q of this.queues) {
      q.clear();
    }
  }

  public admitProcess(process: IProcessControlBlock, context: ContextSnapshot): void {
    const pcb = process as ProcessControlBlock;
    pcb.state = 'READY';
    pcb.currentQuantumUsed = 0;

    // Update effective starvation aging threshold for inspection
    pcb.updateAgingThreshold(this.params.maxAgingWait);

    // Context-Aware Initial Queue Placement:
    // If process is strongly critical (affinity >= 0.7) and context is not DISTRACTED -> Q0
    if (pcb.goalAffinity >= 0.7 && context.state !== 'DISTRACTED') {
      pcb.currentQueueLevel = 0;
      this.queues[0].enqueue(pcb);
    } 
    // If process is distracting (affinity < 0) -> directly to Q2 (throttled)
    else if (pcb.goalAffinity < 0) {
      pcb.currentQueueLevel = 2;
      this.queues[2].enqueue(pcb);
    } 
    // Neutral or moderate process -> preserved level or Q1
    else {
      const targetLevel = Math.min(2, Math.max(0, pcb.currentQueueLevel));
      this.queues[targetLevel].enqueue(pcb);
    }
  }

  public onTick(_currentTick: number, _context: ContextSnapshot): void {
    // 1. Advance wait-time counters across all queues
    for (const q of this.queues) {
      q.onTickWait();
    }

    // 2. Strict Mathematical Aging & Anti-Starvation Mechanism:
    // Normal/Neutral processes: effective max wait = maxAgingWait
    // Distracting/Negative affinity: effective max wait = maxAgingWait * 1.5
    for (const q of [this.queues[2], this.queues[1]]) {
      for (const p of q.getAll()) {
        p.updateAgingThreshold(this.params.maxAgingWait);
        
        if (p.continuousWaitTime >= p.effectiveMaxWaitThreshold) {
          q.remove(p.pid);
          p.continuousWaitTime = 0;
          p.currentQueueLevel = 0;
          p.currentQuantumUsed = 0;
          // Elevate to head of Q0 to guarantee immediate CPU dispatch
          this.queues[0].enqueueHead(p);
        }
      }
    }
  }

  public scheduleNext(
    currentRunning: IProcessControlBlock | null,
    context: ContextSnapshot,
    currentTick: number
  ): SchedulerDecision {
    const runningPcb = currentRunning as ProcessControlBlock | null;

    // Check preemption: If running process is in Q1/Q2 and Q0 has ready critical tasks, preempt!
    if (runningPcb && runningPcb.state === 'RUNNING') {
      const runningLevel = runningPcb.currentQueueLevel;
      let higherReady = false;
      for (let lvl = 0; lvl < runningLevel; lvl++) {
        if (!this.queues[lvl].isEmpty()) {
          higherReady = true;
          break;
        }
      }

      if (!higherReady) {
        const selectedQuantum = this.calculateSelectedQuantum(runningPcb, runningLevel, context);
        return {
          nextProcess: runningPcb,
          isContextSwitch: false,
          selectedQuantum,
          preemptedProcess: null,
          reason: `CA_MLFQ_CONTINUE_Q${runningLevel}`,
        };
      } else {
        // Preempt and return to head of current queue
        runningPcb.state = 'READY';
        this.queues[runningLevel].enqueueHead(runningPcb);
      }
    }

    // Anti-Dominance Quota Reservation: Every 50 ticks, if Q2 has pending tasks, reserve a CPU slot
    const isQuotaWindow = (currentTick % 50 >= 45); // 10% quota reservation window
    if (isQuotaWindow && !this.queues[2].isEmpty() && this.queues[0].isEmpty()) {
      const nextPcb = this.queues[2].dequeue()!;
      nextPcb.state = 'RUNNING';
      nextPcb.continuousWaitTime = 0;
      const selectedQuantum = this.calculateSelectedQuantum(nextPcb, 2, context);
      const isContextSwitch = runningPcb ? runningPcb.pid !== nextPcb.pid : false;
      if (isContextSwitch) nextPcb.contextSwitchCount += 1;

      return {
        nextProcess: nextPcb,
        isContextSwitch,
        selectedQuantum,
        preemptedProcess: runningPcb && runningPcb.state !== 'TERMINATED' && runningPcb.state !== 'WAITING' ? runningPcb : null,
        reason: 'CA_MLFQ_QUOTA_FLOOR_RESERVATION',
      };
    }

    // Standard Strict Priority Selection: Q0 -> Q1 -> Q2
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
        reason: 'CA_MLFQ_CPU_IDLE',
      };
    }

    nextPcb.state = 'RUNNING';
    nextPcb.continuousWaitTime = 0;
    const selectedQuantum = this.calculateSelectedQuantum(nextPcb, selectedLevel, context);

    const isContextSwitch = runningPcb ? runningPcb.pid !== nextPcb.pid : false;
    if (isContextSwitch) {
      nextPcb.contextSwitchCount += 1;
    }

    return {
      nextProcess: nextPcb,
      isContextSwitch,
      selectedQuantum,
      preemptedProcess: runningPcb && runningPcb.state !== 'TERMINATED' && runningPcb.state !== 'WAITING' ? runningPcb : null,
      reason: `CA_MLFQ_DISPATCH_Q${selectedLevel}${selectedQuantum > this.params.q0Quantum ? '_BOOSTED' : ''}`,
    };
  }

  public onQuantumExpired(process: IProcessControlBlock, _context: ContextSnapshot): void {
    const pcb = process as ProcessControlBlock;
    pcb.state = 'READY';
    pcb.currentQuantumUsed = 0;
    // Standard demotion down to Q2
    pcb.currentQueueLevel = Math.min(2, pcb.currentQueueLevel + 1);
    this.queues[pcb.currentQueueLevel].enqueue(pcb);
  }

  public onProcessYield(process: IProcessControlBlock, _context: ContextSnapshot): void {
    const pcb = process as ProcessControlBlock;
    pcb.currentQuantumUsed = 0;
    // I/O yield preserves current queue level
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

  private calculateSelectedQuantum(
    process: ProcessControlBlock,
    level: number,
    context: ContextSnapshot
  ): number {
    // Context-Boosted Quantum Rule:
    // When context.state === 'FOCUSED' AND process.goalAffinity >= 0.7 in Q0
    if (level === 0 && context.state === 'FOCUSED' && process.goalAffinity >= 0.7) {
      return this.params.q0Quantum * this.params.focusedQuantumMultiplier;
    }

    switch (level) {
      case 0: return this.params.q0Quantum;
      case 1: return this.params.q1Quantum;
      case 2: return this.params.q2Quantum;
      default: return this.params.q0Quantum;
    }
  }
}
