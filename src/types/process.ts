export type ProcessState = 
  | 'NEW' 
  | 'READY' 
  | 'RUNNING' 
  | 'WAITING' 
  | 'SUSPENDED_READY' 
  | 'TERMINATED';

export type BurstType = 'CPU' | 'IO';

export interface Burst {
  type: BurstType;
  duration: number;        // Total duration in ticks
  remaining: number;       // Remaining duration in ticks
}

export type ProcessCategory = 
  | 'INTERACTIVE_DEV'      // e.g. VS Code, Terminal
  | 'COMPUTE_CRITICAL'     // e.g. Compiler, Code Execution
  | 'EDUCATIONAL_MEDIA'    // e.g. Online Lecture Stream
  | 'REFERENCE_DOCS'       // e.g. Documentation Browser, PDF
  | 'SYSTEM_DAEMON'        // e.g. Window Manager, Indexer
  | 'BACKGROUND_MEDIA'     // e.g. Spotify, Music
  | 'ENTERTAINMENT';       // e.g. Social media, Unrelated Video

export interface ProcessTraceInput {
  pid: number;
  name: string;
  processCategory: ProcessCategory;
  goalAffinity?: number;   // Optional override: -1.0 to +1.0. Dynamically computed by AffinityEngine if omitted.
  arrivalTime: number;     // Tick arrival
  basePriority: number;    // Base priority (0 = highest)
  memoryPages: number;     // Physical frame requirement
  deadline?: number | null;// Optional deadline in ticks
  burstSequence: { type: BurstType; duration: number }[];
}

export interface IProcessControlBlock {
  readonly pid: number;
  readonly name: string;
  readonly processCategory: ProcessCategory;
  readonly arrivalTime: number;
  readonly basePriority: number;
  readonly memoryPages: number;
  readonly deadline: number | null;
  readonly initialBursts: Burst[];

  // Dynamic Runtime State
  state: ProcessState;
  currentQueueLevel: number; // 0 = Q0, 1 = Q1, 2 = Q2
  bursts: Burst[];
  currentBurstIndex: number;
  
  // Dynamic Priority & Context
  effectivePriority: number;
  goalAffinity: number;
  
  // Execution & Telemetry Counters (in ticks)
  totalCpuTime: number;
  totalIoTime: number;
  totalWaitTime: number;
  continuousWaitTime: number; // Ticks spent waiting continuously (for aging)
  maxContinuousWait: number;  // Peak starvation wait spell experienced
  timeInCurrentQueue: number;
  currentQuantumUsed: number;
  
  // Starvation threshold for inspection
  effectiveMaxWaitThreshold: number;

  // Academic Metrics Timestamps
  firstResponseTick: number | null;
  completionTick: number | null;
  contextSwitchCount: number;
}
