import { WorkloadTrace } from '../../types/trace';
import { ScenarioComparisonReport } from '../../types/metrics';
import { SimulationEngine } from '../engine/SimulationEngine';
import { MetricsCalculator } from '../metrics/MetricsCalculator';

export class BenchmarkRunner {
  public static runScenario(trace: WorkloadTrace): ScenarioComparisonReport {
    // Deep clone trace for each algorithm run to guarantee 100% deterministic isolation
    const traceRR: WorkloadTrace = JSON.parse(JSON.stringify(trace));
    const traceMLFQ: WorkloadTrace = JSON.parse(JSON.stringify(trace));
    const traceCAMLFQ: WorkloadTrace = JSON.parse(JSON.stringify(trace));

    // 1. Run Round Robin
    const engineRR = new SimulationEngine('RR', traceRR.tunableParameters);
    engineRR.loadTrace(traceRR);
    const reportRR = engineRR.fastForwardToEnd(20000);

    // 2. Run Classical MLFQ
    const engineMLFQ = new SimulationEngine('MLFQ', traceMLFQ.tunableParameters);
    engineMLFQ.loadTrace(traceMLFQ);
    const reportMLFQ = engineMLFQ.fastForwardToEnd(20000);

    // 3. Run NeuroOS CA-MLFQ
    const engineCAMLFQ = new SimulationEngine('CA_MLFQ', traceCAMLFQ.tunableParameters);
    engineCAMLFQ.loadTrace(traceCAMLFQ);
    const reportCAMLFQ = engineCAMLFQ.fastForwardToEnd(20000);

    return MetricsCalculator.compareScenario(
      trace.traceId,
      trace.name,
      trace.description,
      reportRR,
      reportMLFQ,
      reportCAMLFQ
    );
  }
}
