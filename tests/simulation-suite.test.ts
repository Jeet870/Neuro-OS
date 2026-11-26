import { Clock } from '../src/simulation/core/Clock';
import { ProcessControlBlock } from '../src/simulation/core/PCB';
import { ProcessQueue } from '../src/simulation/core/ProcessQueue';
import { ContextEngine } from '../src/simulation/context/ContextEngine';
import { SimulationEngine } from '../src/simulation/engine/SimulationEngine';
import { BenchmarkRunner } from '../src/simulation/benchmarks/BenchmarkRunner';
import { TraceValidator } from '../src/utils/validation';
import { AffinityEngine } from '../src/simulation/context/AffinityEngine';
import { RandomWorkloadGenerator } from '../src/simulation/benchmarks/RandomWorkloadGenerator';
import { SCENARIO_A, SCENARIO_B, SCENARIO_C, SCENARIO_D, SCENARIO_E } from '../src/simulation/benchmarks/BenchmarkScenarios';
import { WorkloadTrace } from '../src/types/trace';
import { DEFAULT_TUNABLE_PARAMETERS } from '../src/types/scheduler';

interface TestResult {
  category: string;
  name: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, category: string, name: string, details?: string) {
  if (condition) {
    results.push({ category, name, passed: true });
    console.log(`  [PASS] ${category}: ${name}`);
  } else {
    results.push({ category, name, passed: false, details });
    console.error(`  [FAIL] ${category}: ${name} - Details: ${details || 'Assertion failed'}`);
  }
}

console.log('===============================================================');
console.log('       NEUROOS EXHAUSTIVE AUTOMATED VERIFICATION SUITE         ');
console.log('===============================================================\n');

// ---------------------------------------------------------------------------
// 1. CLOCK TESTS
// ---------------------------------------------------------------------------
console.log('1. Testing Clock Module...');
const clock = new Clock(0);
assert(clock.getTick() === 0, 'Clock', 'Initial tick is 0');
assert(clock.tick() === 1, 'Clock', 'Tick increment returns 1');
assert(clock.getTick() === 1, 'Clock', 'Current tick is 1');
clock.reset(5);
assert(clock.getTick() === 5, 'Clock', 'Reset to custom tick works');

// ---------------------------------------------------------------------------
// 2. PCB & STATE MACHINE TESTS
// ---------------------------------------------------------------------------
console.log('\n2. Testing Process Control Block (PCB)...');
const pcb = new ProcessControlBlock({
  pid: 101,
  name: 'Test Task',
  processCategory: 'INTERACTIVE_DEV',
  goalAffinity: 0.8,
  arrivalTime: 0,
  basePriority: 1,
  memoryPages: 16,
  burstSequence: [
    { type: 'CPU', duration: 4 },
    { type: 'IO', duration: 2 },
    { type: 'CPU', duration: 6 },
  ],
}, 20);

assert(pcb.state === 'NEW', 'PCB', 'Initial state is NEW');
assert(pcb.effectiveMaxWaitThreshold === 20, 'PCB', 'Normal process aging threshold = 20t');

const negPcb = new ProcessControlBlock({
  pid: 102,
  name: 'Distracting Task',
  processCategory: 'ENTERTAINMENT',
  goalAffinity: -0.8,
  arrivalTime: 0,
  basePriority: 3,
  memoryPages: 12,
  burstSequence: [{ type: 'CPU', duration: 5 }],
}, 20);
assert(negPcb.effectiveMaxWaitThreshold === 30, 'PCB', 'Negative-affinity aging threshold = 30t (maxAgingWait * 1.5)');

// Test burst advancement
const burstRes1 = pcb.advanceBurst(2);
assert(!burstRes1.burstFinished && burstRes1.type === 'CPU', 'PCB', 'Burst advancing partial CPU');
assert(pcb.totalCpuTime === 2 && pcb.currentQuantumUsed === 2, 'PCB', 'CPU counters updated correctly');

