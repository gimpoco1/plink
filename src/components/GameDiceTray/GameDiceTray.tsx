import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, Dices } from "lucide-react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import "./GameDiceTray.css";

type Props = {
  accentTone?: "default" | "team";
};

type DieValue = 1 | 2 | 3 | 4 | 5 | 6;
type DiceCount = 1 | 2;
type DiceStateByCount<T> = Record<DiceCount, T>;

const ROLL_DURATION_MS = 1380;
const RESULT_REVEAL_DELAY_MS = 240;
const DIE_SIZE = 1.74;
const DIE_HALF = DIE_SIZE / 2;
const PIP_OFFSET = 0.38;
const PIP_RADIUS = 0.094;

const DIE_FINAL_ROTATIONS: Record<DieValue, THREE.Euler> = {
  1: new THREE.Euler(0, 0, 0),
  2: new THREE.Euler(-Math.PI / 2, 0, 0),
  3: new THREE.Euler(0, -Math.PI / 2, 0),
  4: new THREE.Euler(0, Math.PI / 2, 0),
  5: new THREE.Euler(Math.PI / 2, 0, 0),
  6: new THREE.Euler(0, Math.PI, 0),
};

function randomDieValue(): DieValue {
  return (Math.floor(Math.random() * 6) + 1) as DieValue;
}

function formatRollSummary(values: DieValue[]) {
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
  const pip = new THREE.Mesh(new THREE.CircleGeometry(PIP_RADIUS, 28), material);
  pip.position.copy(position);
  pip.rotation.copy(rotation);
  group.add(pip);
}

function addPipsToFace(
  group: THREE.Group,
  value: DieValue,
  face:
    | "front"
    | "back"
    | "right"
    | "left"
    | "top"
    | "bottom",
  material: THREE.Material,
) {
  const points = getPipPoints(value);
  const faceOffset = DIE_HALF + 0.006;

  points.forEach(([a, b]) => {
    switch (face) {
      case "front":
        addPip(group, material, new THREE.Vector3(a, b, faceOffset), new THREE.Euler(0, 0, 0));
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

function createDieMesh() {
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

function normalizeRotation(current: number, target: number) {
  const twoPi = Math.PI * 2;
  return current + ((((target - current) % twoPi) + Math.PI * 3) % twoPi) - Math.PI;
}

function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - value, 3);
}

function DiceCanvas({
  values,
  diceCount,
  rolling,
  rollCycle,
}: {
  values: DieValue[];
  diceCount: DiceCount;
  rolling: boolean;
  rollCycle: number;
}) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const diceGroupsRef = useRef<THREE.Group[]>([]);
  const frameRef = useRef(0);
  const rollingRef = useRef(rolling);
  const valuesRef = useRef(values);
  const diceCountRef = useRef(diceCount);
  const settleStartRef = useRef<number | null>(null);
  const settleFromRef = useRef<THREE.Euler[]>([
    new THREE.Euler(),
    new THREE.Euler(),
  ]);

  useEffect(() => {
    rollingRef.current = rolling;
    if (rolling) {
      settleStartRef.current = null;
    } else {
      settleStartRef.current = performance.now();
      settleFromRef.current = diceGroupsRef.current.map((group) =>
        group.rotation.clone(),
      );
    }
  }, [rolling, rollCycle]);

  useEffect(() => {
    valuesRef.current = values;
    diceCountRef.current = diceCount;
    diceGroupsRef.current.forEach((group, index) => {
      group.visible = index < diceCount;
    });
    if (!rollingRef.current) {
      settleStartRef.current = performance.now();
      settleFromRef.current = diceGroupsRef.current.map((group) =>
        group.rotation.clone(),
      );
    }
  }, [diceCount, values]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const mountElement = mount;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(29, 1, 0.1, 100);
    camera.position.set(0, 0.1, 6.9);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mountElement.appendChild(renderer.domElement);

    const ambient = new THREE.HemisphereLight(0xffffff, 0x1f2937, 2.35);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 3.4);
    keyLight.position.set(-3.4, 5.8, 5.2);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xd8ff4f, 1.05);
    rimLight.position.set(4.2, 2.4, 2.4);
    scene.add(rimLight);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(7, 4),
      new THREE.ShadowMaterial({ opacity: 0.28 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.18;
    floor.receiveShadow = true;
    scene.add(floor);

    const dice = [createDieMesh(), createDieMesh()];
    dice.forEach((die, index) => {
      die.position.x = index === 0 ? -1.28 : 1.28;
      die.position.y = -0.06;
      scene.add(die);
    });
    diceGroupsRef.current = dice;

    function resize() {
      const width = Math.max(1, mountElement.clientWidth);
      const height = Math.max(1, mountElement.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mountElement);
    resize();

    const clock = new THREE.Clock();
    function render(now: number) {
      const delta = Math.min(clock.getDelta(), 0.034);
      const activeCount = diceCountRef.current;

      dice.forEach((die, index) => {
        die.visible = index < activeCount;
        die.position.x =
          activeCount === 1 ? 0 : index === 0 ? -1.3 : 1.3;

        if (rollingRef.current) {
          const direction = index === 0 ? 1 : -1;
          die.rotation.x += delta * (9.4 + index * 1.2);
          die.rotation.y += delta * (12.2 + index * 1.4) * direction;
          die.rotation.z += delta * (7.6 + index * 1.1);
          die.position.y = -0.06 + Math.sin(now / 72 + index) * 0.18;
          return;
        }

        const value = valuesRef.current[index] ?? 1;
        const target = DIE_FINAL_ROTATIONS[value];
        const startedAt = settleStartRef.current ?? now;
        const progress = Math.min(1, (now - startedAt) / 360);
        const eased = easeOutCubic(progress);
        const from = settleFromRef.current[index] ?? die.rotation;
        die.rotation.x = THREE.MathUtils.lerp(
          from.x,
          normalizeRotation(from.x, target.x),
          eased,
        );
        die.rotation.y = THREE.MathUtils.lerp(
          from.y,
          normalizeRotation(from.y, target.y),
          eased,
        );
        die.rotation.z = THREE.MathUtils.lerp(from.z, 0, eased);
        die.position.y = THREE.MathUtils.lerp(die.position.y, -0.06, 0.18);
      });

      renderer.render(scene, camera);
      frameRef.current = window.requestAnimationFrame(render);
    }

    frameRef.current = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(frameRef.current);
      resizeObserver.disconnect();
      diceGroupsRef.current = [];
      scene.traverse((object: THREE.Object3D) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const material = object.material;
          if (Array.isArray(material)) {
            material.forEach((entry) => entry.dispose());
          } else {
            material.dispose();
          }
        }
      });
      renderer.dispose();
      mountElement.removeChild(renderer.domElement);
    };
  }, []);

  return <div className="gameDiceTray__diceCanvas" ref={mountRef} />;
}

