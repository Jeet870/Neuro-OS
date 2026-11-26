import { Clock } from '../core/Clock';
import { ProcessControlBlock } from '../core/PCB';
import { ContextEngine } from '../context/ContextEngine';
import { Dispatcher } from './Dispatcher';
import { IScheduler, AlgorithmType, TunableParameters, DEFAULT_TUNABLE_PARAMETERS } from '../../types/scheduler';
import { WorkloadTrace } from '../../types/trace';
import { LearningGoal, ContextSnapshot } from '../../types/context';
import { AlgorithmMetricsReport, GanttSegment } from '../../types/metrics';
import { MetricsCalculator } from '../metrics/MetricsCalculator';
import { AffinityEngine } from '../context/AffinityEngine';
import { RoundRobinScheduler } from '../schedulers/RoundRobinScheduler';
import { ClassicalMLFQScheduler } from '../schedulers/ClassicalMLFQScheduler';
import { CAMLFQScheduler } from '../schedulers/CAMLFQScheduler';

export class SimulationEngine {
  private clock: Clock;
  private scheduler: IScheduler;
  private contextEngine: ContextEngine;
  private dispatcher: Dispatcher;
  
  private allProcesses: ProcessControlBlock[];
  private waitingQueue: ProcessControlBlock[];
  private suspendedQueue: ProcessControlBlock[];
  
  private ganttHistory: GanttSegment[];
  private currentAlgorithm: AlgorithmType;
  private tunableParams: TunableParameters;
  private currentTrace: WorkloadTrace | null;

  // CPU telemetry counters
  private cpuBusyTicks: number;
  private cpuIdleTicks: number;
  private cpuContextSwitchTicks: number;
  private isFinished: boolean;

  constructor(
    algorithm: AlgorithmType = 'CA_MLFQ',
    params: TunableParameters = DEFAULT_TUNABLE_PARAMETERS
  ) {
    this.currentAlgorithm = algorithm;
    this.tunableParams = { ...params };
    this.clock = new Clock(0);
    this.contextEngine = new ContextEngine('PROGRAMMING');
    this.dispatcher = new Dispatcher(params.contextSwitchCost);

    this.scheduler = this.instantiateScheduler(algorithm, this.tunableParams);
    this.allProcesses = [];
    this.waitingQueue = [];
    this.suspendedQueue = [];
    this.ganttHistory = [];

    this.cpuBusyTicks = 0;
    this.cpuIdleTicks = 0;
    this.cpuContextSwitchTicks = 0;
    this.isFinished = false;
    this.currentTrace = null;
  }

  public loadTrace(trace: WorkloadTrace): void {
    this.currentTrace = trace;
    this.tunableParams = { ...DEFAULT_TUNABLE_PARAMETERS, ...trace.tunableParameters };
    this.reset();
  }

  public setAlgorithm(algorithm: AlgorithmType): void {
    this.currentAlgorithm = algorithm;
    this.scheduler = this.instantiateScheduler(algorithm, this.tunableParams);
    this.reset();
  }

  public setLearningGoal(goal: LearningGoal): void {
    // Dynamically recalculate goal affinity across all system processes
    for (const p of this.allProcesses) {
      p.updateGoalAffinity(goal, this.tunableParams.maxAgingWait);
    }
    this.contextEngine.setLearningGoal(goal, this.clock.getTick());
  }

  public updateTunableParameters(params: Partial<TunableParameters>): void {
    this.tunableParams = { ...this.tunableParams, ...params };
    this.dispatcher.setContextSwitchCost(this.tunableParams.contextSwitchCost);
    this.scheduler.init(this.tunableParams);
  }

  public reset(): void {
    this.clock.reset(0);
    const goal = this.currentTrace?.learningGoal || 'PROGRAMMING';
    const initialScore = this.currentTrace
      ? AffinityEngine.calculateInitialScore(this.currentTrace.processes, goal)
      : 80;
    this.contextEngine.reset(goal, initialScore);
    this.dispatcher.reset();
    this.dispatcher.setContextSwitchCost(this.tunableParams.contextSwitchCost);

    this.scheduler.init(this.tunableParams);
    this.waitingQueue = [];
    this.suspendedQueue = [];
    this.ganttHistory = [];

    this.cpuBusyTicks = 0;
    this.cpuIdleTicks = 0;
    this.cpuContextSwitchTicks = 0;
    this.isFinished = false;

    if (this.currentTrace) {
      this.allProcesses = this.currentTrace.processes.map(
        p => new ProcessControlBlock(p, this.tunableParams.maxAgingWait, goal)
      );
    } else {
      this.allProcesses = [];
    }
  }

