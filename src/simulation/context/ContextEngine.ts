import { 
  ContextAuditLog, 
  ContextSignals, 
  ContextSnapshot, 
  ContextState, 
  LearningGoal 
} from '../../types/context';
import { IProcessControlBlock } from '../../types/process';

export class ContextEngine {
  private activeGoal: LearningGoal;
  private currentScore: number;
  private currentState: ContextState;
  private recentLogs: ContextAuditLog[];

  // Internal telemetry counters
  private consecutiveFocusTicks: number;
  private lastActivePid: number | null;
  private contextSwitchWindow: number[]; // timestamps of recent context switches
  private consecutiveIdleTicks: number;

  constructor(initialGoal: LearningGoal = 'PROGRAMMING', initialScore: number = 80) {
    this.activeGoal = initialGoal;
    this.currentScore = Math.max(0, Math.min(100, initialScore));
    this.currentState = this.scoreToState(this.currentScore);
    this.recentLogs = [];

    this.consecutiveFocusTicks = 0;
    this.lastActivePid = null;
    this.contextSwitchWindow = [];
    this.consecutiveIdleTicks = 0;

    this.addAuditLog(0, this.currentScore, this.currentScore, this.currentState, this.currentState, 'INIT', `Session initialized dynamically with learning goal: ${initialGoal}`);
  }

  public setLearningGoal(goal: LearningGoal, tick: number): void {
    if (this.activeGoal !== goal) {
      const prev = this.activeGoal;
      this.activeGoal = goal;
      this.consecutiveFocusTicks = 0;
      this.evaluate(null, false, tick, `Active goal changed from ${prev} to ${goal}`);
    }
  }

  public getActiveGoal(): LearningGoal {
    return this.activeGoal;
  }

  public getSnapshot(signals: ContextSignals): ContextSnapshot {
    return {
      score: Math.round(this.currentScore * 10) / 10,
      state: this.currentState,
      activeGoal: this.activeGoal,
      signals,
      recentLogs: [...this.recentLogs].slice(-50), // keep latest 50 logs
    };
  }

  public evaluate(
    runningProcess: IProcessControlBlock | null,
    isContextSwitch: boolean,
    currentTick: number,
    manualEventReason?: string
  ): ContextSnapshot {
    // 1. Update internal activity telemetry
    if (isContextSwitch) {
      this.contextSwitchWindow.push(currentTick);
    }
    // Retain only context switches in last 20 ticks
    this.contextSwitchWindow = this.contextSwitchWindow.filter(t => currentTick - t <= 20);

    if (runningProcess) {
      this.consecutiveIdleTicks = 0;
      if (runningProcess.goalAffinity >= 0.7) {
        this.consecutiveFocusTicks += 1;
      } else if (runningProcess.goalAffinity < 0) {
        this.consecutiveFocusTicks = Math.max(0, this.consecutiveFocusTicks - 2);
      }
      this.lastActivePid = runningProcess.pid;
    } else {
      this.consecutiveIdleTicks += 1;
      this.consecutiveFocusTicks = Math.max(0, this.consecutiveFocusTicks - 1);
    }

    // 2. Compute normalized signals
    // S_goal: [-1.0, 1.0] -> normalize running process affinity or 0 if idle
    const sGoal = runningProcess ? runningProcess.goalAffinity : 0.0;

    // S_focus: [0.0, 1.0] -> based on continuous focused execution up to 30 ticks
    const sFocus = Math.min(1.0, this.consecutiveFocusTicks / 30);

    // S_switch: [0.0, 1.0] -> 1.0 minus penalty for rapid switches in 20-tick window (max 5 switches)
    const sSwitch = Math.max(0.0, 1.0 - (this.contextSwitchWindow.length / 5));

    // S_idle: [0.0, 1.0] -> degrades if idle exceeds 20 ticks
    const sIdle = Math.max(0.0, 1.0 - (this.consecutiveIdleTicks / 20));

    const signals: ContextSignals = {
      activeGoalMatch: Math.round(sGoal * 100) / 100,
      focusContinuity: Math.round(sFocus * 100) / 100,
      switchingVelocity: Math.round(sSwitch * 100) / 100,
      idleDegradation: Math.round(sIdle * 100) / 100,
    };

    // 3. Calculate weighted score
    // C_t = 100 * (0.45 * ((S_goal + 1)/2) + 0.25 * S_focus + 0.20 * S_switch + 0.10 * S_idle)
    const normalizedGoal = (sGoal + 1.0) / 2.0;
    const rawScore = 100.0 * (
      0.45 * normalizedGoal +
      0.25 * sFocus +
      0.20 * sSwitch +
      0.10 * sIdle
    );

    const clampedScore = Math.max(0.0, Math.min(100.0, rawScore));
    const previousScore = this.currentScore;
    const previousState = this.currentState;

    this.currentScore = clampedScore;
    this.currentState = this.scoreToState(clampedScore);

    // 4. Check for state transition or significant change
    if (this.currentState !== previousState || manualEventReason) {
      const triggeringEvent = manualEventReason ? 'MANUAL_EVENT' : 'STATE_TRANSITION';
      const reason = manualEventReason 
        ? manualEventReason 
        : `Context shifted from ${previousState} (${Math.round(previousScore)}) to ${this.currentState} (${Math.round(clampedScore)}) [Goal: ${Math.round(normalizedGoal * 100)}%, Focus: ${Math.round(sFocus * 100)}%, Switching: ${this.contextSwitchWindow.length} shifts]`;

      this.addAuditLog(
        currentTick,
        Math.round(previousScore * 10) / 10,
        Math.round(clampedScore * 10) / 10,
        previousState,
        this.currentState,
        triggeringEvent,
        reason
      );
    }

    return this.getSnapshot(signals);
  }

  private scoreToState(score: number): ContextState {
    if (score >= 80.0) return 'FOCUSED';
    if (score >= 60.0) return 'STABLE';
    if (score >= 40.0) return 'DRIFT';
    return 'DISTRACTED';
  }

  private addAuditLog(
    tick: number,
    previousScore: number,
    newScore: number,
    previousState: ContextState,
    newState: ContextState,
    triggeringEvent: string,
    reason: string
  ): void {
    const log: ContextAuditLog = {
      id: `log-${tick}-${Math.random().toString(36).slice(2, 7)}`,
      tick,
      previousScore,
      newScore,
      previousState,
      newState,
      triggeringEvent,
      reason,
    };
    this.recentLogs.push(log);
  }

  public reset(initialGoal: LearningGoal = 'PROGRAMMING', initialScore: number = 80): void {
    this.activeGoal = initialGoal;
    this.currentScore = Math.max(0, Math.min(100, initialScore));
    this.currentState = this.scoreToState(this.currentScore);
    this.recentLogs = [];
    this.consecutiveFocusTicks = 0;
    this.lastActivePid = null;
    this.contextSwitchWindow = [];
    this.consecutiveIdleTicks = 0;
    this.addAuditLog(0, this.currentScore, this.currentScore, this.currentState, this.currentState, 'RESET', `Context Engine reset dynamically to ${initialGoal}`);
  }
}
