import { 
  AlgorithmMetricsReport, 
  ProcessMetrics, 
  ScenarioComparisonReport 
} from '../../types/metrics';
import { IProcessControlBlock } from '../../types/process';
import { AlgorithmType, TunableParameters } from '../../types/scheduler';

export class MetricsCalculator {
  public static calculateReport(
    algorithm: AlgorithmType,
    totalTicks: number,
    cpuBusyTicks: number,
    cpuIdleTicks: number,
    cpuContextSwitchTicks: number,
    pcbs: IProcessControlBlock[],
    params: TunableParameters
  ): AlgorithmMetricsReport {
    const processMetrics: ProcessMetrics[] = pcbs.map(p => {
      const completionTime = p.completionTick ?? totalTicks;
      const turnaroundTime = Math.max(0, completionTime - p.arrivalTime);
      const waitingTime = p.totalWaitTime;
      const responseTime = p.firstResponseTick !== null 
        ? Math.max(0, p.firstResponseTick - p.arrivalTime) 
        : turnaroundTime;

      const isCritical = p.goalAffinity >= 0.7;
      let deadlineMet: boolean | null = null;
      if (p.deadline !== null) {
        deadlineMet = completionTime <= p.deadline;
      }

      return {
        pid: p.pid,
        name: p.name,
        category: p.processCategory,
        isCritical,
        arrivalTime: p.arrivalTime,
        completionTime,
        waitingTime,
        turnaroundTime,
        responseTime,
        deadlineMet,
        contextSwitches: p.contextSwitchCount,
      };
    });

    const n = processMetrics.length || 1;
    const criticalList = processMetrics.filter(p => p.isCritical);
    const nonCriticalList = processMetrics.filter(p => !p.isCritical);

    const nCrit = criticalList.length || 1;
    const nNonCrit = nonCriticalList.length || 1;

    const avgWait = processMetrics.reduce((sum, p) => sum + p.waitingTime, 0) / n;
    const avgTurnaround = processMetrics.reduce((sum, p) => sum + p.turnaroundTime, 0) / n;
    const avgResponse = processMetrics.reduce((sum, p) => sum + p.responseTime, 0) / n;

    const critWait = criticalList.length > 0 
      ? criticalList.reduce((sum, p) => sum + p.waitingTime, 0) / nCrit 
      : 0;
    const critTurnaround = criticalList.length > 0 
      ? criticalList.reduce((sum, p) => sum + p.turnaroundTime, 0) / nCrit 
      : 0;
    const critResponse = criticalList.length > 0 
      ? criticalList.reduce((sum, p) => sum + p.responseTime, 0) / nCrit 
      : 0;

    const nonCritWait = nonCriticalList.length > 0 
      ? nonCriticalList.reduce((sum, p) => sum + p.waitingTime, 0) / nNonCrit 
      : 0;

    const maxWait = processMetrics.reduce((max, p) => Math.max(max, p.waitingTime), 0);
    const peakStarvationRatio = pcbs.reduce((maxRatio, p) => {
      const threshold = p.effectiveMaxWaitThreshold || params.maxAgingWait || 20;
      const ratio = p.maxContinuousWait / threshold;
      return Math.max(maxRatio, ratio);
    }, 0);
    const starvationIndex = Math.round(peakStarvationRatio * 100) / 100;

    const totalContextSwitches = processMetrics.reduce((sum, p) => sum + p.contextSwitches, 0);

    const withDeadlines = processMetrics.filter(p => p.deadlineMet !== null);
    const deadlineMissCount = withDeadlines.filter(p => p.deadlineMet === false).length;
    const deadlineMissRatio = withDeadlines.length > 0 
      ? Math.round((deadlineMissCount / withDeadlines.length) * 100) / 100 
      : 0;

    const cpuUtilization = totalTicks > 0 
      ? Math.round(((cpuBusyTicks + cpuContextSwitchTicks) / totalTicks) * 1000) / 10 
      : 0;

    return {
      algorithm,
      totalTicks,
      cpuBusyTicks,
      cpuIdleTicks,
      cpuContextSwitchTicks,
      cpuUtilization,
      averageWaitingTime: Math.round(avgWait * 10) / 10,
      averageTurnaroundTime: Math.round(avgTurnaround * 10) / 10,
      averageResponseTime: Math.round(avgResponse * 10) / 10,
      criticalWaitingTime: Math.round(critWait * 10) / 10,
      criticalTurnaroundTime: Math.round(critTurnaround * 10) / 10,
      criticalResponseTime: Math.round(critResponse * 10) / 10,
      nonCriticalWaitingTime: Math.round(nonCritWait * 10) / 10,
      maximumWaitingTime: maxWait,
      starvationIndex,
      totalContextSwitches,
      deadlineMissCount,
      deadlineMissRatio,
      perProcessMetrics: processMetrics,
    };
  }

  public static compareScenario(
    scenarioId: string,
    scenarioName: string,
    hypothesis: string,
    rrReport: AlgorithmMetricsReport,
    mlfqReport: AlgorithmMetricsReport,
    camlfqReport: AlgorithmMetricsReport
  ): ScenarioComparisonReport {
    const mlfqCritResp = mlfqReport.criticalResponseTime || 1;
    const mlfqCritTurn = mlfqReport.criticalTurnaroundTime || 1;
    const mlfqAvgWait = mlfqReport.averageWaitingTime || 1;

    // Calculate percentage improvements or differences of CA-MLFQ vs Classical MLFQ
    const critRespDelta = Math.round(((mlfqCritResp - camlfqReport.criticalResponseTime) / mlfqCritResp) * 1000) / 10;
    const critTurnDelta = Math.round(((mlfqCritTurn - camlfqReport.criticalTurnaroundTime) / mlfqCritTurn) * 1000) / 10;
    const avgWaitDelta = Math.round(((mlfqAvgWait - camlfqReport.averageWaitingTime) / mlfqAvgWait) * 1000) / 10;
    const csDelta = camlfqReport.totalContextSwitches - mlfqReport.totalContextSwitches;
    const starvationDiff = Math.round((camlfqReport.starvationIndex - mlfqReport.starvationIndex) * 100) / 100;

    return {
      scenarioId,
      scenarioName,
      hypothesis,
      results: {
        RR: rrReport,
        MLFQ: mlfqReport,
        CA_MLFQ: camlfqReport,
      },
      deltas: {
        criticalResponseTimeDeltaPercent: critRespDelta,
        criticalTurnaroundDeltaPercent: critTurnDelta,
        averageWaitingDeltaPercent: avgWaitDelta,
        contextSwitchDeltaCount: csDelta,
        starvationIndexDiff: starvationDiff,
      },
    };
  }
}
