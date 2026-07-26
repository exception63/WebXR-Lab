export type SupportState =
  | "supported"
  | "unsupported"
  | "unavailable"
  | "unknown"
  | "error";

export interface SessionSupport {
  state: SupportState;
  error?: string;
}

export interface WebGLSnapshot {
  available: boolean;
  version?: string;
  renderer?: string;
  vendor?: string;
  maxTextureSize?: number;
  maxSamples?: number;
  extensions: string[];
}

export interface SpatialWebSnapshot {
  modelElement: boolean;
  requestImmersive: boolean;
  immersiveElement: boolean;
  exitImmersive: boolean;
}

export interface InputSourceSnapshot {
  id: string;
  handedness: XRHandedness;
  targetRayMode: XRTargetRayMode;
  profiles: string[];
  hasGripSpace: boolean;
  hasHand: boolean;
  handJointCount: number;
  hasGamepad: boolean;
}

export interface ProbeEvent {
  at: string;
  type: string;
  detail: string;
}

export interface FrameMetrics {
  sampleCount: number;
  medianMs: number | null;
  p95Ms: number | null;
  maximumMs: number | null;
}

export interface ActiveSessionSnapshot {
  mode: XRSessionMode;
  state: "starting" | "active" | "ended" | "error";
  requestedFeatures: string[];
  referenceSpace?: XRReferenceSpaceType;
  startedAt: string;
  endedAt?: string;
  error?: string;
}

export interface CapabilityReport {
  schemaVersion: 1;
  generatedAt: string;
  buildId: string;
  page: {
    url: string;
    secureContext: boolean;
    crossOriginIsolated: boolean;
  };
  browser: {
    userAgent: string;
    language: string;
    platform: string;
    hardwareConcurrency: number | null;
    viewport: {
      width: number;
      height: number;
      devicePixelRatio: number;
    };
  };
  webgl: WebGLSnapshot;
  webxr: {
    apiAvailable: boolean;
    immersiveVR: SessionSupport;
    immersiveAR: SessionSupport;
  };
  spatialWeb: SpatialWebSnapshot;
  session: ActiveSessionSnapshot | null;
  inputSources: InputSourceSnapshot[];
  frameMetrics: FrameMetrics;
  events: ProbeEvent[];
}
