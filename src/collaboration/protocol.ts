export interface ResonanceState {
  revision: number;
  colorIndex: number;
  energy: number;
  lastActor: string;
  updatedAt: number;
}

export interface ResonanceMessage {
  type: "resonate";
  actor: string;
}

export const initialResonanceState: ResonanceState = {
  revision: 0,
  colorIndex: 0,
  energy: 0,
  lastActor: "none",
  updatedAt: 0,
};

export function isResonanceMessage(value: unknown): value is ResonanceMessage {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<ResonanceMessage>;
  return (
    candidate.type === "resonate" &&
    typeof candidate.actor === "string" &&
    candidate.actor.length > 0 &&
    candidate.actor.length <= 32
  );
}

export function applyResonance(
  state: ResonanceState,
  message: ResonanceMessage,
  now: number,
): ResonanceState {
  return {
    revision: state.revision + 1,
    colorIndex: (state.colorIndex + 1) % 6,
    energy: Math.min(1, state.energy * 0.62 + 0.46),
    lastActor: message.actor,
    updatedAt: now,
  };
}

export function parseResonanceState(value: unknown): ResonanceState | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const candidate = value as Partial<ResonanceState> & { type?: string };
  if (
    candidate.type !== "state" ||
    !Number.isInteger(candidate.revision) ||
    !Number.isInteger(candidate.colorIndex) ||
    typeof candidate.energy !== "number" ||
    !Number.isFinite(candidate.energy) ||
    typeof candidate.lastActor !== "string" ||
    typeof candidate.updatedAt !== "number"
  ) {
    return null;
  }
  return {
    revision: Math.max(0, candidate.revision!),
    colorIndex: Math.max(0, candidate.colorIndex! % 6),
    energy: Math.max(0, Math.min(1, candidate.energy)),
    lastActor: candidate.lastActor.slice(0, 32),
    updatedAt: candidate.updatedAt,
  };
}
