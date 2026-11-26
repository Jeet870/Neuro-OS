import { create } from 'zustand';
import { AlgorithmType, TunableParameters, DEFAULT_TUNABLE_PARAMETERS } from '../types/scheduler';
import { WorkloadTrace } from '../types/trace';
import { ContextSnapshot, LearningGoal } from '../types/context';
import { IProcessControlBlock } from '../types/process';
import { AlgorithmMetricsReport, GanttSegment, ScenarioComparisonReport } from '../types/metrics';
import { SCENARIO_A, BUILTIN_SCENARIOS } from '../simulation/benchmarks/BenchmarkScenarios';
import { RandomWorkloadGenerator } from '../simulation/benchmarks/RandomWorkloadGenerator';
import { workerClient } from '../worker/workerClient';

export interface SimulationStore {
  // Active state
  currentTick: number;
  isRunning: boolean;
  isTerminated: boolean;
  speedMs: number;
  activeAlgorithm: AlgorithmType;
  selectedGoal: LearningGoal;
  tunableParams: TunableParameters;
  currentTrace: WorkloadTrace;
  
  // Dynamic snapshot
  activePid: number | null;
  isContextSwitch: boolean;
  queues: {
    q0: number[];
    q1: number[];
    q2: number[];
    waiting: number[];
    suspended: number[];
  };
  pcbs: IProcessControlBlock[];
  ganttHistory: GanttSegment[];
  contextSnapshot: ContextSnapshot;
  liveMetrics: {
    wAvg: number;
    tAvg: number;
    rCritAvg: number;
    contextSwitches: number;
    cpuUtilization: number;
  };

  // Completed reports
  finalReport: AlgorithmMetricsReport | null;
  benchmarkReport: ScenarioComparisonReport | null;
  isBenchmarkRunning: boolean;
  selectedScenarioId: string;

  // Active view tab
  activeTab: 'STUDIO' | 'BENCHMARKS' | 'TRACE_BUILDER' | 'THEORY';

  // Actions
  init: () => void;
  setTab: (tab: 'STUDIO' | 'BENCHMARKS' | 'TRACE_BUILDER' | 'THEORY') => void;
  setAlgorithm: (algorithm: AlgorithmType) => void;
  setGoal: (goal: LearningGoal) => void;
  setSpeed: (speedMs: number) => void;
  loadTrace: (trace: WorkloadTrace) => void;
  loadScenarioById: (scenarioId: string) => void;
  updateTunableParams: (params: Partial<TunableParameters>) => void;
  start: () => void;
  pause: () => void;
  togglePlay: () => void;
  step: () => void;
  reset: () => void;
  runBenchmark: (scenarioId?: string) => void;
  runRandomBenchmark: (goal?: LearningGoal) => void;
  loadRandomWorkload: (goal?: LearningGoal) => void;
}

