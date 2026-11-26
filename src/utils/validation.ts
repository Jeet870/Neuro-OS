import { WorkloadTrace } from '../types/trace';
import { ProcessTraceInput } from '../types/process';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class TraceValidator {
  public static validate(trace: unknown): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!trace || typeof trace !== 'object') {
      return { isValid: false, errors: ['Trace must be a non-null JSON object.'], warnings: [] };
    }

    const t = trace as Partial<WorkloadTrace>;

    if (!t.traceId || typeof t.traceId !== 'string') {
      errors.push('Trace missing valid string "traceId".');
    }

    if (!t.name || typeof t.name !== 'string') {
      errors.push('Trace missing valid string "name".');
    }

    if (!t.processes || !Array.isArray(t.processes)) {
      errors.push('Trace must contain an array of "processes".');
      return { isValid: false, errors, warnings };
    }

    if (t.processes.length === 0) {
      errors.push('Trace "processes" array cannot be empty.');
    }

    const seenPids = new Set<number>();

    t.processes.forEach((p: Partial<ProcessTraceInput>, idx: number) => {
      const pLabel = `Process #${idx + 1} (PID: ${p.pid ?? 'unknown'})`;

      if (typeof p.pid !== 'number' || !Number.isInteger(p.pid) || p.pid < 0) {
        errors.push(`${pLabel}: PID must be a non-negative integer.`);
      } else if (seenPids.has(p.pid)) {
        errors.push(`${pLabel}: Duplicate PID ${p.pid} detected.`);
      } else {
        seenPids.add(p.pid);
      }

      if (!p.name || typeof p.name !== 'string') {
        errors.push(`${pLabel}: Name must be a non-empty string.`);
      }

      if (typeof p.arrivalTime !== 'number' || !Number.isInteger(p.arrivalTime) || p.arrivalTime < 0) {
        errors.push(`${pLabel}: Arrival time must be an integer >= 0.`);
      }

      if (p.goalAffinity !== undefined && p.goalAffinity !== null) {
        if (typeof p.goalAffinity !== 'number' || p.goalAffinity < -1.0 || p.goalAffinity > 1.0) {
          errors.push(`${pLabel}: Goal affinity must be a normalized number between -1.0 and +1.0.`);
        }
      }

      if (!p.burstSequence || !Array.isArray(p.burstSequence) || p.burstSequence.length === 0) {
        errors.push(`${pLabel}: Burst sequence must be a non-empty array.`);
      } else {
        const hasCpu = p.burstSequence.some((b) => b.type === 'CPU');
        if (!hasCpu) {
          errors.push(`${pLabel}: Burst sequence must contain at least one CPU burst.`);
        }

        let previousType: string | null = null;
        p.burstSequence.forEach((b, bIdx) => {
          if (b.type !== 'CPU' && b.type !== 'IO') {
            errors.push(`${pLabel} Burst #${bIdx + 1}: Invalid burst type "${b.type}". Must be 'CPU' or 'IO'.`);
          }

          if (typeof b.duration !== 'number' || !Number.isInteger(b.duration) || b.duration <= 0) {
            errors.push(`${pLabel} Burst #${bIdx + 1}: Duration must be an integer > 0.`);
          }

          if (b.type === 'IO' && previousType === 'IO') {
            errors.push(`${pLabel} Burst #${bIdx + 1}: Consecutive IO bursts are not allowed.`);
          }

          previousType = b.type;
        });
      }

      if (p.deadline !== undefined && p.deadline !== null) {
        if (typeof p.deadline !== 'number' || p.deadline < (p.arrivalTime || 0)) {
          warnings.push(`${pLabel}: Deadline (${p.deadline}) is earlier than or equal to arrival time.`);
        }
      }
    });

    if (t.tunableParameters) {
      const tp = t.tunableParameters;
      if (tp.q0Quantum !== undefined && (tp.q0Quantum <= 0 || !Number.isInteger(tp.q0Quantum))) {
        errors.push('Tunable parameter q0Quantum must be an integer >= 1.');
      }
      if (tp.q1Quantum !== undefined && (tp.q1Quantum <= 0 || !Number.isInteger(tp.q1Quantum))) {
        errors.push('Tunable parameter q1Quantum must be an integer >= 1.');
      }
      if (tp.q2Quantum !== undefined && (tp.q2Quantum <= 0 || !Number.isInteger(tp.q2Quantum))) {
        errors.push('Tunable parameter q2Quantum must be an integer >= 1.');
      }
      if (tp.maxAgingWait !== undefined && (tp.maxAgingWait < 5 || !Number.isInteger(tp.maxAgingWait))) {
        errors.push('Tunable parameter maxAgingWait must be an integer >= 5.');
      }
      if (tp.contextSwitchCost !== undefined && (tp.contextSwitchCost < 0 || !Number.isInteger(tp.contextSwitchCost))) {
        errors.push('Tunable parameter contextSwitchCost must be an integer >= 0.');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
