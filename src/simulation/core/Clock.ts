export class Clock {
  private currentTick: number;

  constructor(initialTick: number = 0) {
    this.currentTick = initialTick;
  }

  public getTick(): number {
    return this.currentTick;
  }

  public tick(): number {
    this.currentTick += 1;
    return this.currentTick;
  }

  public reset(initialTick: number = 0): void {
    this.currentTick = initialTick;
  }
}