  public step(): {
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
    isFinished: boolean;
  } {
    if (this.isFinished) {
      return this.getCurrentStateSnapshot();
    }

    const currentTick = this.clock.getTick();

    // 1. Process Admission: Find all processes arriving at currentTick with deterministic tie-breaking
    const arriving = this.allProcesses.filter(p => p.state === 'NEW' && p.arrivalTime === currentTick);
    arriving.sort((a, b) => {
      if (a.basePriority !== b.basePriority) return a.basePriority - b.basePriority;
      if (a.goalAffinity !== b.goalAffinity) return b.goalAffinity - a.goalAffinity;
      return a.pid - b.pid;
    });

    for (const process of arriving) {
      const contextSnapshot = this.contextEngine.getSnapshot({
        activeGoalMatch: 0,
        focusContinuity: 0,
        switchingVelocity: 0,
        idleDegradation: 0,
      });
      this.scheduler.admitProcess(process, contextSnapshot);
    }

    // 2. Advance Waiting Queue (I/O burst handling)
    const unblockedProcesses: ProcessControlBlock[] = [];
    for (let i = this.waitingQueue.length - 1; i >= 0; i--) {
      const waitingPcb = this.waitingQueue[i];
      const { burstFinished } = waitingPcb.advanceBurst(1);

      if (burstFinished) {
        this.waitingQueue.splice(i, 1);
        if (waitingPcb.isCompleted()) {
          waitingPcb.state = 'TERMINATED';
          waitingPcb.completionTick = currentTick;
          this.scheduler.onProcessTerminated(waitingPcb);
        } else {
          unblockedProcesses.push(waitingPcb);
        }
      }
    }

    // Re-admit unblocked processes with deterministic tie-breaking
    unblockedProcesses.sort((a, b) => {
      if (a.basePriority !== b.basePriority) return a.basePriority - b.basePriority;
      if (a.goalAffinity !== b.goalAffinity) return b.goalAffinity - a.goalAffinity;
      return a.pid - b.pid;
    });

    for (const unblocked of unblockedProcesses) {
      const contextSnapshot = this.contextEngine.getSnapshot({
        activeGoalMatch: 0,
        focusContinuity: 0,
        switchingVelocity: 0,
        idleDegradation: 0,
      });
      this.scheduler.admitProcess(unblocked, contextSnapshot);
    }

    // 3. Scheduler onTick (advance wait counters and aging)
    const currentContext = this.contextEngine.getSnapshot({
      activeGoalMatch: 0,
      focusContinuity: 0,
      switchingVelocity: 0,
      idleDegradation: 0,
    });
    this.scheduler.onTick(currentTick, currentContext);

    // 4. Scheduler selects next process
    const currentRunning = this.dispatcher.getCurrentRunning();
    const decision = this.scheduler.scheduleNext(currentRunning, currentContext, currentTick);

    // Apply decision to dispatcher
    this.dispatcher.applyDecision(decision, currentTick);

    // 5. Execute 1 CPU Tick via Dispatcher
    const tickResult = this.dispatcher.tick(currentTick);

    // 6. Update Context Engine with execution telemetry
    const activeRunningPcb = this.dispatcher.getCurrentRunning();
    const updatedContext = this.contextEngine.evaluate(
      activeRunningPcb,
      tickResult.isContextSwitch,
      currentTick
    );

    // 7. Handle Dispatcher Result Events
    if (tickResult.state === 'EXECUTING') {
      this.cpuBusyTicks += 1;
      this.appendGanttSegment(tickResult.executedPid, currentTick, false, activeRunningPcb?.currentQueueLevel);

      if (tickResult.processTerminated) {
        const termPcb = this.allProcesses.find(p => p.pid === tickResult.executedPid);
        if (termPcb) {
          this.scheduler.onProcessTerminated(termPcb);
        }
      } else if (tickResult.processYieldedIo) {
        const yieldPcb = this.allProcesses.find(p => p.pid === tickResult.executedPid);
        if (yieldPcb) {
          this.scheduler.onProcessYield(yieldPcb, updatedContext);
          this.waitingQueue.push(yieldPcb);
        }
      } else if (tickResult.quantumExpired) {
        if (activeRunningPcb) {
          this.scheduler.onQuantumExpired(activeRunningPcb, updatedContext);
        }
      }
    } else if (tickResult.state === 'CONTEXT_SWITCHING') {
      this.cpuContextSwitchTicks += 1;
      this.appendGanttSegment('CS', currentTick, true);
    } else {
      // IDLE
      this.cpuIdleTicks += 1;
      this.appendGanttSegment('IDLE', currentTick, false);
    }

    // 8. Advance Discrete Clock
    this.clock.tick();

    // 9. Check if all processes have arrived and terminated
    const allTerminated = this.allProcesses.length > 0 && this.allProcesses.every(
      p => p.state === 'TERMINATED'
    );
    if (allTerminated) {
      this.isFinished = true;
    }

    return this.getCurrentStateSnapshot();
  }

