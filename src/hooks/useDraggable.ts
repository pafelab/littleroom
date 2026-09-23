import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { useRapier, type RapierRigidBody } from '@react-three/rapier';
import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { MathUtils, Plane, Raycaster, Vector2, Vector3, type Mesh, type MeshStandardMaterial, type Object3D } from 'three';
import { HALF_D, HALF_W, ROOM, type V3 } from '../config';
import { useStore } from '../store';

export type DragOptions = {
  /** Scales the sampled release velocity before it becomes an impulse. */
  throwMultiplier?: number;
  maxSpeed?: number;
  /** Scales the random tumble torque applied on release. */
  spin?: number;
  /** Keeps the drag target this far from walls / floor / ceiling. */
  margin?: number;
  /** Clamps the target to a sphere — used for bodies hanging from joints. */
  tether?: { anchor: V3; radius: number };
  disabled?: boolean;
  onGrab?: () => void;
  onDrag?: (target: Vector3) => void;
  onRelease?: (velocity: Vector3) => void;
};

type Sample = { t: number; p: Vector3 };

type Session = {
  pointerId: number;
  plane: Plane;
  offset: Vector3;
  target: Vector3;
  samples: Sample[];
  head: number;
  count: number;
  detach: () => void;
};

type ControlsLike = { enabled: boolean };

const SAMPLE_COUNT = 8;
/** Seconds of motion history used to derive the throw velocity. */
const SAMPLE_WINDOW = 0.1;

const _ndc = new Vector2();
const _ray = new Raycaster();
const _hit = new Vector3();
const _tmp = new Vector3();

function attempt(fn: () => void) {
  try {
    fn();
  } catch (error) {
    if (import.meta.env.DEV) console.warn(error);
  }
}

function pushSample(s: Session) {
  const slot = s.samples[s.head];
  slot.t = performance.now() / 1000;
  slot.p.copy(s.target);
  s.head = (s.head + 1) % SAMPLE_COUNT;
  s.count = Math.min(s.count + 1, SAMPLE_COUNT);
}

function sampledVelocity(s: Session, out: Vector3) {
  out.set(0, 0, 0);
  if (s.count < 2) return out;
  const newest = s.samples[(s.head - 1 + SAMPLE_COUNT) % SAMPLE_COUNT];
  let oldest = newest;
  for (let i = 2; i <= s.count; i++) {
    const sample = s.samples[(s.head - i + SAMPLE_COUNT * 2) % SAMPLE_COUNT];
    if (newest.t - sample.t > SAMPLE_WINDOW) break;
    oldest = sample;
  }
  const dt = newest.t - oldest.t;
  if (dt < 0.012) return out;
  return out.subVectors(newest.p, oldest.p).divideScalar(dt);
}

/**
 * Drag + throw for a Rapier body without drei's DragControls (which would
 * fight Rapier for transform ownership). The live room always rests at the
 * world origin with identity rotation, so world space == room space here.
 */
