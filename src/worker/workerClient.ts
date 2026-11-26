import { WorkerInboundMessage, WorkerOutboundMessage } from '../types/messages';
import { AlgorithmType, TunableParameters } from '../types/scheduler';
import { WorkloadTrace } from '../types/trace';
import { LearningGoal } from '../types/context';

export type SnapshotListener = (snapshot: Extract<WorkerOutboundMessage, { type: 'TICK_SNAPSHOT' }>['payload']) => void;
export type BenchmarkListener = (report: Extract<WorkerOutboundMessage, { type: 'BENCHMARK_COMPLETED' }>['payload']['report']) => void;
export type CompletionListener = (data: Extract<WorkerOutboundMessage, { type: 'SIMULATION_COMPLETED' }>['payload']) => void;
export type ErrorListener = (error: Extract<WorkerOutboundMessage, { type: 'SIMULATION_ERROR' }>['payload']) => void;

export class WorkerClient {
  private worker: Worker | null = null;
  private snapshotListeners: Set<SnapshotListener> = new Set();
  private benchmarkListeners: Set<BenchmarkListener> = new Set();
  private completionListeners: Set<CompletionListener> = new Set();
  private errorListeners: Set<ErrorListener> = new Set();

  constructor() {
    this.initWorker();
  }

  private initWorker(): void {
    if (typeof window !== 'undefined') {
      this.worker = new Worker(
        new URL('./simulation.worker.ts', import.meta.url),
        { type: 'module' }
      );

      this.worker.onmessage = (event: MessageEvent<WorkerOutboundMessage>) => {
        const msg = event.data;
        switch (msg.type) {
          case 'TICK_SNAPSHOT':
            this.snapshotListeners.forEach(fn => fn(msg.payload));
            break;
          case 'BENCHMARK_COMPLETED':
            this.benchmarkListeners.forEach(fn => fn(msg.payload.report));
            break;
          case 'SIMULATION_COMPLETED':
            this.completionListeners.forEach(fn => fn(msg.payload));
            break;
          case 'SIMULATION_ERROR':
            this.errorListeners.forEach(fn => fn(msg.payload));
            break;
        }
      };
    }
  }

  public post(msg: WorkerInboundMessage): void {
    if (this.worker) {
      this.worker.postMessage(msg);
    }
  }

  public loadTrace(trace: WorkloadTrace): void {
    this.post({ type: 'LOAD_TRACE', payload: { trace } });
  }

  public startSimulation(algorithm: AlgorithmType, speedMs: number): void {
    this.post({ type: 'START_SIMULATION', payload: { algorithm, speedMs } });
  }

  public pause(): void {
    this.post({ type: 'PAUSE_SIMULATION' });
  }

  public resume(): void {
    this.post({ type: 'RESUME_SIMULATION' });
  }

  public step(): void {
    this.post({ type: 'STEP_TICK' });
  }

  public reset(): void {
    this.post({ type: 'RESET_SIMULATION' });
  }

  public setSpeed(speedMs: number): void {
    this.post({ type: 'SET_SPEED', payload: { speedMs } });
  }

  public setGoal(goal: LearningGoal): void {
    this.post({ type: 'SET_GOAL', payload: { goal } });
  }

  public updateTunableParams(params: Partial<TunableParameters>): void {
    this.post({ type: 'UPDATE_TUNABLE_PARAMS', payload: { params } });
  }

  public runBenchmark(trace: WorkloadTrace): void {
    this.post({ type: 'RUN_BATCH_BENCHMARK', payload: { trace } });
  }

  public onSnapshot(fn: SnapshotListener): () => void {
    this.snapshotListeners.add(fn);
    return () => this.snapshotListeners.delete(fn);
  }

  public onBenchmark(fn: BenchmarkListener): () => void {
    this.benchmarkListeners.add(fn);
    return () => this.benchmarkListeners.delete(fn);
  }

  public onCompletion(fn: CompletionListener): () => void {
    this.completionListeners.add(fn);
    return () => this.completionListeners.delete(fn);
  }

  public onError(fn: ErrorListener): () => void {
    this.errorListeners.add(fn);
    return () => this.errorListeners.delete(fn);
  }

  public terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}

export const workerClient = new WorkerClient();