export const useSimulationStore = create<SimulationStore>((set, get) => ({
  currentTick: 0,
  isRunning: false,
  isTerminated: false,
  speedMs: 200,
  activeAlgorithm: 'CA_MLFQ',
  selectedGoal: 'PROGRAMMING',
  tunableParams: { ...DEFAULT_TUNABLE_PARAMETERS },
  currentTrace: SCENARIO_A,

  activePid: null,
  isContextSwitch: false,
  queues: {
    q0: [],
    q1: [],
    q2: [],
    waiting: [],
    suspended: [],
  },
  pcbs: [],
  ganttHistory: [],
  contextSnapshot: {
    score: 85,
    state: 'FOCUSED',
    activeGoal: 'PROGRAMMING',
    signals: {
      activeGoalMatch: 0.9,
      focusContinuity: 0.8,
      switchingVelocity: 1.0,
      idleDegradation: 1.0,
    },
    recentLogs: [],
  },
  liveMetrics: {
    wAvg: 0,
    tAvg: 0,
    rCritAvg: 0,
    contextSwitches: 0,
    cpuUtilization: 0,
  },

  finalReport: null,
  benchmarkReport: null,
  isBenchmarkRunning: false,
  selectedScenarioId: 'scenario-b',

  activeTab: 'STUDIO',

  init: () => {
    workerClient.onSnapshot((payload) => {
      set({
        currentTick: payload.tick,
        activePid: payload.activePid,
        isContextSwitch: payload.isContextSwitch,
        contextSnapshot: payload.context,
        queues: payload.queues,
        pcbs: payload.pcbs,
        ganttHistory: payload.ganttHistory,
        liveMetrics: payload.liveMetrics,
        isTerminated: payload.isTerminated,
        isRunning: payload.isTerminated ? false : get().isRunning,
      });
    });

    workerClient.onCompletion((data) => {
      set({
        isRunning: false,
        isTerminated: true,
        finalReport: data.finalReport,
        ganttHistory: data.ganttHistory,
      });
    });

    workerClient.onBenchmark((report) => {
      set({
        isBenchmarkRunning: false,
        benchmarkReport: report,
      });
    });

    // Load default trace
    workerClient.loadTrace(SCENARIO_A);
  },

  setTab: (tab) => set({ activeTab: tab }),

  setAlgorithm: (algorithm) => {
    set({ activeAlgorithm: algorithm, isRunning: false, finalReport: null });
    workerClient.pause();
    workerClient.loadTrace(get().currentTrace);
  },

  setGoal: (goal) => {
    set({ selectedGoal: goal });
    workerClient.setGoal(goal);
  },

  setSpeed: (speedMs) => {
    set({ speedMs });
    workerClient.setSpeed(speedMs);
  },

  loadTrace: (trace) => {
    set({
      currentTrace: trace,
      selectedGoal: trace.learningGoal,
      isRunning: false,
      isTerminated: false,
      finalReport: null,
    });
    workerClient.loadTrace(trace);
  },

  loadScenarioById: (scenarioId) => {
    const sc = BUILTIN_SCENARIOS.find(s => s.traceId === scenarioId);
    if (sc) {
      set({ selectedScenarioId: scenarioId });
      get().loadTrace(sc);
    }
  },

  updateTunableParams: (params) => {
    const updated = { ...get().tunableParams, ...params };
    set({ tunableParams: updated });
    workerClient.updateTunableParams(params);
  },

  start: () => {
    set({ isRunning: true, isTerminated: false });
    workerClient.startSimulation(get().activeAlgorithm, get().speedMs);
  },

  pause: () => {
    set({ isRunning: false });
    workerClient.pause();
  },

  togglePlay: () => {
    const { isRunning, isTerminated, start, pause, reset } = get();
    if (isTerminated) {
      reset();
      start();
    } else if (isRunning) {
      pause();
    } else {
      start();
    }
  },

  step: () => {
    set({ isRunning: false });
    workerClient.step();
  },

  reset: () => {
    set({ isRunning: false, isTerminated: false, finalReport: null });
    workerClient.reset();
  },

  runBenchmark: (scenarioId) => {
    const targetId = scenarioId || get().selectedScenarioId;
    const sc = BUILTIN_SCENARIOS.find(s => s.traceId === targetId) || get().currentTrace;
    set({ isBenchmarkRunning: true, selectedScenarioId: targetId });
    workerClient.runBenchmark(sc);
  },

  runRandomBenchmark: (goal) => {
    const randomTrace = RandomWorkloadGenerator.generate({ learningGoal: goal || get().selectedGoal });
    set({ isBenchmarkRunning: true, selectedScenarioId: randomTrace.traceId });
    workerClient.runBenchmark(randomTrace);
  },

  loadRandomWorkload: (goal) => {
    const randomTrace = RandomWorkloadGenerator.generate({ learningGoal: goal || get().selectedGoal });
    get().loadTrace(randomTrace);
  },
}));
