"use client";

import { Component, ReactNode, Suspense, useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PointerLockControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";

/**
 * 川口市立高等学校 3Dキャンパス ビューア
 * 座標約束（glTF由来）: three.js では +X=東 / −Z=北 / +Y=上。
 * Blender の +X=東,+Y=北,+Z=上 はエクスポート時に自動変換される。
 */

const MODEL_URL = "/models/campus.glb"; // Blender export_glb.py の出力を配置
const EYE_HEIGHT = 1.6; // 視点高 [m] (Phase 6 仕様)
const WALK_SPEED = 6.0; // [m/s]
const SPRINT = 2.5; // Shiftで倍率
// 初期視点: 南門の外（南）から校舎を見る想定。glTFでは 北 = -Z なので南は +Z 側。
const SPAWN = new THREE.Vector3(0, EYE_HEIGHT, 190);

function CampusModel() {
  const gltf = useGLTF(MODEL_URL);
  return <primitive object={gltf.scene} />;
}

/** モデル未配置時・読込失敗時の代替（フェンス程度の目印のみ。形状は創作しない） */
function Placeholder() {
  return (
    <group>
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[300, 280]} />
        <meshStandardMaterial color="#28323c" />
      </mesh>
      <mesh position={[0, 9.2, 0]}>
        <boxGeometry args={[109.2, 18.4, 60]} />
        <meshStandardMaterial color="#546a7b" wireframe />
      </mesh>
    </group>
  );
}

class ModelErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <Placeholder /> : this.props.children;
  }
}

function usePlayerMovement() {
  const { camera } = useThree();
  const keys = useRef<Record<string, boolean>>({});

  useEffect(() => {
    camera.position.copy(SPAWN);
    camera.lookAt(0, EYE_HEIGHT, 0);
    const down = (e: KeyboardEvent) => (keys.current[e.code] = true);
    const up = (e: KeyboardEvent) => (keys.current[e.code] = false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [camera]);

  useFrame((_, delta) => {
    const k = keys.current;
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    dir.y = 0;
    dir.normalize();
    const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0));
    const move = new THREE.Vector3();
    if (k["KeyW"] || k["ArrowUp"]) move.add(dir);
    if (k["KeyS"] || k["ArrowDown"]) move.sub(dir);
    if (k["KeyD"] || k["ArrowRight"]) move.add(right);
    if (k["KeyA"] || k["ArrowLeft"]) move.sub(right);
    if (move.lengthSq() === 0) return;
    move.normalize();
    const mult = (k["ShiftLeft"] || k["ShiftRight"] ? SPRINT : 1) * WALK_SPEED * delta;
    camera.position.addScaledVector(move, mult);
    camera.position.y = EYE_HEIGHT; // Phase 6 でコリジョン/重力に置き換え
  });
}

function Player() {
  usePlayerMovement();
  return <PointerLockControls makeDefault selector="#k3d-enter" />;
}

export default function CampusViewer() {
  return (
    <>
      <button
        id="k3d-enter"
        style={{
          position: "fixed",
          top: 16,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 10,
          padding: "10px 22px",
          borderRadius: 999,
          border: "1px solid #4a7dbd",
          background: "rgba(20,30,45,0.85)",
          color: "#fff",
          cursor: "pointer",
          fontSize: 14,
        }}
      >
        ▶ キャンパスに入る（クリック）
      </button>
      <Canvas camera={{ fov: 60, near: 0.1, far: 4000 }} shadows>
        <color attach="background" args={["#0b0e12"]} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[80, 120, 60]} intensity={1.2} castShadow />
        <Suspense fallback={null}>
          <ModelErrorBoundary>
            <CampusModel />
          </ModelErrorBoundary>
        </Suspense>
        <gridHelper args={[800, 80, "#2a3a4a", "#1a2430"]} position={[0, 0.01, 0]} />
        <Player />
      </Canvas>
    </>
  );
}

// モデルURLのキャッシュ回避に備えてプリロードは行わない