const burstRes2 = pcb.advanceBurst(2);
assert(burstRes2.burstFinished && burstRes2.type === 'CPU', 'PCB', 'Burst finishes when remaining reaches 0');
assert(pcb.currentBurstIndex === 1, 'PCB', 'Advances to next burst index (I/O)');

// ---------------------------------------------------------------------------
// 3. PROCESS QUEUE TESTS
// ---------------------------------------------------------------------------
console.log('\n3. Testing ProcessQueue Module...');
const queue = new ProcessQueue('TestQueue', 0);
assert(queue.isEmpty(), 'ProcessQueue', 'Queue starts empty');
queue.enqueue(pcb);
assert(queue.size() === 1, 'ProcessQueue', 'Enqueue increases size');
assert(queue.peek()?.pid === 101, 'ProcessQueue', 'Peek inspects head without removal');
queue.onTickWait();
assert(pcb.totalWaitTime === 1 && pcb.continuousWaitTime === 1 && pcb.maxContinuousWait === 1, 'ProcessQueue', 'Wait counters advance on tick');
const dequeued = queue.dequeue();
assert(dequeued?.pid === 101 && queue.isEmpty(), 'ProcessQueue', 'Dequeue removes head process');

// ---------------------------------------------------------------------------
// 4. ROUND ROBIN SCHEDULER TESTS
// ---------------------------------------------------------------------------
console.log('\n4. Testing Round Robin Scheduler (RR)...');
const rrTrace: WorkloadTrace = {
  traceId: 'rr-unit-test',
  name: 'RR Unit Test Trace',
  description: 'Two CPU-bound tasks in Round Robin',
  learningGoal: 'PROGRAMMING',
  systemParameters: { totalMemoryFrames: 32, frameSizeKB: 4, contextSwitchCostTicks: 1 },
  tunableParameters: { ...DEFAULT_TUNABLE_PARAMETERS, rrQuantum: 4, contextSwitchCost: 1 },
  processes: [
    {
      pid: 1,
      name: 'Task 1',
      processCategory: 'COMPUTE_CRITICAL',
      goalAffinity: 0.5,
      arrivalTime: 0,
      basePriority: 1,
      memoryPages: 8,
      burstSequence: [{ type: 'CPU', duration: 8 }],
    },
    {
      pid: 2,
      name: 'Task 2',
      processCategory: 'COMPUTE_CRITICAL',
      goalAffinity: 0.5,
      arrivalTime: 0,
      basePriority: 1,
      memoryPages: 8,
      burstSequence: [{ type: 'CPU', duration: 8 }],
    },
  ],
};

const rrEngine = new SimulationEngine('RR', rrTrace.tunableParameters);
rrEngine.loadTrace(rrTrace);
const rrReport = rrEngine.fastForwardToEnd(100);

assert(rrReport.totalTicks > 0, 'Round Robin', 'RR simulation terminates');
assert(rrReport.perProcessMetrics.length === 2, 'Round Robin', 'Both processes executed to completion');
assert(rrReport.totalContextSwitches === 2, 'Round Robin', 'Exactly 2 preemptive context switches occurred per quantum expiry');

// ---------------------------------------------------------------------------
// 5. CLASSICAL MLFQ SCHEDULER TESTS
// ---------------------------------------------------------------------------
console.log('\n5. Testing Classical MLFQ Scheduler...');
const mlfqTrace: WorkloadTrace = {
  traceId: 'mlfq-unit-test',
  name: 'Classical MLFQ Unit Test',
  description: 'Tests Q0 -> Q1 -> Q2 demotion on quantum expiry',
  learningGoal: 'PROGRAMMING',
  systemParameters: { totalMemoryFrames: 32, frameSizeKB: 4, contextSwitchCostTicks: 1 },
  tunableParameters: { ...DEFAULT_TUNABLE_PARAMETERS, q0Quantum: 2, q1Quantum: 4, q2Quantum: 8 },
  processes: [
    {
      pid: 1,
      name: 'Long Compute Task',
      processCategory: 'COMPUTE_CRITICAL',
      goalAffinity: 0.0,
      arrivalTime: 0,
      basePriority: 1,
      memoryPages: 8,
      burstSequence: [{ type: 'CPU', duration: 16 }],
    },
  ],
};

