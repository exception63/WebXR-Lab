import { Vector3 } from "three";

export interface TwoHandTransformValue {
  scale: number;
  rotationZ: number;
}

export class TwoHandTransform {
  #initialVector = new Vector3();
  #initialDistance = 0;
  #initialScale = 1;
  #initialRotationZ = 0;
  #active = false;

  begin(
    first: Vector3,
    second: Vector3,
    initialScale: number,
    initialRotationZ: number,
  ): boolean {
    this.#initialVector.subVectors(second, first);
    this.#initialDistance = this.#initialVector.length();
    if (this.#initialDistance < 0.04) {
      this.#active = false;
      return false;
    }
    this.#initialScale = initialScale;
    this.#initialRotationZ = initialRotationZ;
    this.#active = true;
    return true;
  }

  update(first: Vector3, second: Vector3): TwoHandTransformValue | null {
    if (!this.#active) {
      return null;
    }
    const currentVector = new Vector3().subVectors(second, first);
    const distanceRatio = currentVector.length() / this.#initialDistance;
    const initialAngle = Math.atan2(this.#initialVector.y, this.#initialVector.x);
    const currentAngle = Math.atan2(currentVector.y, currentVector.x);
    return {
      scale: Math.min(1.85, Math.max(0.42, this.#initialScale * distanceRatio)),
      rotationZ: this.#initialRotationZ + currentAngle - initialAngle,
    };
  }

  reset(): void {
    this.#active = false;
  }
}

