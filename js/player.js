// ============================================================
// player.js — 一人称プレイヤー（歩行・衝突・階段上り・飛行）
// ============================================================
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { CFG } from './config.js';

const P = CFG.player;

export class Player {
  constructor(camera, domElement, colliderWorld, floorWorld) {
    this.camera = camera;
    this.controls = new PointerLockControls(camera, domElement);
    this.cols = colliderWorld;
    this.floors = floorWorld;

    this.pos = new THREE.Vector3(126, 1.7, 12);   // 正門前スタート
    this.vel = new THREE.Vector3();
    this.yaw = Math.PI;  // 西向き
    this.pitch = 0;
    this.onGround = true;
    this.fly = false;
    this.speed = P.walk;
    this.keys = {};
    this.bobT = 0;
    this.enabled = false;
    this.touchMove = { x: 0, y: 0 };
    this.touchRun = false;
    this.touchJump = false;

    // 初期視線
    this.camera.rotation.order = 'YXZ';

    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'KeyF') { this.fly = !this.fly; this.vel.set(0, 0, 0); }
    });
    window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
  }

  lock() { this.controls.lock(); }
  get locked() { return this.controls.isLocked; }

  setPos(x, y, z, yaw = null, pitch = null, fly = null) {
    this.pos.set(x, y, z);
    this.vel.set(0, 0, 0);
    if (yaw !== null && yaw !== undefined) {
      this.camera.rotation.set(this.camera.rotation.x, yaw, 0);
    }
    if (pitch !== null && pitch !== undefined) {
      this.camera.rotation.x = pitch;
    }
    if (fly !== null) this.fly = fly;
  }

  // 地面の高さ（stepUp内の最も高い床）
  groundAt(x, z, feetY) {
    return this.floors.heightAt(x, z, feetY + P.stepUp);
  }

  update(dt) {
    if (!this.enabled) return;
    const k = this.keys;
    const run = k.ShiftLeft || k.ShiftRight || this.touchRun;

    // ---- 基準速度 ----
    let speed = this.fly ? (run ? P.fly * 1.8 : P.fly) : (run ? P.run : P.walk);

    // ---- 入力方向 ----
    let ix = 0, iz = 0;
    if (k.KeyW || k.ArrowUp) iz -= 1;
    if (k.KeyS || k.ArrowDown) iz += 1;
    if (k.KeyA || k.ArrowLeft) ix -= 1;
    if (k.KeyD || k.ArrowRight) ix += 1;
    ix += this.touchMove.x;
    iz += this.touchMove.y;
    const len = Math.hypot(ix, iz);
    if (len > 1) { ix /= len; iz /= len; }

    // カメラの向きに変換（YXZオイラー）
    const e = this.camera.rotation;
    const sinY = Math.sin(e.y), cosY = Math.cos(e.y);
    const dirX = ix * cosY - iz * sinY;
    const dirZ = ix * sinY + iz * cosY;

    if (this.fly) {
      // 飛行: 自由移動
      const sinP = Math.sin(e.x), cosP = Math.cos(e.x);
      let vx = dirX * speed;
      let vz = dirZ * speed;
      let vy = 0;
      if (iz !== 0 || ix !== 0) {
        vy = (-sinP * -iz) * speed * (iz < 0 ? 1 : 1);
        // 前後移動はピッチに追従
        vy = -iz * -sinP * speed + ix * 0;
      }
      if (k.Space) vy += speed * 0.8;
      if (k.ShiftLeft && !run) {} // runで高速化済み
      if (k.KeyQ) vy -= speed * 0.8;
      this.pos.x += vx * dt;
      this.pos.y += vy * dt;
      this.pos.z += vz * dt;
      // 地下に潜らない
      const g = this.floors.heightAt(this.pos.x, this.pos.z, 1e9);
      if (this.pos.y < Math.max(1.6, g + P.eye)) this.pos.y = Math.max(1.6, g + P.eye);
      if (this.pos.y > 260) this.pos.y = 260;
    } else {
      // ---- 歩行 ----
      const accel = this.onGround ? 46 : 12;
      this.vel.x += (dirX * speed - this.vel.x) * Math.min(1, accel * dt / speed * 0.6);
      this.vel.z += (dirZ * speed - this.vel.z) * Math.min(1, accel * dt / speed * 0.6);
      // 摩擦
      if (len < 0.01) {
        const damp = this.onGround ? Math.pow(0.0001, dt) : Math.pow(0.2, dt);
        this.vel.x *= damp; this.vel.z *= damp;
      }
      // 重力
      this.vel.y += P.gravity * dt;

      // 移動 & 衝突
      const r = P.radius;
      let nx = this.pos.x + this.vel.x * dt;
      let nz = this.pos.z + this.vel.z * dt;

      // 水平衝突チェック（足元+頭の2段階）
      const feet = this.pos.y - P.eye;
      const bodyTop = feet + P.height;
      const boxes = [];
      this.cols.query(nx - r, nz - r, nx + r, nz + r, boxes);

      const collide = (px, pz, footY) => {
        for (const b of boxes) {
          if (b.y1 <= footY + P.stepUp + 0.001 || b.y0 >= footY + P.height) continue;
          if (px + r > b.x0 && px - r < b.x1 && pz + r > b.z0 && pz - r < b.z1) return true;
        }
        return false;
      };

      // X軸
      if (!collide(nx, this.pos.z, feet)) {
        this.pos.x = nx;
      } else {
        // ステップアップ試行
        const stepG = this.floors.heightAt(nx, this.pos.z, feet + P.stepUp);
        if (stepG > -Infinity && stepG <= feet + P.stepUp && !collide(nx, this.pos.z, stepG)) {
          this.pos.x = nx;
          this.pos.y = stepG + P.eye;
          this.vel.y = 0;
        } else {
          this.vel.x = 0;
        }
      }
      // Z軸
      if (!collide(this.pos.x, nz, this.pos.y - P.eye)) {
        this.pos.z = nz;
      } else {
        const feet2 = this.pos.y - P.eye;
        const stepG = this.floors.heightAt(this.pos.x, nz, feet2 + P.stepUp);
        if (stepG > -Infinity && stepG <= feet2 + P.stepUp && !collide(this.pos.x, nz, stepG)) {
          this.pos.z = nz;
          this.pos.y = stepG + P.eye;
          this.vel.y = 0;
        } else {
          this.vel.z = 0;
        }
      }

      // 鉛直
      this.pos.y += this.vel.y * dt;
      const g = this.floors.heightAt(this.pos.x, this.pos.z, this.pos.y - P.eye + P.stepUp);
      const groundY = g === -Infinity ? -2 : g;
      if (this.pos.y - P.eye <= groundY + 0.001) {
        this.pos.y = groundY + P.eye;
        this.vel.y = 0;
        this.onGround = true;
      } else {
        this.onGround = false;
      }
      // 落下死対策
      if (this.pos.y < -12) {
        this.pos.set(126, 1.7, 12);
        this.vel.set(0, 0, 0);
      }
      // ジャンプ
      if ((k.Space || this.touchJump) && this.onGround) {
        this.vel.y = P.jump;
        this.onGround = false;
      }
    }

    // 歩行揺れ
    const hspeed = Math.hypot(this.vel.x, this.vel.z);
    if (!this.fly && this.onGround && hspeed > 0.5) {
      this.bobT += dt * hspeed * 1.6;
    }
    const bob = this.fly ? 0 : Math.sin(this.bobT) * 0.035 * Math.min(1, hspeed / P.walk);

    this.camera.position.set(this.pos.x, this.pos.y + bob, this.pos.z);
  }
}