export function GameDiceTray({ accentTone = "default" }: Props) {
  const initialDicePreview: [DieValue, DieValue] = [1, 4];
  const [isOpen, setIsOpen] = useState(false);
  const [diceCount, setDiceCount] = useState<DiceCount>(2);
  const [displayValuesByCount, setDisplayValuesByCount] =
    useState<DiceStateByCount<[DieValue, DieValue]>>({
      1: initialDicePreview,
      2: initialDicePreview,
    });
  const [displayValues, setDisplayValues] = useState<[DieValue, DieValue]>(
    initialDicePreview,
  );
  const [rollingPreviewValues, setRollingPreviewValues] =
    useState<[DieValue, DieValue]>(initialDicePreview);
  const [lastRollByCount, setLastRollByCount] = useState<
    DiceStateByCount<DieValue[] | null>
  >({
    1: null,
    2: null,
  });
  const [lastRoll, setLastRoll] = useState<DieValue[] | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [isResolvingResult, setIsResolvingResult] = useState(false);
  const [resultVisible, setResultVisible] = useState(false);
  const [rollCycle, setRollCycle] = useState(0);
  const [rollingDiceCount, setRollingDiceCount] = useState<DiceCount>(2);
  const trayRef = useRef<HTMLDivElement | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const rollTokenRef = useRef(0);
  const timeoutIdsRef = useRef<number[]>([]);
  const pendingValuesRef = useRef<[DieValue, DieValue] | null>(null);
  const visibleDiceCount = isRolling ? rollingDiceCount : diceCount;

  const visibleValues = useMemo(() => {
    const sourceValues = isRolling ? rollingPreviewValues : displayValues;
    return sourceValues.slice(0, visibleDiceCount);
  }, [displayValues, isRolling, rollingPreviewValues, visibleDiceCount]);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      if (!trayRef.current?.contains(target)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    return () => {
      timeoutIdsRef.current.forEach((timeoutId) =>
        window.clearTimeout(timeoutId),
      );
      timeoutIdsRef.current = [];
    };
  }, []);

  function queueTimeout(callback: () => void, delayMs: number) {
    const timeoutId = window.setTimeout(callback, delayMs);
    timeoutIdsRef.current.push(timeoutId);
  }

  function clearRollTimers() {
    timeoutIdsRef.current.forEach((timeoutId) =>
      window.clearTimeout(timeoutId),
    );
    timeoutIdsRef.current = [];
  }

  function rollDice() {
    if (isRolling) return;

    const nextValues: [DieValue, DieValue] = [
      randomDieValue(),
      randomDieValue(),
    ];
    const previewValues: [DieValue, DieValue] = [
      randomDieValue(),
      randomDieValue(),
    ];
    const nextDiceCount = diceCount;
    const currentToken = rollTokenRef.current + 1;
    rollTokenRef.current = currentToken;
    clearRollTimers();
    setIsOpen(true);
    setResultVisible(false);
    setLastRoll(null);
    setLastRollByCount((previous) => ({
      ...previous,
      [nextDiceCount]: null,
    }));
    setIsResolvingResult(true);
    setRollingPreviewValues(previewValues);
    pendingValuesRef.current = nextValues;
    setRollingDiceCount(nextDiceCount);
    setIsRolling(true);
    setRollCycle((value) => value + 1);

    queueTimeout(() => {
      if (rollTokenRef.current !== currentToken) return;
      const pendingValues = pendingValuesRef.current;
      if (!pendingValues) return;
      setDisplayValuesByCount((previous) => ({
        ...previous,
        [nextDiceCount]: pendingValues,
      }));
      setDisplayValues(pendingValues);
      setIsRolling(false);
    }, ROLL_DURATION_MS);

    queueTimeout(() => {
      if (rollTokenRef.current !== currentToken) return;
      const pendingValues = pendingValuesRef.current;
      if (!pendingValues) return;
      const resolvedRoll = pendingValues.slice(0, nextDiceCount);
      setLastRollByCount((previous) => ({
        ...previous,
        [nextDiceCount]: resolvedRoll,
      }));
      setLastRoll(resolvedRoll);
      setResultVisible(true);
      setIsResolvingResult(false);
    }, ROLL_DURATION_MS + RESULT_REVEAL_DELAY_MS);
  }

  function selectDiceCount(nextCount: DiceCount) {
    if (isRolling || isResolvingResult) return;
    setDiceCount(nextCount);
    setDisplayValues(displayValuesByCount[nextCount]);
    setLastRoll(lastRollByCount[nextCount]);
    setResultVisible(Boolean(lastRollByCount[nextCount]));
  }

  function handleTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    const touch = event.touches[0];
    if (!touch) return;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }

  function handleTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    const start = touchStartRef.current;
    const touch = event.changedTouches[0];
    touchStartRef.current = null;
    if (!start || !touch) return;

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (Math.abs(deltaX) < 30 || Math.abs(deltaX) < Math.abs(deltaY)) return;

    if (deltaX < 0) {
      setIsOpen(true);
      return;
    }

    setIsOpen(false);
  }

  return (
    <div
      ref={trayRef}
      className={`gameDiceTray${
        isOpen ? " gameDiceTray--open" : ""
      }${isRolling ? " gameDiceTray--rolling" : ""}${
        accentTone === "team" ? " gameDiceTray--team" : ""
      }`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <button
        className="gameDiceTray__tab"
        type="button"
        aria-label={isOpen ? "Collapse dice roller" : "Open dice roller"}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((value) => !value)}
      >
        <Dices size={18} strokeWidth={2.3} aria-hidden="true" />
        <span className="gameDiceTray__tabLabel">Dice</span>
        <ChevronLeft
          size={16}
          strokeWidth={2.5}
          aria-hidden="true"
          className={`gameDiceTray__tabChevron${
            isOpen ? " gameDiceTray__tabChevron--open" : ""
          }`}
        />
      </button>

      <div className="gameDiceTray__panel">
        <div className="gameDiceTray__header">
          <div>
            <div className="gameDiceTray__eyebrow">Luck helper</div>
            <div className="gameDiceTray__title">Throw the dice</div>
          </div>
          <div
            className="gameDiceTray__countSwitch"
            role="group"
            aria-label="Dice count"
          >
            <button
              className={`gameDiceTray__countBtn${
                diceCount === 1 ? " gameDiceTray__countBtn--active" : ""
              }`}
              type="button"
              onClick={() => selectDiceCount(1)}
              disabled={isRolling || isResolvingResult}
            >
              1 die
            </button>
            <button
              className={`gameDiceTray__countBtn${
                diceCount === 2 ? " gameDiceTray__countBtn--active" : ""
              }`}
              type="button"
              onClick={() => selectDiceCount(2)}
              disabled={isRolling || isResolvingResult}
            >
              2 dice
            </button>
          </div>
        </div>

        <div className="gameDiceTray__stage">
          <DiceCanvas
            values={visibleValues}
            diceCount={visibleDiceCount}
            rolling={isRolling}
            rollCycle={rollCycle}
          />
          {isRolling || resultVisible ? (
            <div
              className={`gameDiceTray__status${
                resultVisible ? " gameDiceTray__status--visible" : ""
              }`}
              aria-live="polite"
            >
              {isRolling
                ? "Rolling..."
                : resultVisible && lastRoll
                  ? formatRollSummary(lastRoll)
                  : null}
            </div>
          ) : null}
        </div>

        <div className="gameDiceTray__actions">
          <button
            className="gameDiceTray__rollBtn"
            type="button"
            onClick={rollDice}
            disabled={isRolling || isResolvingResult}
          >
            {isRolling || isResolvingResult
              ? "Shaking..."
              : lastRoll
                ? "Roll again"
                : "Roll now"}
          </button>
        </div>
      </div>
    </div>
  );
}
