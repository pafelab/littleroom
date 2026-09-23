import { useFrame } from '@react-three/fiber';
import { useRapier } from '@react-three/rapier';
import { useEffect, useRef } from 'react';
import { Quaternion, Vector3 } from 'three';
import { useStore } from '../store';
import { memoFor, useRoom, type RegisteredProp } from './RoomContext';

type TidyRun = {
  t: number;
  duration: number;
  entries: RegisteredProp[];
  from: { p: Vector3; q: Quaternion }[];
};

const _p = new Vector3();
const _q = new Quaternion();
const easeInOutCubic = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

/**
 * Lives only inside the focused, resting room. Mirrors body transforms into
 * room memory (so the static version shows your mess), measures chaos, and
 * runs "tidy up" as a kinematic lerp back to every origin.
 */
export function RoomRuntime() {
  const room = useRoom();
  const { rapier } = useRapier();
  const token = useStore((s) => s.tidyToken);
  const seenToken = useRef(token);
  const run = useRef<TidyRun | null>(null);
  const chaosClock = useRef(0);

  useEffect(() => {
    if (token === seenToken.current) return;
    seenToken.current = token;
    const entries = [...room.registry.values()];
    const from = entries.map((e) => {
      const t = e.body.translation();
      const r = e.body.rotation();
      return { p: new Vector3(t.x, t.y, t.z), q: new Quaternion(r.x, r.y, r.z, r.w) };
    });
    entries.forEach((e) => e.body.setBodyType(rapier.RigidBodyType.KinematicPositionBased, true));
    const reduced = useStore.getState().reducedMotion;
    run.current = { t: 0, duration: reduced ? 0.2 : 0.95, entries, from };
    useStore.getState().setTidying(true);
  }, [token, room.registry, rapier]);

  useEffect(
    () => () => {
      if (run.current) {
        run.current = null;
        useStore.getState().setTidying(false);
      }
    },
    [],
  );

  useFrame((_, dt) => {
    room.registry.forEach((e) => {
      const memo = memoFor(room.memory, e.id);
      memo.p.copy(e.object.position);
      memo.q.copy(e.object.quaternion);
    });

    const active = run.current;
    if (active) {
      active.t = Math.min(1, active.t + dt / active.duration);
      const k = easeInOutCubic(active.t);
      active.entries.forEach((e, i) => {
        _p.lerpVectors(active.from[i].p, e.origin.p, k);
        _q.slerpQuaternions(active.from[i].q, e.origin.q, k);
        e.body.setNextKinematicTranslation(_p);
        e.body.setNextKinematicRotation(_q);
      });
      if (active.t >= 1) {
        active.entries.forEach((e) => {
          e.body.setBodyType(rapier.RigidBodyType.Dynamic, true);
          e.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
          e.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
        });
        run.current = null;
        room.resetters.forEach((reset) => reset());
        useStore.getState().setTidying(false);
      }
    }

    chaosClock.current += dt;
    if (chaosClock.current > 0.25) {
      chaosClock.current = 0;
      let drift = 0;
      room.registry.forEach((e) => {
        if (!e.chaos) return;
        const d = e.object.position.distanceTo(e.origin.p);
        if (d > 0.05) drift += d;
      });
      useStore.getState().setChaos(room.index, drift);
    }
  });

  return null;
}
