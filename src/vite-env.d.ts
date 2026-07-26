/// <reference types="vite/client" />
/// <reference types="webxr" />

interface HTMLModelElement extends HTMLElement {
  ready?: Promise<void>;
  requestImmersive?: () => Promise<void>;
  entityTransform?: DOMMatrix;
}

interface Document {
  immersiveEnabled?: boolean;
  immersiveElement?: Element | null;
  exitImmersive?: () => Promise<void>;
}
