import * as loki from "lokijs";
import { IStatsDatabase, IMetrics } from "telemetry-github";
import { getYearMonthDay } from ".";

interface IDBEntry {
  date: number;
  metrics: IMetrics;
}

const now = () => new Date(Date.now()).toISOString();

export default class StatsDatabase implements IStatsDatabase {
  private db: loki;

  private metrics: Collection<IDBEntry>;

  public constructor(private createCurrentReport: () => IMetrics) {
    this.db = new loki("stats-database");
    this.metrics = this.db.addCollection("metrics");
  }

  public async close(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.db.close(e => {
        if (e) {
          reject(e);
        } else {
          resolve();
        }
      });
    });
  }

  public async addCustomEvent(eventType: string, customEvent: any): Promise<void> {
    const report = await this.getCurrentMetrics();
    customEvent.date = now();
    customEvent.eventType = eventType;
    report.metrics.customEvents.push(customEvent);

    await this.metrics.update(report);
  }

  public async incrementCounter(counterName: string): Promise<void> {
    const report = await this.getCurrentMetrics();

    if (!report.metrics.measures.hasOwnProperty(counterName)) {
      report.metrics.measures[counterName] = 0;
    }
    report.metrics.measures[counterName]++;
    await this.metrics.update(report);
  }

  public async addTiming(eventType: string, durationInMilliseconds: number, metadata = {}): Promise<void> {
    const report = await this.getCurrentMetrics();
    report.metrics.timings.push({ eventType, durationInMilliseconds, metadata, date: now() });
    await this.metrics.update(report);
  }

  /** Clears all values that exist in the database.
   * returns nothing.
   */
  public async clearData(date?: Date): Promise<void> {
    if (!date) {
      await this.metrics.clear();
    } else {
      const today = getYearMonthDay(date);
      await this.metrics.findAndRemove({ date: { $lt: today } });
    }
  }

  public async getMetrics(beforeDate?: Date): Promise<IMetrics[]> {
    if (beforeDate) {
      const today = getYearMonthDay(beforeDate);
      return this.metrics.find({ date: { $lt: today } }).map(x => x.metrics);
    } else {
      return this.metrics.find().map(x => x.metrics);
    }
  }

  async getMetricsForDate(date: Date): Promise<IMetrics | undefined> {
    const today = getYearMonthDay(date);
    const report = await this.metrics.findOne({ date: today });
    if (report) {
      return report.metrics;
    }
    return;
  }

  private async getCurrentMetrics(): Promise<IDBEntry> {
    const today = getYearMonthDay(new Date(Date.now()));
    let report = await this.metrics.findOne({ date: today });

    if (!report) {
      const newReport = this.createCurrentReport();
      report = (await this.metrics.insertOne({ date: today, metrics: newReport })) || null;
    }
    return report!;
  }
}
