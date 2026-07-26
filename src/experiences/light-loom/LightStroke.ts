import * as THREE from "three";

const maximumPoints = 192;
const minimumPointDistanceSquared = 0.0001;

const vertexShader = `
  attribute float aProgress;
  uniform float uTime;
  varying float vProgress;
  varying float vPulse;

  void main() {
    vProgress = aProgress;
    vPulse = 0.72 + 0.28 * sin(uTime * 3.0 + aProgress * 18.0);
    vec3 p = position;
    p.x += sin(uTime * 1.7 + aProgress * 15.0) * 0.0035;
    p.y += cos(uTime * 1.3 + aProgress * 13.0) * 0.0035;
    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
    float perspectiveSize = clamp(1.4 / max(0.35, -mvPosition.z), 0.72, 2.4);
    gl_PointSize = mix(8.0, 4.5, aProgress) * perspectiveSize;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  uniform vec3 uBaseColor;
  uniform float uTime;
  varying float vProgress;
  varying float vPulse;

  vec3 cosinePalette(float t) {
    vec3 a = vec3(0.52, 0.56, 0.58);
    vec3 b = vec3(0.42, 0.38, 0.34);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.02, 0.18, 0.32);
    return a + b * cos(6.28318 * (c * t + d));
  }

  void main() {
    vec2 centered = gl_PointCoord - vec2(0.5);
    float distanceToCenter = length(centered);
    float core = 1.0 - smoothstep(0.05, 0.18, distanceToCenter);
    float halo = 1.0 - smoothstep(0.18, 0.5, distanceToCenter);
    float alpha = (core * 0.72 + halo * 0.24) * vPulse;
    if (alpha < 0.01) {
      discard;
    }
    vec3 spectrum = cosinePalette(vProgress * 0.72 + uTime * 0.025);
    vec3 color = mix(uBaseColor, spectrum, 0.38 + 0.25 * vProgress);
    gl_FragColor = vec4(color, alpha);
  }
`;

export class LightStroke {
  readonly points: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;

  #geometry = new THREE.BufferGeometry();
  #positions = new Float32Array(maximumPoints * 3);
  #progress = new Float32Array(maximumPoints);
  #positionAttribute = new THREE.BufferAttribute(this.#positions, 3);
  #progressAttribute = new THREE.BufferAttribute(this.#progress, 1);
  #material: THREE.ShaderMaterial;
  #lastPoint = new THREE.Vector3(Number.POSITIVE_INFINITY, 0, 0);
  #pointCount = 0;

  constructor(color: THREE.ColorRepresentation) {
    this.#positionAttribute.setUsage(THREE.DynamicDrawUsage);
    this.#progressAttribute.setUsage(THREE.DynamicDrawUsage);
    this.#geometry.setAttribute("position", this.#positionAttribute);
    this.#geometry.setAttribute("aProgress", this.#progressAttribute);
    this.#geometry.setDrawRange(0, 0);
    this.#material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uBaseColor: { value: new THREE.Color(color) },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(this.#geometry, this.#material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 16;
  }

  get pointCount(): number {
    return this.#pointCount;
  }

  append(point: THREE.Vector3): boolean {
    if (this.#pointCount >= maximumPoints) {
      return false;
    }
    if (
      this.#pointCount > 0 &&
      this.#lastPoint.distanceToSquared(point) < minimumPointDistanceSquared
    ) {
      return false;
    }

    const index = this.#pointCount;
    this.#positionAttribute.setXYZ(index, point.x, point.y, point.z);
    this.#progressAttribute.setX(index, index / Math.max(1, maximumPoints - 1));
    this.#positionAttribute.needsUpdate = true;
    this.#progressAttribute.needsUpdate = true;
    this.#pointCount += 1;
    this.#geometry.setDrawRange(0, this.#pointCount);
    this.#lastPoint.copy(point);
    return true;
  }

  update(timeSeconds: number): void {
    this.#material.uniforms.uTime.value = timeSeconds;
  }

  dispose(): void {
    this.#geometry.dispose();
    this.#material.dispose();
  }
}