export function useDraggable(
  body: RefObject<RapierRigidBody>,
  visual: RefObject<Object3D>,
  options: DragOptions = {},
) {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const controls = useThree((s) => s.controls) as unknown as ControlsLike | null;
  const { rapier } = useRapier();

  const opts = useRef(options);
  opts.current = options;
  const ctx = useRef({ camera, gl, controls, rapier });
  ctx.current = { camera, gl, controls, rapier };

  const hovered = useRef(false);
  const session = useRef<Session | null>(null);
  const lift = useRef(0);
  const materials = useRef<MeshStandardMaterial[] | null>(null);

  const handlers = useMemo(() => {
    const setCursor = (cursor: string) => {
      ctx.current.gl.domElement.style.cursor = cursor;
    };

    const constrain = (v: Vector3) => {
      const o = opts.current;
      const m = o.margin ?? 0.14;
      if (o.tether) {
        const [ax, ay, az] = o.tether.anchor;
        _tmp.set(v.x - ax, v.y - ay, v.z - az);
        if (_tmp.length() > o.tether.radius) {
          _tmp.setLength(o.tether.radius);
          v.set(ax + _tmp.x, ay + _tmp.y, az + _tmp.z);
        }
      }
      v.x = MathUtils.clamp(v.x, -HALF_W + m, HALF_W - m);
      v.z = MathUtils.clamp(v.z, -HALF_D + m, HALF_D - m);
      v.y = MathUtils.clamp(v.y, m, ROOM.h - m);
    };

    const finish = (throwIt: boolean) => {
      const s = session.current;
      if (!s) return;
      session.current = null;
      s.detach();
      const o = opts.current;
      const velocity = new Vector3();
      const rb = body.current;
      if (rb) {
        pushSample(s);
        if (throwIt) sampledVelocity(s, velocity);
        rb.setBodyType(ctx.current.rapier.RigidBodyType.Dynamic, true);
        rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
        rb.setAngvel({ x: 0, y: 0, z: 0 }, true);
        if (throwIt) {
          velocity.multiplyScalar(o.throwMultiplier ?? 1);
          const max = o.maxSpeed ?? 9;
          if (velocity.length() > max) velocity.setLength(max);
          const mass = rb.mass();
          rb.applyImpulse({ x: velocity.x * mass, y: velocity.y * mass, z: velocity.z * mass }, true);
          const tumble = (o.spin ?? 1) * mass * 0.012 * (0.35 + Math.min(velocity.length() / 4, 1.2));
          rb.applyTorqueImpulse(
            {
              x: (Math.random() - 0.5) * 2 * tumble,
              y: (Math.random() - 0.5) * 2 * tumble,
              z: (Math.random() - 0.5) * 2 * tumble,
            },
            true,
          );
        }
      }
      const store = useStore.getState();
      if (ctx.current.controls) ctx.current.controls.enabled = !store.transitioning;
      store.setDragging(false);
      if (throwIt) store.markThrown();
      setCursor(hovered.current ? 'grab' : '');
      o.onRelease?.(velocity);
    };

    const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
      const o = opts.current;
      const rb = body.current;
      const store = useStore.getState();
      if (o.disabled || !rb || session.current || store.tidying || store.transitioning) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.stopPropagation();

      const { camera: cam, gl: renderer, controls: orbit, rapier: api } = ctx.current;
      // 1. Take ownership: kinematic bodies ignore gravity and push others.
      rb.setBodyType(api.RigidBodyType.KinematicPositionBased, true);
      const t = rb.translation();
      const bodyPos = new Vector3(t.x, t.y, t.z);
      // Plane parallel to the camera, through the grabbed point (the object's depth).
      const normal = cam.getWorldDirection(new Vector3());
      const s: Session = {
        pointerId: e.pointerId,
        plane: new Plane().setFromNormalAndCoplanarPoint(normal, e.point),
        offset: bodyPos.clone().sub(e.point),
        target: bodyPos.clone(),
        samples: Array.from({ length: SAMPLE_COUNT }, () => ({ t: 0, p: new Vector3() })),
        head: 0,
        count: 0,
        detach: () => undefined,
      };
      pushSample(s);

      const el = renderer.domElement;
      // 2. Move: raycast the drag plane, then set the next kinematic translation.
      const move = (ev: PointerEvent) => {
        if (ev.pointerId !== s.pointerId) return;
        const rect = el.getBoundingClientRect();
        _ndc.set(((ev.clientX - rect.left) / rect.width) * 2 - 1, -((ev.clientY - rect.top) / rect.height) * 2 + 1);
        _ray.setFromCamera(_ndc, ctx.current.camera);
        if (!_ray.ray.intersectPlane(s.plane, _hit)) return;
        s.target.copy(_hit).add(s.offset);
        constrain(s.target);
        body.current?.setNextKinematicTranslation(s.target);
        opts.current.onDrag?.(s.target);
      };
      // 3. Release: pointerup throws, pointercancel just drops.
      const up = (ev: PointerEvent) => {
        if (ev.pointerId === s.pointerId) finish(ev.type === 'pointerup');
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
      attempt(() => el.setPointerCapture(e.pointerId));
      s.detach = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
        attempt(() => {
          if (el.hasPointerCapture(s.pointerId)) el.releasePointerCapture(s.pointerId);
        });
      };

      session.current = s;
      // Disable orbiting synchronously — R3F's listener runs before OrbitControls'.
      if (orbit) orbit.enabled = false;
      store.setDragging(true);
      setCursor('grabbing');
      o.onGrab?.();
    };

    const onPointerOver = (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      hovered.current = true;
      if (!session.current && !opts.current.disabled) setCursor('grab');
    };

    const onPointerOut = () => {
      hovered.current = false;
      if (!session.current) setCursor('');
    };

    return { onPointerDown, onPointerOver, onPointerOut };
  }, [body]);

  useFrame((_, dt) => {
    const s = session.current;
    if (s) {
      pushSample(s);
      body.current?.setNextKinematicTranslation(s.target);
    }

    // 4. Hover feedback: subtle scale-up + emissive lift, eased.
    const want = s || (hovered.current && !opts.current.disabled) ? 1 : 0;
    if (lift.current === want) return;
    if (lift.current === 0) materials.current = null;
    lift.current = Math.abs(want - lift.current) < 0.003 ? want : MathUtils.damp(lift.current, want, 14, dt);

    const v = visual.current;
    if (!v) return;
    v.scale.setScalar(1 + 0.05 * lift.current);
    if (!materials.current) {
      const found: MeshStandardMaterial[] = [];
      v.traverse((child) => {
        const mesh = child as Mesh;
        if (!mesh.isMesh) return;
        const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const m of list) {
          const std = m as MeshStandardMaterial;
          if (std.isMeshStandardMaterial && !std.userData.glow && !found.includes(std)) {
            std.emissive.copy(std.color);
            found.push(std);
          }
        }
      });
      materials.current = found;
    }
    const intensity = 0.16 * lift.current;
    for (const m of materials.current) m.emissiveIntensity = intensity;
  });

  useEffect(
    () => () => {
      const s = session.current;
      if (s) {
        session.current = null;
        s.detach();
        const store = useStore.getState();
        if (ctx.current.controls) ctx.current.controls.enabled = !store.transitioning;
        store.setDragging(false);
      }
      if (hovered.current) ctx.current.gl.domElement.style.cursor = '';
    },
    [],
  );

  return handlers;
}
