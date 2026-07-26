import * as THREE from "three";
import { experienceRegistry, type ExperienceManifest } from "../experiences/registry";
import type { ExperienceRuntimeAction } from "../experiences/runtime";
import { SpatialTextPanel } from "../xr/SpatialTextPanel";

interface PortalRecord {
  manifest: ExperienceManifest;
  target: THREE.Mesh;
  root: THREE.Group;
  label: SpatialTextPanel;
}

const colors = {
  mint: 0x8dffdb,
  blue: 0x74cfff,
  amber: 0xffad68,
  coral: 0xff8278,
} as const;

export class SpatialHub {
  readonly root = new THREE.Group();
  #portals: PortalRecord[] = [];

  constructor() {
    const positions = [
      new THREE.Vector3(-1.8, 1.24, -3.18),
      new THREE.Vector3(-1.08, 1.46, -2.62),
      new THREE.Vector3(-0.38, 1.62, -3.38),
      new THREE.Vector3(0.38, 1.62, -3.38),
      new THREE.Vector3(1.08, 1.46, -2.62),
      new THREE.Vector3(1.8, 1.24, -3.18),
    ];

    const sharedExperiences = experienceRegistry.filter(
      (manifest) => manifest.kind === "shared",
    );
    for (const [index, manifest] of sharedExperiences.slice(0, positions.length).entries()) {
      const portal = this.#createPortal(manifest);
      portal.root.position.copy(positions[index]);
      this.root.add(portal.root);
      this.#portals.push(portal);
    }
    this.root.visible = false;
  }

  enter(): void {
    this.root.visible = true;
  }

  exit(): void {
    this.root.visible = false;
  }

  update(timeSeconds: number): void {
    if (!this.root.visible) {
      return;
    }
    for (const [index, portal] of this.#portals.entries()) {
      const offset = index * 0.7;
      portal.target.scale.setScalar(1 + Math.sin(timeSeconds * 1.2 + offset) * 0.025);
      portal.root.rotation.z = Math.sin(timeSeconds * 0.24 + offset) * 0.018;
    }
  }

  select(raycaster: THREE.Raycaster): ExperienceRuntimeAction | null {
    if (!this.root.visible) {
      return null;
    }
    const intersections = raycaster.intersectObjects(
      this.#portals.map((portal) => portal.target),
      false,
    );
    const hit = intersections[0]?.object;
    const portal = this.#portals.find((candidate) => candidate.target === hit);
    if (!portal) {
      return null;
    }
    if (portal.manifest.stage !== "prototype") {
      return {
        type: "experience-unavailable",
        experienceId: portal.manifest.id,
        detail: `${portal.manifest.englishTitle} is registered but still in development.`,
      };
    }
    return {
      type: "experience-entered",
      experienceId: portal.manifest.id,
      detail: `Entered ${portal.manifest.englishTitle} from the spatial Hub.`,
    };
  }

  dispose(): void {
    for (const portal of this.#portals) {
      portal.root.traverse((object) => {
        if (object instanceof THREE.Mesh && object !== portal.label.mesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) {
            for (const material of object.material) {
              material.dispose();
            }
          } else {
            object.material.dispose();
          }
        }
      });
      portal.label.dispose();
    }
    this.#portals = [];
  }

  #createPortal(manifest: ExperienceManifest): PortalRecord {
    const root = new THREE.Group();
    const color = colors[manifest.accent];
    const prototype = manifest.stage === "prototype";
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.34, prototype ? 0.014 : 0.008, 6, 56),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: prototype ? 0.9 : 0.32,
      }),
    );
    const target = new THREE.Mesh(
      new THREE.CircleGeometry(0.3, 32),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: prototype ? 0.085 : 0.025,
        depthWrite: false,
      }),
    );
    target.position.z = 0.01;

    const label = new SpatialTextPanel({
      widthMeters: 0.7,
      heightMeters: 0.18,
      widthPixels: 768,
      heightPixels: 232,
      renderOrder: 12,
    });
    label.draw({
      title: manifest.title,
      subtitle: prototype ? "注视并捏合进入" : "开发中",
      accent: `#${color.toString(16).padStart(6, "0")}`,
    });
    label.mesh.position.set(0, -0.49, 0.02);

    root.add(ring, target, label.mesh);
    return { manifest, target, root, label };
  }
}
