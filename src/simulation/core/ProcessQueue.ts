import { ProcessControlBlock } from './PCB';

export class ProcessQueue {
  public readonly name: string;
  public readonly level: number;
  private queue: ProcessControlBlock[];

  constructor(name: string, level: number = 0) {
    this.name = name;
    this.level = level;
    this.queue = [];
  }

  public enqueue(process: ProcessControlBlock): void {
    process.currentQueueLevel = this.level;
    this.queue.push(process);
  }

  public enqueueHead(process: ProcessControlBlock): void {
    process.currentQueueLevel = this.level;
    this.queue.unshift(process);
  }

  public dequeue(): ProcessControlBlock | null {
    return this.queue.shift() || null;
  }

  public peek(): ProcessControlBlock | null {
    return this.queue[0] || null;
  }

  public isEmpty(): boolean {
    return this.queue.length === 0;
  }

  public size(): number {
    return this.queue.length;
  }

  public getPids(): number[] {
    return this.queue.map(p => p.pid);
  }

  public getAll(): ProcessControlBlock[] {
    return [...this.queue];
  }

  public remove(pid: number): ProcessControlBlock | null {
    const idx = this.queue.findIndex(p => p.pid === pid);
    if (idx !== -1) {
      return this.queue.splice(idx, 1)[0];
    }
    return null;
  }

  public clear(): void {
    this.queue = [];
  }

  public onTickWait(): void {
    for (const p of this.queue) {
      p.totalWaitTime += 1;
      p.continuousWaitTime += 1;
      p.timeInCurrentQueue += 1;
      if (p.continuousWaitTime > p.maxContinuousWait) {
        p.maxContinuousWait = p.continuousWaitTime;
      }
    }
  }
}