  public fastForwardToEnd(maxTicks: number = 10000): AlgorithmMetricsReport {
    while (!this.isFinished && this.clock.getTick() < maxTicks) {
      this.step();
    }
    return this.getMetricsReport();
  }

  public getMetricsReport(): AlgorithmMetricsReport {
    return MetricsCalculator.calculateReport(
      this.currentAlgorithm,
      this.clock.getTick(),
      this.cpuBusyTicks,
      this.cpuIdleTicks,
      this.cpuContextSwitchTicks,
      this.allProcesses,
      this.tunableParams
    );
  }

  public getGanttHistory(): GanttSegment[] {
    return [...this.ganttHistory];
  }

  public getAllProcesses(): ProcessControlBlock[] {
    return this.allProcesses.map(p => p.clone());
  }

  public getContextSnapshot(): ContextSnapshot {
    return this.contextEngine.evaluate(
      this.dispatcher.getCurrentRunning(),
      false,
      this.clock.getTick()
    );
  }

  private appendGanttSegment(
    pid: number | 'CS' | 'IDLE' | null,
    tick: number,
    isContextSwitch: boolean,
    queueLevel?: number
  ): void {
    const effectivePid = pid ?? 'IDLE';
    const lastSeg = this.ganttHistory[this.ganttHistory.length - 1];

    let name = 'Idle';
    if (effectivePid === 'CS') {
      name = 'Context Switch';
    } else if (typeof effectivePid === 'number') {
      const p = this.allProcesses.find(proc => proc.pid === effectivePid);
      name = p ? p.name : `PID ${effectivePid}`;
    }

    // Consolidate contiguous segments
    if (lastSeg && lastSeg.pid === effectivePid && lastSeg.isContextSwitch === isContextSwitch) {
      lastSeg.endTick = tick + 1;
    } else {
      this.ganttHistory.push({
        pid: effectivePid,
        name,
        startTick: tick,
        endTick: tick + 1,
        queueLevel,
        isContextSwitch,
      });
    }
  }

  private getCurrentStateSnapshot() {
    const queueSnapshot = this.scheduler.getQueueSnapshot();
    const active = this.dispatcher.getCurrentRunning();

    return {
      tick: this.clock.getTick(),
      activePid: active ? active.pid : null,
      isContextSwitch: this.ganttHistory.length > 0 && this.ganttHistory[this.ganttHistory.length - 1].isContextSwitch,
      context: this.getContextSnapshot(),
      queues: {
        q0: queueSnapshot.q0,
        q1: queueSnapshot.q1,
        q2: queueSnapshot.q2,
        waiting: this.waitingQueue.map(p => p.pid),
        suspended: this.suspendedQueue.map(p => p.pid),
      },
      isFinished: this.isFinished,
    };
  }

  private instantiateScheduler(
    algorithm: AlgorithmType,
    params: TunableParameters
  ): IScheduler {
    switch (algorithm) {
      case 'RR':
        return new RoundRobinScheduler(params);
      case 'MLFQ':
        return new ClassicalMLFQScheduler(params);
      case 'CA_MLFQ':
        return new CAMLFQScheduler(params);
      default:
        return new CAMLFQScheduler(params);
    }
  }
}
