export type ContextState = 'FOCUSED' | 'STABLE' | 'DRIFT' | 'DISTRACTED';

export type LearningGoal = 
  | 'PROGRAMMING' 
  | 'MATHEMATICS' 
  | 'LECTURE_VIEWING' 
  | 'RESEARCH_READING' 
  | 'GENERAL_STUDY';

export interface ContextSignals {
  activeGoalMatch: number;      // S_goal: [-1.0, 1.0]
  focusContinuity: number;      // S_focus: [0.0, 1.0]
  switchingVelocity: number;    // S_switch: [0.0, 1.0]
  idleDegradation: number;      // S_idle: [0.0, 1.0]
}

export interface ContextAuditLog {
  id: string;
  tick: number;
  previousScore: number;
  newScore: number;
  previousState: ContextState;
  newState: ContextState;
  triggeringEvent: string;
  reason: string;
}

export interface ContextSnapshot {
  score: number;                // 0 to 100
  state: ContextState;
  activeGoal: LearningGoal;
  signals: ContextSignals;
  recentLogs: ContextAuditLog[];
}