const mlfqEngine = new SimulationEngine('MLFQ', mlfqTrace.tunableParameters);
mlfqEngine.loadTrace(mlfqTrace);

// Step 2 ticks -> should consume Q0 quantum (2t) and demote to Q1
mlfqEngine.step(); // tick 0
mlfqEngine.step(); // tick 1
mlfqEngine.step(); // tick 2 -> quantum expires, demoted to Q1

const p1 = mlfqEngine.getAllProcesses()[0];
assert(p1.currentQueueLevel >= 1, 'Classical MLFQ', 'Process demoted from Q0 to Q1 after 2t quantum expiry');

// ---------------------------------------------------------------------------
// 6. CONTEXT ENGINE TESTS
// ---------------------------------------------------------------------------
console.log('\n6. Testing Context Engine...');
const contextEngine = new ContextEngine('PROGRAMMING');
const initSnapshot = contextEngine.getSnapshot({
  activeGoalMatch: 0.9,
  focusContinuity: 1.0,
  switchingVelocity: 1.0,
  idleDegradation: 1.0,
});

assert(initSnapshot.state === 'FOCUSED', 'Context Engine', 'Initial high affinity state is FOCUSED');
assert(initSnapshot.score >= 80, 'Context Engine', 'Focused score is >= 80');

// Force distracted state by simulating negative affinity process
const distractedPcb = new ProcessControlBlock({
  pid: 999,
  name: 'Distraction',
  processCategory: 'ENTERTAINMENT',
  goalAffinity: -1.0,
  arrivalTime: 0,
  basePriority: 3,
  memoryPages: 8,
  burstSequence: [{ type: 'CPU', duration: 10 }],
});

const distractedSnapshot = contextEngine.evaluate(distractedPcb, true, 10);
assert(distractedSnapshot.score < 60, 'Context Engine', 'Score degrades with negative affinity process');
assert(distractedSnapshot.recentLogs.length > 0, 'Context Engine', 'Audit logs are generated on state transitions');

// ---------------------------------------------------------------------------
// 7. CA-MLFQ & CONTEXT-BOOSTED QUANTUM TESTS
// ---------------------------------------------------------------------------
console.log('\n7. Testing NeuroOS CA-MLFQ Scheduler...');
const caTrace: WorkloadTrace = {
  traceId: 'ca-mlfq-unit-test',
  name: 'CA-MLFQ Boost & Throttling Test',
  description: 'Tests Q0 boost for high-affinity and Q2 routing for distracting tasks',
  learningGoal: 'PROGRAMMING',
  systemParameters: { totalMemoryFrames: 32, frameSizeKB: 4, contextSwitchCostTicks: 1 },
  tunableParameters: { ...DEFAULT_TUNABLE_PARAMETERS, q0Quantum: 2, focusedQuantumMultiplier: 2 },
  processes: [
    {
      pid: 10,
      name: 'Critical Task',
      processCategory: 'COMPUTE_CRITICAL',
      goalAffinity: 0.9,
      arrivalTime: 0,
      basePriority: 1,
      memoryPages: 8,
      burstSequence: [{ type: 'CPU', duration: 8 }],
    },
    {
      pid: 20,
      name: 'Distracting Task',
      processCategory: 'ENTERTAINMENT',
      goalAffinity: -0.8,
      arrivalTime: 0,
      basePriority: 3,
      memoryPages: 8,
      burstSequence: [{ type: 'CPU', duration: 8 }],
    },
  ],
};

const caEngine = new SimulationEngine('CA_MLFQ', caTrace.tunableParameters);
caEngine.loadTrace(caTrace);

// Step 1: Check queue admission
caEngine.step();
const allP = caEngine.getAllProcesses();
const critP = allP.find(p => p.pid === 10);
const distP = allP.find(p => p.pid === 20);

assert(critP?.currentQueueLevel === 0, 'CA-MLFQ', 'Critical process admitted to Q0');
assert(distP?.currentQueueLevel === 2, 'CA-MLFQ', 'Distracting process routed directly to Q2');

