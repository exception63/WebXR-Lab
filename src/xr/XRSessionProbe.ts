import * as THREE from "three";
import type { ExperienceRuntimeAction } from "../experiences/runtime";
import type { ReportStore } from "../probe/ReportStore";
import type { InputSourceSnapshot } from "../probe/types";
import type { ProbeScene } from "./ProbeScene";
import {
  adaptXRInputAction,
  sourceLostAction,
  type XRInteractionEventType,
} from "./input/InputAdapter";

interface InputVisual {
  ray: THREE.Line;
  grip: THREE.Mesh;
  joints: THREE.InstancedMesh<THREE.SphereGeometry, THREE.MeshBasicMaterial> | null;
  material: THREE.MeshBasicMaterial;
}

const vrOptionalFeatures = [
  "local-floor",
  "bounded-floor",
  "hand-tracking",
  "layers",
] as const;

const arOptionalFeatures = [
  "local-floor",
  "hand-tracking",
  "hit-test",
  "anchors",
  "plane-detection",
  "mesh-detection",
  "light-estimation",
] as const;

export function optionalFeaturesForMode(mode: XRSessionMode): readonly string[] {
  return mode === "immersive-ar" ? arOptionalFeatures : vrOptionalFeatures;
}

export class XRSessionProbe extends EventTarget {
  #probeScene: ProbeScene;
  #reportStore: ReportStore;
  #session: XRSession | null = null;
  #sessionMode: XRSessionMode | null = null;
  #referenceSpace: XRReferenceSpace | null = null;
  #referenceSpaceType: XRReferenceSpaceType | null = null;
  #sourceIds = new Map<XRInputSource, string>();
  #visuals = new Map<XRInputSource, InputVisual>();
  #sourceCounter = 0;
  #jointMatrix = new THREE.Matrix4();
  #jointScale = new THREE.Vector3();
  #hitTestSource: XRHitTestSource | null = null;
  #lastHitTestResult: XRHitTestResult | null = null;
  #lastMRCounts = "";
  #lastMRLogTime = 0;

  constructor(probeScene: ProbeScene, reportStore: ReportStore) {
    super();
    this.#probeScene = probeScene;
    this.#reportStore = reportStore;
    this.#probeScene.setFrameObserver(this.#onFrame);
  }

  get active(): boolean {
    return this.#session !== null;
  }

