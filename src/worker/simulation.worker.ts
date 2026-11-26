import { WorkerInboundMessage, WorkerOutboundMessage } from '../types/messages';
import { SimulationEngine } from '../simulation/engine/SimulationEngine';
import { BenchmarkRunner } from '../simulation/benchmarks/BenchmarkRunner';
import { SCENARIO_A } from '../simulation/benchmarks/BenchmarkScenarios';

let engine: SimulationEngine = new SimulationEngine('CA_MLFQ');
let timerId: number | null = null;
let currentSpeedMs: number = 200; // ms per tick

// Pre-load default scenario A
engine.loadTrace(SCENARIO_A);

function postSnapshot(isTerminated: boolean = false): void {
  const snapshot = engine.step(); // or current snapshot
  const pcbs = engine.getAllProcesses();
  const gantt = engine.getGanttHistory();
  const metrics = engine.getMetricsReport();

  const msg: WorkerOutboundMessage = {
    type: 'TICK_SNAPSHOT',
    payload: {
      tick: snapshot.tick,
      activePid: snapshot.activePid,
      isContextSwitch: snapshot.isContextSwitch,
      context: snapshot.context,
      queues: snapshot.queues,
      pcbs,
      ganttHistory: gantt,
      liveMetrics: {
        wAvg: metrics.averageWaitingTime,
        tAvg: metrics.averageTurnaroundTime,
        rCritAvg: metrics.criticalResponseTime,
        contextSwitches: metrics.totalContextSwitches,
        cpuUtilization: metrics.cpuUtilization,
      },
      isTerminated: snapshot.isFinished || isTerminated,
    },
  };
  self.postMessage(msg);
}

function startLoop(): void {
  if (timerId !== null) {
    clearInterval(timerId);
    timerId = null;
  }

  const loop = () => {
    const stepResult = engine.step();
    postSnapshot(stepResult.isFinished);

    if (stepResult.isFinished) {
      if (timerId !== null) {
        clearInterval(timerId);
        timerId = null;
      }
      const finalReport = engine.getMetricsReport();
      const gantt = engine.getGanttHistory();
      const completedMsg: WorkerOutboundMessage = {
        type: 'SIMULATION_COMPLETED',
        payload: {
          finalReport,
          ganttHistory: gantt,
        },
      };
      self.postMessage(completedMsg);
    }
  };

  if (currentSpeedMs === 0) {
    // Max speed burst
    while (!engine.step().isFinished) {
      // Loop until complete
    }
    postSnapshot(true);
  } else {
    timerId = self.setInterval(loop, currentSpeedMs);
  }
}

function pauseLoop(): void {
  if (timerId !== null) {
    clearInterval(timerId);
    timerId = null;
  }
}

self.onmessage = (event: MessageEvent<WorkerInboundMessage>) => {
  const message = event.data;

  try {
    switch (message.type) {
      case 'LOAD_TRACE': {
        pauseLoop();
        engine.loadTrace(message.payload.trace);
        postSnapshot(false);
        break;
      }

      case 'START_SIMULATION': {
        pauseLoop();
        currentSpeedMs = message.payload.speedMs;
        engine.setAlgorithm(message.payload.algorithm);
        startLoop();
        break;
      }

      case 'PAUSE_SIMULATION': {
        pauseLoop();
        break;
      }

      case 'RESUME_SIMULATION': {
        startLoop();
        break;
      }

      case 'STEP_TICK': {
        pauseLoop();
        const res = engine.step();
        postSnapshot(res.isFinished);
        break;
      }

      case 'RESET_SIMULATION': {
        pauseLoop();
        engine.reset();
        postSnapshot(false);
        break;
      }

      case 'SET_SPEED': {
        currentSpeedMs = message.payload.speedMs;
        if (timerId !== null) {
          startLoop();
        }
        break;
      }

      case 'SET_GOAL': {
        engine.setLearningGoal(message.payload.goal);
        postSnapshot(false);
        break;
      }

      case 'UPDATE_TUNABLE_PARAMS': {
        engine.updateTunableParameters(message.payload.params);
        postSnapshot(false);
        break;
      }

      case 'RUN_BATCH_BENCHMARK': {
        pauseLoop();
        const report = BenchmarkRunner.runScenario(message.payload.trace);
        const benchmarkMsg: WorkerOutboundMessage = {
          type: 'BENCHMARK_COMPLETED',
          payload: { report },
        };
        self.postMessage(benchmarkMsg);
        break;
      }

      default:
        break;
    }
  } catch (error: any) {
    const errorMsg: WorkerOutboundMessage = {
      type: 'SIMULATION_ERROR',
      payload: {
        message: error?.message || 'Simulation runtime error',
        details: String(error?.stack || error),
      },
    };
    self.postMessage(errorMsg);
  }
};
