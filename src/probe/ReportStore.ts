import { summarizeFrameTimes } from "./metrics";
import type {
  ActiveSessionSnapshot,
  CapabilityReport,
  InputSourceSnapshot,
  ProbeEvent,
} from "./types";

const maximumEvents = 160;
const maximumFrameSamples = 1800;

export class ReportStore extends EventTarget {
  #report: CapabilityReport;
  #frameSamples: number[] = [];
  #lastFrameTime: number | null = null;
  #framesSinceNotification = 0;
  #frameSampleCursor = 0;

  constructor(report: CapabilityReport) {
    super();
    this.#report = report;
  }

  get snapshot(): CapabilityReport {
    return structuredClone(this.#report);
  }

  setSession(session: ActiveSessionSnapshot | null): void {
    this.#report.session = session;
    this.#frameSamples = [];
    this.#frameSampleCursor = 0;
    this.#lastFrameTime = null;
    this.#framesSinceNotification = 0;
    this.#report.frameMetrics = summarizeFrameTimes([]);
    this.#notify();
  }

  patchSession(patch: Partial<ActiveSessionSnapshot>): void {
    if (!this.#report.session) {
      return;
    }
    this.#report.session = { ...this.#report.session, ...patch };
    this.#notify();
  }

  setInputSources(inputSources: InputSourceSnapshot[]): void {
    this.#report.inputSources = inputSources;
    this.#notify();
  }

  addEvent(type: string, detail: string): void {
    const event: ProbeEvent = {
      at: new Date().toISOString(),
      type,
      detail,
    };
    this.#report.events.push(event);
    this.#report.events = this.#report.events.slice(-maximumEvents);
    this.#notify();
  }

  recordFrame(time: number): void {
    if (this.#lastFrameTime !== null) {
      const delta = time - this.#lastFrameTime;
      if (delta > 0 && delta < 250) {
        if (this.#frameSamples.length < maximumFrameSamples) {
          this.#frameSamples.push(delta);
        } else {
          this.#frameSamples[this.#frameSampleCursor] = delta;
          this.#frameSampleCursor = (this.#frameSampleCursor + 1) % maximumFrameSamples;
        }
      }
    }
    this.#lastFrameTime = time;
    this.#framesSinceNotification += 1;

    if (this.#framesSinceNotification >= 180) {
      this.#framesSinceNotification = 0;
      this.#report.frameMetrics = summarizeFrameTimes(this.#frameSamples);
      this.#notify();
    }
  }

  refreshGeneratedAt(): void {
    this.#report.generatedAt = new Date().toISOString();
  }

  #notify(): void {
    this.dispatchEvent(new Event("change"));
  }
}
