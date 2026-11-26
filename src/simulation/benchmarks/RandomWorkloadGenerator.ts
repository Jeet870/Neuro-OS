import { WorkloadTrace } from '../../types/trace';
import { ProcessCategory, ProcessTraceInput, BurstType } from '../../types/process';
import { LearningGoal } from '../../types/context';
import { DEFAULT_TUNABLE_PARAMETERS } from '../../types/scheduler';
import { AffinityEngine } from '../context/AffinityEngine';

export interface WorkloadGeneratorOptions {
  processCount?: number;
  learningGoal?: LearningGoal;
  scenarioName?: string;
  includeDistractions?: boolean;
  minBursts?: number;
  maxBursts?: number;
  seed?: number;
}

const TEMPLATE_NAMES: Record<ProcessCategory, string[]> = {
  INTERACTIVE_DEV: ['VS Code (IDE)', 'Terminal CLI', 'Rust Analyzer LSP', 'Neovim Editor', 'Database GUI'],
  COMPUTE_CRITICAL: ['Cargo Build Engine', 'Webpack Compiler', 'Jupyter Kernel', 'Test Suite Runner', 'Matrix Math Solver'],
  EDUCATIONAL_MEDIA: ['Lecture Stream (1080p)', 'Course Video Player', 'Workshop Recording', 'Live Seminar'],
  REFERENCE_DOCS: ['MDN Web Docs', 'ArXiv PDF Viewer', 'Official API Spec', 'Course Syllabus PDF'],
  SYSTEM_DAEMON: ['File Indexer Daemon', 'Window Compositor', 'Sync Daemon', 'Audio Pipeline Server'],
  BACKGROUND_MEDIA: ['Lo-Fi Focus Radio', 'Ambient Music Player', 'Podcast Stream'],
  ENTERTAINMENT: ['Social Media Feed', 'Community Chat App', 'Short-form Video Tab', 'Casual Web Game'],
};

const ALL_GOALS: LearningGoal[] = [
  'PROGRAMMING',
  'MATHEMATICS',
  'LECTURE_VIEWING',
  'RESEARCH_READING',
  'GENERAL_STUDY',
];

export class RandomWorkloadGenerator {
  /**
   * Generates a completely randomized, valid WorkloadTrace where affinities
   * and burst schedules are generated dynamically rather than hardcoded.
   */
  public static generate(options: WorkloadGeneratorOptions = {}): WorkloadTrace {
    const goal: LearningGoal = options.learningGoal ?? ALL_GOALS[Math.floor(Math.random() * ALL_GOALS.length)];
    const count = options.processCount ?? (Math.floor(Math.random() * 3) + 4); // 4 to 6 processes
    const traceId = `procedural-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const scenarioName = options.scenarioName ?? `Dynamic Procedural Workload (${goal.replace('_', ' ')})`;

    // Category distribution pool biased towards the selected goal
    const categoryPool: ProcessCategory[] = [
      'INTERACTIVE_DEV',
      'COMPUTE_CRITICAL',
      'EDUCATIONAL_MEDIA',
      'REFERENCE_DOCS',
      'SYSTEM_DAEMON',
    ];

    if (options.includeDistractions !== false) {
      categoryPool.push('ENTERTAINMENT', 'BACKGROUND_MEDIA');
    }

    const processes: ProcessTraceInput[] = [];
    let currentPid = 301;
    const usedNames = new Set<string>();

    for (let i = 0; i < count; i++) {
      // Pick a random category
      const category = categoryPool[Math.floor(Math.random() * categoryPool.length)];
      
      // Pick a unique template name
      const nameChoices = TEMPLATE_NAMES[category];
      let name = nameChoices[Math.floor(Math.random() * nameChoices.length)];
      if (usedNames.has(name)) {
        name = `${name} #${i + 1}`;
      }
      usedNames.add(name);

      // Arrival time: Staggered, with at least 1-2 processes arriving at T=0
      const arrivalTime = i < 2 ? 0 : Math.floor(Math.random() * 8) + 1; // 0 to 8 ticks

      // Dynamic Goal Affinity derived from category and active goal (NOT hardcoded!)
      const goalAffinity = AffinityEngine.calculateAffinity(category, goal);

      // Base Priority: 1 for critical, 2 for normal, 3 for daemons/distractions
      const basePriority = goalAffinity >= 0.7 ? 1 : goalAffinity < 0 ? 3 : 2;

      // Burst Sequence: Alternating CPU and IO, ending with CPU
      const burstCount = Math.floor(Math.random() * 3) + 2; // 2 to 4 bursts
      const burstSequence: { type: BurstType; duration: number }[] = [];
      let totalCpuDuration = 0;

      for (let b = 0; b < burstCount; b++) {
        const isCpu = b % 2 === 0 || b === burstCount - 1; // Ensure final burst is CPU
        const duration = isCpu 
          ? Math.floor(Math.random() * 5) + 3  // 3 to 7 ticks
          : Math.floor(Math.random() * 3) + 1; // 1 to 3 ticks
        
        burstSequence.push({
          type: isCpu ? 'CPU' : 'IO',
          duration,
        });

        if (isCpu) totalCpuDuration += duration;
      }

      // Deadline: optional for critical processes
      const deadline = goalAffinity >= 0.7 
        ? arrivalTime + totalCpuDuration + (Math.floor(Math.random() * 15) + 10)
        : null;

      processes.push({
        pid: currentPid++,
        name,
        processCategory: category,
        goalAffinity,
        arrivalTime,
        basePriority,
        memoryPages: Math.floor(Math.random() * 20) + 8, // 8 to 28 pages
        deadline,
        burstSequence,
      });
    }

    // Sort by arrival time
    processes.sort((a, b) => a.arrivalTime - b.arrivalTime);

    return {
      traceId,
      name: scenarioName,
      description: `Dynamically generated realistic trace with ${processes.length} processes under active goal "${goal}". Affinities and burst patterns procedurally computed in real-time.`,
      learningGoal: goal,
      systemParameters: {
        totalMemoryFrames: 64,
        frameSizeKB: 4,
        contextSwitchCostTicks: 1,
      },
      tunableParameters: { ...DEFAULT_TUNABLE_PARAMETERS },
      processes,
    };
  }
}
