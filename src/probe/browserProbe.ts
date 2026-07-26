import type {
  CapabilityReport,
  SessionSupport,
  SpatialWebSnapshot,
  WebGLSnapshot,
} from "./types";

async function probeSessionSupport(mode: XRSessionMode): Promise<SessionSupport> {
  if (!navigator.xr) {
    return { state: "unavailable" };
  }

  try {
    return {
      state: (await navigator.xr.isSessionSupported(mode)) ? "supported" : "unsupported",
    };
  } catch (error) {
    return {
      state: "error",
      error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
    };
  }
}

function probeWebGL(): WebGLSnapshot {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("webgl2", {
    antialias: false,
    powerPreference: "high-performance",
  });

  if (!context) {
    return {
      available: false,
      extensions: [],
    };
  }

  const debugInfo = context.getExtension("WEBGL_debug_renderer_info");
  const renderer = debugInfo
    ? context.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
    : context.getParameter(context.RENDERER);
  const vendor = debugInfo
    ? context.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)
    : context.getParameter(context.VENDOR);

  return {
    available: true,
    version: context.getParameter(context.VERSION),
    renderer: typeof renderer === "string" ? renderer : String(renderer),
    vendor: typeof vendor === "string" ? vendor : String(vendor),
    maxTextureSize: context.getParameter(context.MAX_TEXTURE_SIZE),
    maxSamples: context.getParameter(context.MAX_SAMPLES),
    extensions: context.getSupportedExtensions() ?? [],
  };
}

function probeSpatialWeb(): SpatialWebSnapshot {
  const modelElement = document.createElement("model") as HTMLModelElement;
  const spatialWindow = window as typeof window & {
    HTMLModelElement?: typeof HTMLElement;
  };
  const immersiveDocument = document as Document & {
    immersiveElement?: Element | null;
    exitImmersive?: () => Promise<void>;
  };

  return {
    modelElement:
      typeof spatialWindow.HTMLModelElement !== "undefined" ||
      modelElement.constructor.name === "HTMLModelElement",
    requestImmersive: typeof modelElement.requestImmersive === "function",
    immersiveElement: "immersiveElement" in immersiveDocument,
    exitImmersive: typeof immersiveDocument.exitImmersive === "function",
  };
}

export async function createCapabilityReport(): Promise<CapabilityReport> {
  const [immersiveVR, immersiveAR] = await Promise.all([
    probeSessionSupport("immersive-vr"),
    probeSessionSupport("immersive-ar"),
  ]);

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    buildId: import.meta.env.VITE_BUILD_ID ?? "development",
    page: {
      url: window.location.href,
      secureContext: window.isSecureContext,
      crossOriginIsolated: window.crossOriginIsolated,
    },
    browser: {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      hardwareConcurrency: navigator.hardwareConcurrency || null,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio,
      },
    },
    webgl: probeWebGL(),
    webxr: {
      apiAvailable: Boolean(navigator.xr),
      immersiveVR,
      immersiveAR,
    },
    spatialWeb: probeSpatialWeb(),
    session: null,
    inputSources: [],
    frameMetrics: {
      sampleCount: 0,
      medianMs: null,
      p95Ms: null,
      maximumMs: null,
    },
    events: [
      {
        at: new Date().toISOString(),
        type: "browser-scan",
        detail: "Static browser and session-mode scan completed.",
      },
    ],
  };
}
