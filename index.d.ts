declare module "telemetry-github" {
  export interface ISettings {
    getItem(key: string): string | undefined;
    setItem(key: string, value: string): void;
  }

  export interface IDimensions {
    /** The app version. */
    readonly appVersion: string;

    /** the platform */
    readonly platform: string;

    /** The install ID. */
    readonly guid: string;

    /** The date the metrics were sent, in ISO-8601 format */
    readonly date: string;

    readonly eventType: "usage";

    readonly language: string;

    readonly gitHubUser: string | undefined;
  }

  export interface IMetrics {
    dimensions: IDimensions;
    // metrics names are defined by the client and thus aren't knowable
    // at compile time here.
    measures: object;

    // array of custom events that can be defined by the client
    customEvents: object[];

    // array of timing events
    timings: object[];
  }

  interface ICounter {
    name: string;
    count: number;
  }

  export interface IStatsDatabase {
    close(): void;
    incrementCounter(counterName: string): void;
    clearData(): void;
    getCounters(): Promise<ICounter[]>;
    addCustomEvent(eventType: string, customEvent: any): void;
    addTiming(eventType: string, durationInMilliseconds: number, metadata: object): void;
    getCustomEvents(): Promise<object[]>;
    getTimings(): Promise<object[]>;
  }

  export enum AppName {
    Atom = "atom",
    VSCode = "vscode",
  }

  export class StatsStore {
    constructor(
      appName: AppName,
      version: string,
      isDevMode: boolean,
      getAccessToken?: () => string,
      settings?: ISettings,
      database?: IStatsDatabase
    );

    shutdown();

    setGitHubUser(gitHubUser: string): void;
    /** Set whether the user has opted out of stats reporting. */
    setOptOut(optOut: boolean): Promise<void>;
    reportStats(getDate: () => string): Promise<void>;
    sendOptInStatusPing(optIn: boolean): Promise<void>;
    getDailyStats(getDate: () => string): Promise<IMetrics>;
    addCustomEvent(eventType: string, event: object): Promise<void>;
    /**
     * Add timing data to the stats store, to be sent with the daily metrics requests.
     */
    addTiming(eventType: string, durationInMilliseconds: number, metadata?: {}): Promise<void>;
    /**
     * Increment a counter.  This is used to track usage statistics.
     */
    incrementCounter(counterName: string): Promise<void>;
    /** Should the app report its daily stats?
     * Public for testing purposes only.
     */
    hasReportingIntervalElapsed(): boolean;
  }
}