// ---------------------------------------------------------------------------
// 8. AGING & STARVATION BOUNDEDNESS TEST
// ---------------------------------------------------------------------------
console.log('\n8. Testing Anti-Starvation Ceiling...');
const starvationTrace: WorkloadTrace = {
  traceId: 'starvation-test',
  name: 'Starvation Stress Trace',
  description: 'Critical process runs continuously while background process waits',
  learningGoal: 'PROGRAMMING',
  systemParameters: { totalMemoryFrames: 32, frameSizeKB: 4, contextSwitchCostTicks: 1 },
  tunableParameters: { ...DEFAULT_TUNABLE_PARAMETERS, maxAgingWait: 10 },
  processes: [
    {
      pid: 1,
      name: 'Heavy Critical Task',
      processCategory: 'COMPUTE_CRITICAL',
      goalAffinity: 1.0,
      arrivalTime: 0,
      basePriority: 1,
      memoryPages: 8,
      burstSequence: [{ type: 'CPU', duration: 30 }],
    },
    {
      pid: 2,
      name: 'Background Task',
      processCategory: 'SYSTEM_DAEMON',
      goalAffinity: 0.0,
      arrivalTime: 0,
      basePriority: 3,
      memoryPages: 8,
      burstSequence: [{ type: 'CPU', duration: 4 }],
    },
  ],
};

const starvationEngine = new SimulationEngine('CA_MLFQ', starvationTrace.tunableParameters);
starvationEngine.loadTrace(starvationTrace);
const starvationReport = starvationEngine.fastForwardToEnd(100);

assert(starvationReport.starvationIndex <= 1.0, 'Anti-Starvation', `Starvation Index is strictly bounded (S_idx = ${starvationReport.starvationIndex} <= 1.0)`);
const bgP = starvationReport.perProcessMetrics.find(p => p.pid === 2);
assert(bgP?.completionTime !== undefined && bgP.completionTime < 100, 'Anti-Starvation', 'Background task was rescued by aging and completed');

// ---------------------------------------------------------------------------
// 9. TRACE VALIDATOR TESTS
// ---------------------------------------------------------------------------
console.log('\n9. Testing TraceValidator...');
const validRes = TraceValidator.validate(SCENARIO_A);
assert(validRes.isValid && validRes.errors.length === 0, 'TraceValidator', 'Scenario A passes validation');

const invalidTrace = {
  traceId: 'invalid-test',
  name: 'Invalid Trace',
  learningGoal: 'PROGRAMMING',
  processes: [
    {
      pid: -1, // Invalid PID
      name: 'Bad Proc',
      arrivalTime: -5, // Invalid arrival
      goalAffinity: 2.5, // Invalid affinity (> 1)
      burstSequence: [
        { type: 'IO', duration: 2 },
        { type: 'IO', duration: 4 }, // Consecutive IO
      ],
    },
    {
      pid: -1, // Duplicate PID
      name: 'Duplicate Proc',
      arrivalTime: 0,
      goalAffinity: 0,
      burstSequence: [{ type: 'CPU', duration: 0 }], // Zero duration
    },
  ],
};

const invalidRes = TraceValidator.validate(invalidTrace);
assert(!invalidRes.isValid && invalidRes.errors.length >= 5, 'TraceValidator', `TraceValidator correctly caught ${invalidRes.errors.length} validation errors`);

// ---------------------------------------------------------------------------
// 10. DETERMINISM TEST
// ---------------------------------------------------------------------------
console.log('\n10. Testing Deterministic Reproducibility...');
const run1 = BenchmarkRunner.runScenario(SCENARIO_B);
const run2 = BenchmarkRunner.runScenario(SCENARIO_B);

const isIdentical = 
  run1.results.CA_MLFQ.criticalResponseTime === run2.results.CA_MLFQ.criticalResponseTime &&
  run1.results.CA_MLFQ.criticalTurnaroundTime === run2.results.CA_MLFQ.criticalTurnaroundTime &&
  run1.results.CA_MLFQ.averageWaitingTime === run2.results.CA_MLFQ.averageWaitingTime &&
  run1.results.CA_MLFQ.totalContextSwitches === run2.results.CA_MLFQ.totalContextSwitches;

