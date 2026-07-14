import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  DIE_FINAL_ROTATIONS,
  createDieMesh,
  easeOutCubic,
  normalizeRotation,
  type DiceCount,
  type DieValue,
} from "./diceGeometry";

export function DiceCanvas({
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
  const [renderMode, setRenderMode] = useState<"webgl" | "fallback">("webgl");
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
    if (renderMode === "fallback") return;
    const mount = mountRef.current;
    if (!mount) return;
    const mountElement = mount;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(29, 1, 0.1, 100);
    camera.position.set(0, 0.1, 6.9);
    camera.lookAt(0, 0, 0);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      });
    } catch (error) {
      console.warn("Falling back to non-WebGL dice renderer", error);
      setRenderMode("fallback");
      return;
    }
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
        die.position.x = activeCount === 1 ? 0 : index === 0 ? -1.3 : 1.3;

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
      renderer.forceContextLoss();
      renderer.dispose();
      if (renderer.domElement.parentNode === mountElement) {
        mountElement.removeChild(renderer.domElement);
      }
    };
  }, [renderMode]);

  if (renderMode === "fallback") {
    return (
      <div className="gameDiceTray__diceCanvas gameDiceTray__diceCanvas--fallback">
        <div className="gameDiceTray__diceFallback" aria-hidden="true">
          {values.slice(0, diceCount).map((value, index) => (
            <div
              className="gameDiceTray__dieFallback"
              key={`${index}-${value}`}
            >
              {value}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return <div className="gameDiceTray__diceCanvas" ref={mountRef} />;
}
