import { ProcessCategory } from '../../types/process';
import { LearningGoal } from '../../types/context';

/**
 * Dynamic Goal Affinity Matrix:
 * Maps the semantic relationship between any ProcessCategory and the active LearningGoal.
 * Returns a normalized score in [-1.0, +1.0]:
 *   >= 0.7  : Critical Task (Admitted to Q0, eligible for Super-Quantum Boost)
 *   0.0-0.69: Normal / Supporting Task (Admitted to Q1)
 *   < 0.0   : Distracting / Unaligned Task (Admitted directly to Q2 Throttled)
 */
export const DYNAMIC_AFFINITY_MATRIX: Record<LearningGoal, Record<ProcessCategory, number>> = {
  PROGRAMMING: {
    COMPUTE_CRITICAL: 1.0,     // Compilers, test runners, build tools
    INTERACTIVE_DEV: 0.9,      // VS Code, Terminal, IDEs
    REFERENCE_DOCS: 0.6,       // StackOverflow, API docs, GitHub
    EDUCATIONAL_MEDIA: 0.4,    // Video tutorials, coding walkthroughs
    SYSTEM_DAEMON: 0.0,        // Window manager, indexing
    BACKGROUND_MEDIA: -0.2,    // Background music
    ENTERTAINMENT: -0.9,       // Social media, video games
  },
  MATHEMATICS: {
    COMPUTE_CRITICAL: 1.0,     // Mathematica, Jupyter, numerical solvers
    REFERENCE_DOCS: 0.8,       // Math papers, formula sheets
    EDUCATIONAL_MEDIA: 0.7,    // Recorded math lectures
    INTERACTIVE_DEV: 0.3,      // Scripting environments
    SYSTEM_DAEMON: 0.0,        // OS background daemons
    BACKGROUND_MEDIA: -0.3,    // Audio distractions
    ENTERTAINMENT: -0.9,       // Social media
  },
  LECTURE_VIEWING: {
    EDUCATIONAL_MEDIA: 1.0,    // Online lecture, conference stream
    REFERENCE_DOCS: 0.7,       // Lecture slides, course notes
    INTERACTIVE_DEV: 0.2,      // Scratchpad / code notes
    COMPUTE_CRITICAL: 0.1,     // Background builds
    SYSTEM_DAEMON: 0.0,        // OS daemons
    BACKGROUND_MEDIA: -0.5,    // Conflicting audio
    ENTERTAINMENT: -0.9,       // Streaming, feed browsing
  },
  RESEARCH_READING: {
    REFERENCE_DOCS: 1.0,       // ArXiv, PDF reader, JSTOR
    EDUCATIONAL_MEDIA: 0.6,    // Research talks, presentations
    INTERACTIVE_DEV: 0.2,      // Analysis scripts
    COMPUTE_CRITICAL: 0.1,     // Benchmarks
    SYSTEM_DAEMON: 0.0,        // OS daemons
    BACKGROUND_MEDIA: -0.2,    // Ambient focus music
    ENTERTAINMENT: -0.8,       // Distracting tabs
  },
  GENERAL_STUDY: {
    REFERENCE_DOCS: 0.8,       // Textbooks, study materials
    EDUCATIONAL_MEDIA: 0.8,    // Explanatory videos
    INTERACTIVE_DEV: 0.5,      // Flashcards, practice tools
    COMPUTE_CRITICAL: 0.4,     // Evaluation scripts
    SYSTEM_DAEMON: 0.0,        // System tasks
    BACKGROUND_MEDIA: -0.1,    // Focus music
    ENTERTAINMENT: -0.8,       // Games, social media
  },
};

export class AffinityEngine {
  /**
   * Computes the dynamic goal affinity of a process under the active learning goal.
   * If an explicit override affinity is passed and is valid, that override is respected;
   * otherwise, it is dynamically derived from the matrix.
   */
  public static calculateAffinity(
    category: ProcessCategory,
    goal: LearningGoal,
    explicitOverride?: number | null
  ): number {
    if (typeof explicitOverride === 'number' && !isNaN(explicitOverride)) {
      return Math.max(-1.0, Math.min(1.0, explicitOverride));
    }
    const goalMap = DYNAMIC_AFFINITY_MATRIX[goal] || DYNAMIC_AFFINITY_MATRIX.PROGRAMMING;
    return goalMap[category] ?? 0.0;
  }

  /**
   * Dynamically calculates the starting context score based on the initial active processes at T=0
   * instead of hardcoding 85.
   */
  public static calculateInitialScore(
    initialProcesses: Array<{ processCategory: ProcessCategory; goalAffinity?: number; arrivalTime?: number }>,
    goal: LearningGoal
  ): number {
    const arrivingNow = initialProcesses.filter(p => (p.arrivalTime ?? 0) === 0);
    const sample = arrivingNow.length > 0 ? arrivingNow : initialProcesses;

    if (sample.length === 0) {
      return 75.0; // Baseline neutral score for empty queue
    }

    const affinities = sample.map(p => 
      AffinityEngine.calculateAffinity(p.processCategory, goal, p.goalAffinity)
    );

    const avgAffinity = affinities.reduce((sum, a) => sum + a, 0) / affinities.length;
    // Map avgAffinity [-1.0, +1.0] to [20, 95]
    const normalized = (avgAffinity + 1.0) / 2.0; // [0, 1]
    const score = 20.0 + normalized * 75.0;
    return Math.round(score * 10) / 10;
  }

  /**
   * Helper to format human-readable tier and colors for UI badges.
   */
  public static getTier(affinity: number): {
    tier: 'CRITICAL' | 'NORMAL' | 'THROTTLED';
    label: string;
    badgeClass: string;
  } {
    if (affinity >= 0.7) {
      return {
        tier: 'CRITICAL',
        label: `Critical (${affinity >= 0 ? '+' : ''}${affinity.toFixed(1)})`,
        badgeClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50',
      };
    }
    if (affinity < 0.0) {
      return {
        tier: 'THROTTLED',
        label: `Distracting (${affinity.toFixed(1)})`,
        badgeClass: 'bg-rose-950/80 text-rose-300 border-rose-500/50',
      };
    }
    return {
      tier: 'NORMAL',
      label: `Supporting (${affinity >= 0 ? '+' : ''}${affinity.toFixed(1)})`,
      badgeClass: 'bg-blue-950/80 text-blue-300 border-blue-500/50',
    };
  }
}