assert(isIdentical, 'Determinism', 'Identical trace runs produce 100% reproducible metrics');

// ---------------------------------------------------------------------------
// 11. EDGE CASES
// ---------------------------------------------------------------------------
console.log('\n11. Testing Edge Cases...');

// Edge Case: Simultaneous arrivals and tie-breaking
const tieBreakTrace: WorkloadTrace = {
  traceId: 'tie-break-test',
  name: 'Tie Breaking Test',
  description: 'Three processes arriving at tick 0 with different priorities and affinities',
  learningGoal: 'PROGRAMMING',
  systemParameters: { totalMemoryFrames: 32, frameSizeKB: 4, contextSwitchCostTicks: 1 },
  tunableParameters: { ...DEFAULT_TUNABLE_PARAMETERS },
  processes: [
    { pid: 3, name: 'P3 Low', processCategory: 'SYSTEM_DAEMON', goalAffinity: 0.0, arrivalTime: 0, basePriority: 2, memoryPages: 4, burstSequence: [{ type: 'CPU', duration: 2 }] },
    { pid: 1, name: 'P1 High', processCategory: 'COMPUTE_CRITICAL', goalAffinity: 1.0, arrivalTime: 0, basePriority: 1, memoryPages: 4, burstSequence: [{ type: 'CPU', duration: 2 }] },
    { pid: 2, name: 'P2 Med', processCategory: 'INTERACTIVE_DEV', goalAffinity: 0.5, arrivalTime: 0, basePriority: 1, memoryPages: 4, burstSequence: [{ type: 'CPU', duration: 2 }] },
  ],
};

const tbEngine = new SimulationEngine('CA_MLFQ', tieBreakTrace.tunableParameters);
tbEngine.loadTrace(tieBreakTrace);
tbEngine.step();
const firstDispatched = tbEngine.getAllProcesses().find(p => p.state === 'RUNNING');
assert(firstDispatched?.pid === 1, 'Edge Cases', 'Tie breaking correctly selected highest priority and affinity PID 1 first');

// Edge Case: Dynamic Goal Change during active execution
const goalEngine = new SimulationEngine('CA_MLFQ', SCENARIO_C.tunableParameters);
goalEngine.loadTrace(SCENARIO_C);
goalEngine.step();
goalEngine.setLearningGoal('MATHEMATICS');
const updatedGoalSnap = goalEngine.getContextSnapshot();
assert(updatedGoalSnap.activeGoal === 'MATHEMATICS', 'Edge Cases', 'Dynamic SET_GOAL applied cleanly without state corruption');

// ---------------------------------------------------------------------------
// 12. FULL BENCHMARK SUITE VERIFICATION (SCENARIOS A - E)
// ---------------------------------------------------------------------------
console.log('\n12. Running Benchmark Suite Scenarios A through E...');
for (const sc of [SCENARIO_A, SCENARIO_B, SCENARIO_C, SCENARIO_D, SCENARIO_E]) {
  const scReport = BenchmarkRunner.runScenario(sc);
  assert(scReport.results.RR.totalTicks > 0, 'Benchmark Suite', `${sc.name} Round Robin complete`);
  assert(scReport.results.MLFQ.totalTicks > 0, 'Benchmark Suite', `${sc.name} Classical MLFQ complete`);
  assert(scReport.results.CA_MLFQ.totalTicks > 0, 'Benchmark Suite', `${sc.name} NeuroOS CA-MLFQ complete`);
  assert(scReport.results.CA_MLFQ.starvationIndex <= 1.5, 'Benchmark Suite', `${sc.name} Starvation Index bounded`);
}

// ---------------------------------------------------------------------------
// 13. DYNAMIC GOAL AFFINITY ENGINE & PROCEDURAL WORKLOAD VERIFICATION
// ---------------------------------------------------------------------------
console.log('\n13. Testing Dynamic Goal Affinity Engine & Procedural Generator...');

