import { ProcessControlBlock } from '../core/PCB';
import { SchedulerDecision } from '../../types/scheduler';

export type DispatcherState = 'IDLE' | 'EXECUTING' | 'CONTEXT_SWITCHING';

export interface DispatcherTickResult {
  state: DispatcherState;
  executedPid: number | null;
  burstFinished: boolean;
  quantumExpired: boolean;
  isContextSwitch: boolean;
  processTerminated: boolean;
  processYieldedIo: boolean;
  activeQuantum: number;
}

export class Dispatcher {
  private currentRunning: ProcessControlBlock | null;
  private currentQuantum: number;
  private contextSwitchTicksRemaining: number;
  private contextSwitchCost: number;
  private pendingDecision: SchedulerDecision | null;

  constructor(contextSwitchCost: number = 1) {
    this.currentRunning = null;
    this.currentQuantum = 2;
    this.contextSwitchTicksRemaining = 0;
    this.contextSwitchCost = contextSwitchCost;
    this.pendingDecision = null;
  }

  public setContextSwitchCost(cost: number): void {
    this.contextSwitchCost = cost;
  }

  public getCurrentRunning(): ProcessControlBlock | null {
    return this.currentRunning;
  }

  public applyDecision(decision: SchedulerDecision, currentTick: number): void {
    const nextPcb = decision.nextProcess as ProcessControlBlock | null;

    if (decision.isContextSwitch && nextPcb) {
      this.pendingDecision = decision;
      this.contextSwitchTicksRemaining = this.contextSwitchCost;
      this.currentQuantum = decision.selectedQuantum;
    } else {
      this.currentRunning = nextPcb;
      this.currentQuantum = decision.selectedQuantum;
      this.pendingDecision = null;
      this.contextSwitchTicksRemaining = 0;

      if (this.currentRunning) {
        this.currentRunning.state = 'RUNNING';
        if (this.currentRunning.firstResponseTick === null) {
          this.currentRunning.firstResponseTick = currentTick;
        }
      }
    }
  }

  public tick(currentTick: number): DispatcherTickResult {
    // 1. Context switch is in progress
    if (this.contextSwitchTicksRemaining > 0) {
      this.contextSwitchTicksRemaining -= 1;
      
      // Check if context switch completed during this tick
      if (this.contextSwitchTicksRemaining === 0 && this.pendingDecision) {
        this.currentRunning = this.pendingDecision.nextProcess as ProcessControlBlock | null;
        this.currentQuantum = this.pendingDecision.selectedQuantum;
        this.pendingDecision = null;

        if (this.currentRunning) {
          this.currentRunning.state = 'RUNNING';
          if (this.currentRunning.firstResponseTick === null) {
            this.currentRunning.firstResponseTick = currentTick;
          }
        }
      }

      return {
        state: 'CONTEXT_SWITCHING',
        executedPid: null,
        burstFinished: false,
        quantumExpired: false,
        isContextSwitch: true,
        processTerminated: false,
        processYieldedIo: false,
        activeQuantum: this.currentQuantum,
      };
    }

    // 2. CPU is Idle
    if (!this.currentRunning) {
      return {
        state: 'IDLE',
        executedPid: null,
        burstFinished: false,
        quantumExpired: false,
        isContextSwitch: false,
        processTerminated: false,
        processYieldedIo: false,
        activeQuantum: this.currentQuantum,
      };
    }

    // 3. Execute 1 CPU tick for current running process
    const { burstFinished } = this.currentRunning.advanceBurst(1);

    if (burstFinished) {
      if (this.currentRunning.isCompleted()) {
        this.currentRunning.state = 'TERMINATED';
        this.currentRunning.completionTick = currentTick;
        const terminatedPid = this.currentRunning.pid;
        this.currentRunning = null;

        return {
          state: 'EXECUTING',
          executedPid: terminatedPid,
          burstFinished: true,
          quantumExpired: false,
          isContextSwitch: false,
          processTerminated: true,
          processYieldedIo: false,
          activeQuantum: this.currentQuantum,
        };
      } else {
        // Yield for simulated I/O
        this.currentRunning.state = 'WAITING';
        const yieldingPid = this.currentRunning.pid;
        this.currentRunning = null;

        return {
          state: 'EXECUTING',
          executedPid: yieldingPid,
          burstFinished: true,
          quantumExpired: false,
          isContextSwitch: false,
          processTerminated: false,
          processYieldedIo: true,
          activeQuantum: this.currentQuantum,
        };
      }
    }

    // Check if time-quantum was exhausted on this tick
    const quantumExpired = this.currentRunning.currentQuantumUsed >= this.currentQuantum;

    return {
      state: 'EXECUTING',
      executedPid: this.currentRunning.pid,
      burstFinished: false,
      quantumExpired,
      isContextSwitch: false,
      processTerminated: false,
      processYieldedIo: false,
      activeQuantum: this.currentQuantum,
    };
  }

  public reset(): void {
    this.currentRunning = null;
    this.currentQuantum = 2;
    this.contextSwitchTicksRemaining = 0;
    this.pendingDecision = null;
  }
}
