import {
  applyResonance,
  initialResonanceState,
  parseResonanceState,
  type ResonanceState,
} from "./protocol";

export type CollaborationStatus = "offline" | "connecting" | "connected";

export class CollaborationClient extends EventTarget {
  #url: string;
  #actorId: string;
  #socket: WebSocket | null = null;
  #state = { ...initialResonanceState };
  #status: CollaborationStatus = "offline";
  #shouldReconnect = false;
  #reconnectAttempts = 0;
  #reconnectTimer: number | null = null;

  constructor(url: string, actorId: string) {
    super();
    this.#url = url;
    this.#actorId = actorId.slice(0, 32);
  }

  get state(): ResonanceState {
    return { ...this.#state };
  }

  get status(): CollaborationStatus {
    return this.#status;
  }

  connect(): void {
    this.#shouldReconnect = true;
    if (
      this.#socket?.readyState === WebSocket.OPEN ||
      this.#socket?.readyState === WebSocket.CONNECTING
    ) {
      return;
    }

    this.#setStatus("connecting");
    const socket = new WebSocket(this.#url);
    this.#socket = socket;
    socket.addEventListener("open", () => {
      this.#reconnectAttempts = 0;
      this.#setStatus("connected");
    });
    socket.addEventListener("message", (event) => {
      try {
        const nextState = parseResonanceState(JSON.parse(String(event.data)));
        if (nextState) {
          this.#state = nextState;
          this.dispatchEvent(new Event("statechange"));
        }
      } catch {
        // Ignore malformed room messages; the local exhibit remains usable.
      }
    });
    socket.addEventListener("close", () => {
      if (this.#socket === socket) {
        this.#socket = null;
      }
      this.#setStatus("offline");
      this.#scheduleReconnect();
    });
    socket.addEventListener("error", () => socket.close());
  }

  disconnect(): void {
    this.#shouldReconnect = false;
    if (this.#reconnectTimer !== null) {
      window.clearTimeout(this.#reconnectTimer);
      this.#reconnectTimer = null;
    }
    this.#socket?.close(1000, "experience-exit");
    this.#socket = null;
    this.#setStatus("offline");
  }

  resonate(): void {
    const message = { type: "resonate" as const, actor: this.#actorId };
    if (this.#socket?.readyState === WebSocket.OPEN) {
      this.#socket.send(JSON.stringify(message));
      return;
    }
    this.#state = applyResonance(this.#state, message, Date.now());
    this.dispatchEvent(new Event("statechange"));
  }

  #scheduleReconnect(): void {
    if (!this.#shouldReconnect || this.#reconnectTimer !== null) {
      return;
    }
    const delay = Math.min(8_000, 500 * 2 ** this.#reconnectAttempts);
    this.#reconnectAttempts += 1;
    this.#reconnectTimer = window.setTimeout(() => {
      this.#reconnectTimer = null;
      this.connect();
    }, delay);
  }

  #setStatus(status: CollaborationStatus): void {
    if (this.#status === status) {
      return;
    }
    this.#status = status;
    this.dispatchEvent(new Event("statuschange"));
  }
}
