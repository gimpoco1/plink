import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

export type DieValue = 1 | 2 | 3 | 4 | 5 | 6;
export type DiceCount = 1 | 2;
export type DiceStateByCount<T> = Record<DiceCount, T>;

export const ROLL_DURATION_MS = 1380;
export const RESULT_REVEAL_DELAY_MS = 240;
const DIE_SIZE = 1.74;
const DIE_HALF = DIE_SIZE / 2;
const PIP_OFFSET = 0.38;
const PIP_RADIUS = 0.094;

export const DIE_FINAL_ROTATIONS: Record<DieValue, THREE.Euler> = {
  1: new THREE.Euler(0, 0, 0),
  2: new THREE.Euler(-Math.PI / 2, 0, 0),
  3: new THREE.Euler(0, -Math.PI / 2, 0),
  4: new THREE.Euler(0, Math.PI / 2, 0),
  5: new THREE.Euler(Math.PI / 2, 0, 0),
  6: new THREE.Euler(0, Math.PI, 0),
};

export function randomDieValue(): DieValue {
  return (Math.floor(Math.random() * 6) + 1) as DieValue;
}

export function formatRollSummary(values: DieValue[]) {
  if (values.length === 1) return `${values[0]}`;
  return `${values.join(" + ")} = ${values.reduce((sum, value) => sum + value, 0)}`;
}

function getPipPoints(value: DieValue) {
  const left = -PIP_OFFSET;
  const right = PIP_OFFSET;
  const top = PIP_OFFSET;
  const bottom = -PIP_OFFSET;
  const center = 0;

  switch (value) {
    case 1:
      return [[center, center]];
    case 2:
      return [
        [left, top],
        [right, bottom],
      ];
    case 3:
      return [
        [left, top],
        [center, center],
        [right, bottom],
      ];
    case 4:
      return [
        [left, top],
        [right, top],
        [left, bottom],
        [right, bottom],
      ];
    case 5:
      return [
        [left, top],
        [right, top],
        [center, center],
        [left, bottom],
        [right, bottom],
      ];
    case 6:
      return [
        [left, top],
        [right, top],
        [left, center],
        [right, center],
        [left, bottom],
        [right, bottom],
      ];
  }
}

function addPip(
  group: THREE.Group,
  material: THREE.Material,
  position: THREE.Vector3,
  rotation: THREE.Euler,
) {
  const pip = new THREE.Mesh(
    new THREE.CircleGeometry(PIP_RADIUS, 28),
    material,
  );
  pip.position.copy(position);
  pip.rotation.copy(rotation);
  group.add(pip);
}

function addPipsToFace(
  group: THREE.Group,
  value: DieValue,
  face: "front" | "back" | "right" | "left" | "top" | "bottom",
  material: THREE.Material,
) {
  const points = getPipPoints(value);
  const faceOffset = DIE_HALF + 0.006;

  points.forEach(([a, b]) => {
    switch (face) {
      case "front":
        addPip(
          group,
          material,
          new THREE.Vector3(a, b, faceOffset),
          new THREE.Euler(0, 0, 0),
        );
        break;
      case "back":
        addPip(
          group,
          material,
          new THREE.Vector3(-a, b, -faceOffset),
          new THREE.Euler(0, Math.PI, 0),
        );
        break;
      case "right":
        addPip(
          group,
          material,
          new THREE.Vector3(faceOffset, b, -a),
          new THREE.Euler(0, Math.PI / 2, 0),
        );
        break;
      case "left":
        addPip(
          group,
          material,
          new THREE.Vector3(-faceOffset, b, a),
          new THREE.Euler(0, -Math.PI / 2, 0),
        );
        break;
      case "top":
        addPip(
          group,
          material,
          new THREE.Vector3(a, faceOffset, -b),
          new THREE.Euler(-Math.PI / 2, 0, 0),
        );
        break;
      case "bottom":
        addPip(
          group,
          material,
          new THREE.Vector3(a, -faceOffset, b),
          new THREE.Euler(Math.PI / 2, 0, 0),
        );
        break;
    }
  });
}

export function createDieMesh() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new RoundedBoxGeometry(DIE_SIZE, DIE_SIZE, DIE_SIZE, 8, 0.22),
    new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.46,
      metalness: 0.02,
    }),
  );
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const pipMaterial = new THREE.MeshStandardMaterial({
    color: 0x0b1220,
    roughness: 0.7,
    metalness: 0,
  });

  addPipsToFace(group, 1, "front", pipMaterial);
  addPipsToFace(group, 6, "back", pipMaterial);
  addPipsToFace(group, 3, "right", pipMaterial);
  addPipsToFace(group, 4, "left", pipMaterial);
  addPipsToFace(group, 5, "top", pipMaterial);
  addPipsToFace(group, 2, "bottom", pipMaterial);

  return group;
}

export function normalizeRotation(current: number, target: number) {
  const twoPi = Math.PI * 2;
  return (
    current + ((((target - current) % twoPi) + Math.PI * 3) % twoPi) - Math.PI
  );
}

export function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - value, 3);
}