// Dynamic Affinity Adaptation
const devProgAffinity = AffinityEngine.calculateAffinity('INTERACTIVE_DEV', 'PROGRAMMING');
const devLecAffinity = AffinityEngine.calculateAffinity('INTERACTIVE_DEV', 'LECTURE_VIEWING');
const mediaLecAffinity = AffinityEngine.calculateAffinity('EDUCATIONAL_MEDIA', 'LECTURE_VIEWING');

assert(devProgAffinity >= 0.7, 'Dynamic Affinity', 'IDE is critical (>=0.7) during PROGRAMMING goal');
assert(devLecAffinity < 0.5, 'Dynamic Affinity', 'IDE drops to low priority (<0.5) during LECTURE_VIEWING goal');
assert(mediaLecAffinity >= 0.7, 'Dynamic Affinity', 'Lecture Media becomes critical (>=0.7) during LECTURE_VIEWING goal');

// Runtime Adaptation via SimulationEngine.setLearningGoal
const adaptEngine = new SimulationEngine('CA_MLFQ', SCENARIO_A.tunableParameters);
adaptEngine.loadTrace(SCENARIO_A);
const ideInitial = adaptEngine.getAllProcesses().find(p => p.processCategory === 'INTERACTIVE_DEV');

assert(ideInitial?.goalAffinity! >= 0.7, 'Dynamic Affinity Adaptation', 'IDE starts with high affinity under PROGRAMMING');

// Now dynamically switch goal to LECTURE_VIEWING
adaptEngine.setLearningGoal('LECTURE_VIEWING');
const ideUpdated = adaptEngine.getAllProcesses().find(p => p.processCategory === 'INTERACTIVE_DEV');
const mediaUpdated = adaptEngine.getAllProcesses().find(p => p.processCategory === 'EDUCATIONAL_MEDIA');

assert(ideUpdated?.goalAffinity! < 0.5, 'Dynamic Affinity Adaptation', 'IDE affinity dynamically dropped when goal changed to LECTURE_VIEWING');
assert(mediaUpdated?.goalAffinity! >= 0.7, 'Dynamic Affinity Adaptation', 'Lecture Media dynamically boosted when goal changed to LECTURE_VIEWING');

// Procedural Workload Generator Validation
const randomTrace = RandomWorkloadGenerator.generate({ processCount: 5, learningGoal: 'MATHEMATICS' });
const validation = TraceValidator.validate(randomTrace);

assert(validation.isValid, 'Procedural Generator', 'Procedurally generated trace passes 100% schema validation');
assert(randomTrace.processes.length === 5, 'Procedural Generator', 'Procedurally generated exactly 5 processes');
assert(randomTrace.learningGoal === 'MATHEMATICS', 'Procedural Generator', 'Procedural trace correctly set to MATHEMATICS goal');

// Run full 3-way benchmark on the procedurally generated workload
const randomReport = BenchmarkRunner.runScenario(randomTrace);
assert(randomReport.results.RR.totalTicks > 0, 'Procedural Generator', 'Procedural trace runs through Round Robin');
assert(randomReport.results.MLFQ.totalTicks > 0, 'Procedural Generator', 'Procedural trace runs through Classical MLFQ');
assert(randomReport.results.CA_MLFQ.totalTicks > 0, 'Procedural Generator', 'Procedural trace runs through NeuroOS CA-MLFQ');
assert(randomReport.results.CA_MLFQ.starvationIndex <= 1.5, 'Procedural Generator', 'Procedural trace satisfies Starvation Index bound');

// ---------------------------------------------------------------------------
// SUMMARY
// ---------------------------------------------------------------------------
console.log('\n===============================================================');
const passed = results.filter(r => r.passed).length;
const failed = results.filter(r => !r.passed).length;
console.log(`TOTAL TESTS: ${results.length}`);
console.log(`PASSED:      ${passed}`);
console.log(`FAILED:      ${failed}`);
console.log('===============================================================');

if (failed > 0) {
  process.exit(1);
}
