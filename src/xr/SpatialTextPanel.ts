import * as THREE from "three";

interface SpatialTextPanelOptions {
  widthMeters: number;
  heightMeters: number;
  widthPixels?: number;
  heightPixels?: number;
  renderOrder?: number;
}

export class SpatialTextPanel {
  readonly mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;

  #canvas: HTMLCanvasElement;
  #context: CanvasRenderingContext2D;
  #texture: THREE.CanvasTexture;

  constructor(options: SpatialTextPanelOptions) {
    this.#canvas = document.createElement("canvas");
    this.#canvas.width = options.widthPixels ?? 1024;
    this.#canvas.height = options.heightPixels ?? 256;
    const context = this.#canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas 2D is required for spatial text panels.");
    }
    this.#context = context;
    this.#texture = new THREE.CanvasTexture(this.#canvas);
    this.#texture.colorSpace = THREE.SRGBColorSpace;
    this.#texture.minFilter = THREE.LinearFilter;

    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(options.widthMeters, options.heightMeters),
      new THREE.MeshBasicMaterial({
        map: this.#texture,
        transparent: true,
        depthTest: false,
      }),
    );
    this.mesh.renderOrder = options.renderOrder ?? 30;
  }

  draw({
    title,
    subtitle,
    accent = "#7affe0",
    background = "#06100d",
  }: {
    title: string;
    subtitle: string;
    accent?: string;
    background?: string;
  }): void {
    const width = this.#canvas.width;
    const height = this.#canvas.height;
    const context = this.#context;
    context.clearRect(0, 0, width, height);
    context.fillStyle = background;
    context.fillRect(0, 0, width, height);
    context.strokeStyle = accent;
    context.lineWidth = Math.max(2, Math.round(width * 0.006));
    context.strokeRect(5, 5, width - 10, height - 10);
    context.fillStyle = "#effff9";
    context.font = `700 ${Math.round(height * 0.31)}px -apple-system, "PingFang SC", sans-serif`;
    context.textAlign = "center";
    context.fillText(title, width / 2, height * 0.48);
    context.fillStyle = "#9bd9c6";
    context.font = `400 ${Math.round(height * 0.16)}px -apple-system, "PingFang SC", sans-serif`;
    context.fillText(subtitle, width / 2, height * 0.73);
    this.#texture.needsUpdate = true;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.#texture.dispose();
    this.mesh.material.dispose();
  }
}