  async start(mode: XRSessionMode): Promise<void> {
    if (!navigator.xr) {
      throw new Error("navigator.xr is unavailable in this browsing context.");
    }
    if (this.#session) {
      throw new Error("An XR session is already active.");
    }

    const startedAt = new Date().toISOString();
    const optionalFeatures = optionalFeaturesForMode(mode);
    this.#reportStore.setSession({
      mode,
      state: "starting",
      requestedFeatures: [...optionalFeatures],
      startedAt,
    });
    this.#reportStore.addEvent(
      "session-request",
      `${mode}; optionalFeatures=${optionalFeatures.join(",")}`,
    );

    try {
      const session = await navigator.xr.requestSession(mode, {
        optionalFeatures: [...optionalFeatures],
      });
      this.#session = session;
      this.#sessionMode = mode;
      this.#bindSessionEvents(session);

      this.#probeScene.setSessionMode(mode);
      await this.#probeScene.renderer.xr.setSession(session);
      await this.#resolveReferenceSpace(session);
      await this.#setupMRHitTest(session);

      this.#reportStore.patchSession({
        state: "active",
        referenceSpace: this.#referenceSpaceType ?? undefined,
      });
      this.#reportStore.addEvent(
        "session-active",
        `${mode}; referenceSpace=${this.#referenceSpaceType ?? "unknown"}`,
      );
      this.#probeScene.setExitControlVisible(true);
      this.#syncInputSources();
    } catch (error) {
      const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
      this.#reportStore.patchSession({
        state: "error",
        error: message,
      });
      this.#reportStore.addEvent("session-error", message);
      this.#probeScene.setExitControlVisible(false);
      this.#probeScene.setSessionMode(null);
      this.#session = null;
      this.#sessionMode = null;
      throw error;
    }
  }

  async end(): Promise<void> {
    await this.#session?.end();
  }

  #bindSessionEvents(session: XRSession): void {
    session.addEventListener("end", this.#onSessionEnd, { once: true });
    session.addEventListener("inputsourceschange", this.#onInputSourcesChange);
    session.addEventListener("selectstart", this.#onSelectStart);
    session.addEventListener("select", this.#onSelect);
    session.addEventListener("selectend", this.#onSelectEnd);
    session.addEventListener("squeezestart", this.#onSqueezeStart);
    session.addEventListener("squeeze", this.#onSqueeze);
    session.addEventListener("squeezeend", this.#onSqueezeEnd);
    session.addEventListener("visibilitychange", this.#onVisibilityChange);
  }

  async #resolveReferenceSpace(session: XRSession): Promise<void> {
    const referenceSpaceTypes: XRReferenceSpaceType[] = ["local-floor", "local", "viewer"];
    let lastError: unknown = null;

    for (const type of referenceSpaceTypes) {
      try {
        this.#referenceSpace = await session.requestReferenceSpace(type);
        this.#referenceSpaceType = type;
        this.#reportStore.addEvent("reference-space", `Acquired ${type}.`);
        return;
      } catch (error) {
        lastError = error;
        this.#reportStore.addEvent(
          "reference-space-rejected",
          `${type}: ${error instanceof Error ? error.name : String(error)}`,
        );
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error("No compatible XR reference space could be acquired.");
  }

  #onFrame = (frame: XRFrame | null, time: number): void => {
    if (!frame || !this.#referenceSpace || !this.#session) {
      return;
    }

    this.#reportStore.recordFrame(time);
    this.#updateMRTracking(frame, time);
    for (const source of this.#session.inputSources) {
      this.#updateSourceVisual(frame, source, time);
    }
  };

  #updateSourceVisual(frame: XRFrame, source: XRInputSource, time: number): void {
    const visual = this.#visuals.get(source) ?? this.#createSourceVisual(source);
    const rayPose = frame.getPose(source.targetRaySpace, this.#referenceSpace!);

    if (rayPose) {
      visual.ray.visible = true;
      visual.ray.matrix.fromArray(rayPose.transform.matrix);
    } else {
      visual.ray.visible = false;
    }

    let gripPose: XRPose | undefined;
    if (source.gripSpace) {
      gripPose = frame.getPose(source.gripSpace, this.#referenceSpace!);
      if (gripPose) {
        visual.grip.visible = true;
        visual.grip.matrix.fromArray(gripPose.transform.matrix);
      } else {
        visual.grip.visible = false;
      }
    } else {
      visual.grip.visible = false;
    }

    if (source.hand) {
      let jointIndex = 0;
      for (const jointSpace of source.hand.values()) {
        const jointPose = frame.getJointPose?.(jointSpace, this.#referenceSpace!);
        if (!jointPose) {
          continue;
        }

        this.#jointMatrix.fromArray(jointPose.transform.matrix);
        const radius = jointPose.radius ?? 0.008;
        this.#jointScale.setScalar(Math.max(0.35, radius / 0.008));
        this.#jointMatrix.scale(this.#jointScale);
        visual.joints?.setMatrixAt(jointIndex, this.#jointMatrix);
        jointIndex += 1;
      }
      if (visual.joints) {
        visual.joints.count = jointIndex;
        visual.joints.instanceMatrix.needsUpdate = jointIndex > 0;
      }
    }

    this.#probeScene.updateInputPose({
      timestampSeconds: time / 1000,
      sourceId: this.#sourceId(source),
      handedness: source.handedness,
      targetRayMode: source.targetRayMode,
      targetRayMatrix: rayPose?.transform.matrix ?? null,
      gripMatrix: gripPose?.transform.matrix ?? null,
    });
  }

  #createSourceVisual(source: XRInputSource): InputVisual {
    const color = source.handedness === "left" ? 0x49e7ff : source.handedness === "right" ? 0xffad62 : 0xa2ffe0;
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.9,
      depthTest: false,
    });

    const rayGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -2.4),
    ]);
    const ray = new THREE.Line(
      rayGeometry,
      new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.72,
        depthTest: false,
      }),
    );
    ray.matrixAutoUpdate = false;
    ray.renderOrder = 20;

    const grip = new THREE.Mesh(new THREE.SphereGeometry(0.024, 10, 7), material);
    grip.matrixAutoUpdate = false;
    grip.renderOrder = 21;

    const joints = source.hand
      ? new THREE.InstancedMesh(
          new THREE.SphereGeometry(0.008, 6, 4),
          material,
          source.hand.size,
        )
      : null;
    if (joints) {
      joints.count = 0;
      joints.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      joints.frustumCulled = false;
      joints.renderOrder = 22;
      this.#probeScene.inputRoot.add(joints);
    }

    this.#probeScene.inputRoot.add(ray, grip);

    const visual: InputVisual = {
      ray,
      grip,
      joints,
      material,
    };
    this.#visuals.set(source, visual);
    return visual;
  }

  #sourceId(source: XRInputSource): string {
    const existing = this.#sourceIds.get(source);
    if (existing) {
      return existing;
    }
    this.#sourceCounter += 1;
    const id = `input-${String(this.#sourceCounter).padStart(2, "0")}`;
    this.#sourceIds.set(source, id);
    return id;
  }

  #describeSource(source: XRInputSource): InputSourceSnapshot {
    return {
      id: this.#sourceId(source),
      handedness: source.handedness,
      targetRayMode: source.targetRayMode,
      profiles: [...source.profiles],
      hasGripSpace: Boolean(source.gripSpace),
      hasHand: Boolean(source.hand),
      handJointCount: source.hand?.size ?? 0,
      hasGamepad: Boolean(source.gamepad),
    };
  }

  #syncInputSources(): void {
    if (!this.#session) {
      this.#reportStore.setInputSources([]);
      return;
    }
    this.#reportStore.setInputSources(
      [...this.#session.inputSources].map((source) => this.#describeSource(source)),
    );
  }

  #logInputEvent(type: string, source: XRInputSource): void {
    const snapshot = this.#describeSource(source);
    this.#reportStore.addEvent(
      type,
      `${snapshot.id}; hand=${snapshot.handedness}; ray=${snapshot.targetRayMode}; joints=${snapshot.handJointCount}; profiles=${snapshot.profiles.join("|") || "none"}`,
    );
  }

  #onInputSourcesChange = (event: XRInputSourcesChangeEvent): void => {
    for (const source of event.added) {
      this.#logInputEvent("input-added", source);
    }
    for (const source of event.removed) {
      this.#logInputEvent("input-removed", source);
      this.#dispatchSourceLost(source);
      this.#disposeSourceVisual(source);
    }
    this.#syncInputSources();
  };

  #onSelectStart = (event: XRInputSourceEvent): void => {
    this.#logInputEvent("selectstart", event.inputSource);
    this.#dispatchInputAction("selectstart", event.inputSource);
    this.#probeScene.pulseCore();
  };

  #onSelect = async (event: XRInputSourceEvent): Promise<void> => {
    const rayPose = this.#referenceSpace
      ? event.frame.getPose(event.inputSource.targetRaySpace, this.#referenceSpace)
      : null;
    this.#logInputEvent("select", event.inputSource);
    const exitAction = rayPose
      ? this.#probeScene.handleExitSelect(rayPose.transform.matrix)
      : null;
    if (exitAction?.type === "exit-save") {
      this.#reportStore.addEvent("exit-save-request", exitAction.detail);
      void this.end();
      return;
    }

    const anchor =
      this.#sessionMode === "immersive-ar" ? await this.#createAnchorForLastHit() : null;
    const action = await this.#probeScene.handleSelect(
      rayPose?.transform.matrix ?? null,
      anchor,
    );
    if (action?.type === "exit-save") {
      this.#reportStore.addEvent(
        "exit-save-request",
        action.detail,
      );
      void this.end();
      return;
    }
    if (action) {
      this.#logSceneAction(action);
    }
    this.#dispatchInputAction("select", event.inputSource);
  };

  #onSelectEnd = (event: XRInputSourceEvent): void => {
    this.#logInputEvent("selectend", event.inputSource);
    this.#dispatchInputAction("selectend", event.inputSource);
  };

  #onSqueezeStart = (event: XRInputSourceEvent): void => {
    this.#logInputEvent("squeezestart", event.inputSource);
    this.#dispatchInputAction("squeezestart", event.inputSource);
  };

  #onSqueeze = (event: XRInputSourceEvent): void => {
    this.#logInputEvent("squeeze", event.inputSource);
    this.#dispatchInputAction("squeeze", event.inputSource);
  };

  #onSqueezeEnd = (event: XRInputSourceEvent): void => {
    this.#logInputEvent("squeezeend", event.inputSource);
    this.#dispatchInputAction("squeezeend", event.inputSource);
  };

  #dispatchInputAction(
    eventType: XRInteractionEventType,
    source: XRInputSource,
  ): void {
    const action = adaptXRInputAction(eventType, this.#sourceId(source), source);
    const sceneAction = this.#probeScene.handleInput(action);
    if (sceneAction) {
      this.#logSceneAction(sceneAction);
    }
  }

  #dispatchSourceLost(source: XRInputSource): void {
    const action = sourceLostAction(this.#sourceId(source), source);
    const sceneAction = this.#probeScene.handleInput(action);
    if (sceneAction) {
      this.#logSceneAction(sceneAction);
    }
  }

  #logSceneAction(action: ExperienceRuntimeAction): void {
    this.#reportStore.addEvent(
      action.type,
      `${action.experienceId}; ${action.detail}`,
    );
  }

  #onVisibilityChange = (): void => {
    this.#reportStore.addEvent(
      "visibilitychange",
      `session.visibilityState=${this.#session?.visibilityState ?? "unknown"}`,
    );
  };

  #onSessionEnd = (): void => {
    this.#reportStore.addEvent("session-ended", "XR session ended.");
    this.#reportStore.patchSession({
      state: "ended",
      endedAt: new Date().toISOString(),
    });
    this.#clearVisuals();
    this.#hitTestSource?.cancel();
    this.#hitTestSource = null;
    this.#lastHitTestResult = null;
    this.#probeScene.updateMRHitPose(null);
    this.#probeScene.setExitControlVisible(false);
    this.#probeScene.setSessionMode(null);
    this.#session = null;
    this.#sessionMode = null;
    this.#referenceSpace = null;
    this.#referenceSpaceType = null;
    this.#sourceIds.clear();
    this.#syncInputSources();
    this.dispatchEvent(new Event("sessionend"));
  };

  #disposeSourceVisual(source: XRInputSource): void {
    const visual = this.#visuals.get(source);
    if (!visual) {
      return;
    }
    visual.ray.geometry.dispose();
    if (Array.isArray(visual.ray.material)) {
      for (const material of visual.ray.material) {
        material.dispose();
      }
    } else {
      visual.ray.material.dispose();
    }
    visual.grip.geometry.dispose();
    if (visual.joints) {
      visual.joints.geometry.dispose();
      this.#probeScene.inputRoot.remove(visual.joints);
    }
    visual.material.dispose();
    this.#probeScene.inputRoot.remove(visual.ray, visual.grip);
    this.#visuals.delete(source);
  }

  #clearVisuals(): void {
    for (const source of [...this.#visuals.keys()]) {
      this.#disposeSourceVisual(source);
    }
  }

  async #setupMRHitTest(session: XRSession): Promise<void> {
    if (this.#sessionMode !== "immersive-ar") {
      return;
    }
    if (typeof session.requestHitTestSource !== "function") {
      this.#reportStore.addEvent("mr-hit-test-unavailable", "requestHitTestSource missing.");
      return;
    }

    try {
      const viewerSpace = await session.requestReferenceSpace("viewer");
      const request = session.requestHitTestSource({ space: viewerSpace });
      this.#hitTestSource = request ? await request : null;
      this.#reportStore.addEvent(
        this.#hitTestSource ? "mr-hit-test-active" : "mr-hit-test-unavailable",
        this.#hitTestSource ? "viewer source acquired." : "request returned no source.",
      );
    } catch (error) {
      this.#hitTestSource = null;
      this.#reportStore.addEvent(
        "mr-hit-test-error",
        error instanceof Error ? `${error.name}: ${error.message}` : String(error),
      );
    }
  }

  #updateMRTracking(frame: XRFrame, time: number): void {
    if (this.#sessionMode !== "immersive-ar" || !this.#referenceSpace) {
      return;
    }

    this.#probeScene.updateMRAnchors(frame, this.#referenceSpace);
    if (!this.#hitTestSource) {
      this.#probeScene.updateMRHitPose(null);
      return;
    }

    const results = frame.getHitTestResults(this.#hitTestSource);
    this.#lastHitTestResult = results[0] ?? null;
    const pose = this.#lastHitTestResult?.getPose(this.#referenceSpace);
    this.#probeScene.updateMRHitPose(pose?.transform.matrix ?? null);

    const counts = `hits=${results.length}; planes=${frame.detectedPlanes?.size ?? 0}; meshes=${frame.detectedMeshes?.size ?? 0}; anchors=${frame.trackedAnchors?.size ?? 0}`;
    if (counts !== this.#lastMRCounts && time - this.#lastMRLogTime >= 1000) {
      this.#lastMRCounts = counts;
      this.#lastMRLogTime = time;
      this.#reportStore.addEvent("mr-tracking", counts);
    }
  }

  async #createAnchorForLastHit(): Promise<XRAnchor | null> {
    if (typeof this.#lastHitTestResult?.createAnchor !== "function") {
      return null;
    }
    try {
      const anchor = await this.#lastHitTestResult.createAnchor();
      this.#reportStore.addEvent("mr-anchor-created", "Hit-test result anchored.");
      return anchor;
    } catch (error) {
      this.#reportStore.addEvent(
        "mr-anchor-error",
        error instanceof Error ? `${error.name}: ${error.message}` : String(error),
      );
      return null;
    }
  }
}
