import { Vector3 } from "three";

const gravity = -9.81;
const floorHeight = 0.08;
const horizontalLimit = 2.2;
const nearLimit = -0.45;
const farLimit = -4.5;

export class SimpleBody {
  readonly position: Vector3;
  readonly velocity = new Vector3();
  readonly home: Vector3;
  readonly radius: number;
  readonly restitution: number;

  constructor({
    home,
    radius,
    restitution = 0.62,
  }: {
    home: Vector3;
    radius: number;
    restitution?: number;
  }) {
    this.home = home.clone();
    this.position = home.clone();
    this.radius = radius;
    this.restitution = restitution;
  }

  step(deltaSeconds: number): void {
    const delta = Math.min(Math.max(deltaSeconds, 0), 1 / 30);
    this.velocity.y += gravity * delta;
    this.velocity.multiplyScalar(Math.exp(-0.45 * delta));
    this.position.addScaledVector(this.velocity, delta);

    const bottom = this.position.y - this.radius;
    if (bottom < floorHeight) {
      this.position.y = floorHeight + this.radius;
      if (this.velocity.y < 0) {
        this.velocity.y *= -this.restitution;
      }
      this.velocity.x *= 0.92;
      this.velocity.z *= 0.92;
    }

    if (Math.abs(this.position.x) > horizontalLimit) {
      this.position.x = Math.sign(this.position.x) * horizontalLimit;
      this.velocity.x *= -this.restitution;
    }
    if (this.position.z > nearLimit) {
      this.position.z = nearLimit;
      this.velocity.z *= -this.restitution;
    } else if (this.position.z < farLimit) {
      this.position.z = farLimit;
      this.velocity.z *= -this.restitution;
    }

    if (!this.#isFinite() || this.position.y < -1.5 || this.position.lengthSq() > 100) {
      this.reset();
    }
  }

  reset(): void {
    this.position.copy(this.home);
    this.velocity.set(0, 0, 0);
  }

  #isFinite(): boolean {
    return (
      Number.isFinite(this.position.x) &&
      Number.isFinite(this.position.y) &&
      Number.isFinite(this.position.z) &&
      Number.isFinite(this.velocity.x) &&
      Number.isFinite(this.velocity.y) &&
      Number.isFinite(this.velocity.z)
    );
  }
}

