import { 
  Burst, 
  IProcessControlBlock, 
  ProcessCategory, 
  ProcessState, 
  ProcessTraceInput 
} from '../../types/process';
import { LearningGoal } from '../../types/context';
import { AffinityEngine } from '../context/AffinityEngine';

export class ProcessControlBlock implements IProcessControlBlock {
  public readonly pid: number;
  public readonly name: string;
  public readonly processCategory: ProcessCategory;
  public readonly arrivalTime: number;
  public readonly basePriority: number;
  public readonly memoryPages: number;
  public readonly deadline: number | null;
  public readonly initialBursts: Burst[];

  // Dynamic Runtime State
  public state: ProcessState;
  public currentQueueLevel: number;
  public bursts: Burst[];
  public currentBurstIndex: number;

  // Dynamic Priority & Context
  public effectivePriority: number;
  public goalAffinity: number;

  // Execution & Telemetry Counters
  public totalCpuTime: number;
  public totalIoTime: number;
  public totalWaitTime: number;
  public continuousWaitTime: number;
  public maxContinuousWait: number;
  public timeInCurrentQueue: number;
  public currentQuantumUsed: number;
  public effectiveMaxWaitThreshold: number;

  // Academic Metrics Timestamps
  public firstResponseTick: number | null;
  public completionTick: number | null;
  public contextSwitchCount: number;

  constructor(input: ProcessTraceInput, defaultMaxAgingWait: number = 20, activeGoal: LearningGoal = 'PROGRAMMING') {
    this.pid = input.pid;
    this.name = input.name;
    this.processCategory = input.processCategory;
    this.goalAffinity = AffinityEngine.calculateAffinity(input.processCategory, activeGoal, input.goalAffinity);
    this.arrivalTime = input.arrivalTime;
    this.basePriority = input.basePriority;
    this.memoryPages = input.memoryPages;
    this.deadline = input.deadline ?? null;

    // Deep clone bursts
    this.initialBursts = input.burstSequence.map(b => ({
      type: b.type,
      duration: b.duration,
      remaining: b.duration,
    }));
    this.bursts = input.burstSequence.map(b => ({
      type: b.type,
      duration: b.duration,
      remaining: b.duration,
    }));

    this.state = 'NEW';
    this.currentQueueLevel = 0;
    this.currentBurstIndex = 0;
    this.effectivePriority = input.basePriority;

    this.totalCpuTime = 0;
    this.totalIoTime = 0;
    this.totalWaitTime = 0;
    this.continuousWaitTime = 0;
    this.maxContinuousWait = 0;
    this.timeInCurrentQueue = 0;
    this.currentQuantumUsed = 0;

    // Calculate initial effective max wait threshold:
    // For normal/neutral processes: maxAgingWait
    // For negative-affinity/distracting processes: maxAgingWait * 1.5
    this.effectiveMaxWaitThreshold = this.goalAffinity < 0
      ? Math.round(defaultMaxAgingWait * 1.5)
      : defaultMaxAgingWait;

    this.firstResponseTick = null;
    this.completionTick = null;
    this.contextSwitchCount = 0;
  }

  public getCurrentBurst(): Burst | null {
    if (this.currentBurstIndex < this.bursts.length) {
      return this.bursts[this.currentBurstIndex];
    }
    return null;
  }

  public isCompleted(): boolean {
    return this.currentBurstIndex >= this.bursts.length;
  }

  public advanceBurst(tickCount: number = 1): { burstFinished: boolean; type: 'CPU' | 'IO' | null } {
    const burst = this.getCurrentBurst();
    if (!burst) {
      return { burstFinished: true, type: null };
    }

    burst.remaining -= tickCount;
    if (burst.type === 'CPU') {
      this.totalCpuTime += tickCount;
      this.currentQuantumUsed += tickCount;
    } else {
      this.totalIoTime += tickCount;
    }

    if (burst.remaining <= 0) {
      const finishedType = burst.type;
      this.currentBurstIndex += 1;
      this.currentQuantumUsed = 0;
      return { burstFinished: true, type: finishedType };
    }

    return { burstFinished: false, type: burst.type };
  }

  public updateAgingThreshold(baseMaxAgingWait: number): void {
    this.effectiveMaxWaitThreshold = this.goalAffinity < 0
      ? Math.round(baseMaxAgingWait * 1.5)
      : baseMaxAgingWait;
  }

  public updateGoalAffinity(goal: LearningGoal, baseMaxAgingWait?: number): void {
    this.goalAffinity = AffinityEngine.calculateAffinity(this.processCategory, goal);
    if (baseMaxAgingWait !== undefined) {
      this.updateAgingThreshold(baseMaxAgingWait);
    }
  }

  public clone(): ProcessControlBlock {
    const clonePcb = Object.create(ProcessControlBlock.prototype);
    Object.assign(clonePcb, this, {
      initialBursts: this.initialBursts.map(b => ({ ...b })),
      bursts: this.bursts.map(b => ({ ...b })),
    });
    return clonePcb;
  }
}
