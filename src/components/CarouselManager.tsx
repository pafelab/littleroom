import { useFrame } from '@react-three/fiber';
import gsap from 'gsap';
import { memo, useEffect, useRef, useState } from 'react';
import type { Group } from 'three';
import {
  CAROUSEL_CENTER,
  CAROUSEL_RADIUS,
  ISO_AZIMUTH,
  ROOM_COUNT,
  STEP,
  TRANSITION,
  VISIBLE_ARC,
  mod,
  ringDistance,
  wrapAngle,
} from '../config';
import { ROOMS } from '../rooms';
import type { RoomModule } from '../rooms/types';
import { useStore } from '../store';
import { RoomProvider } from '../three/RoomContext';
import { RoomRuntime } from '../three/RoomRuntime';

/**
 * Scene graph (world space unless noted):
 *
 *   <group position={CAROUSEL_CENTER}>          pivot, never animated
 *     <group ref={carousel} rotation-y>          ← the ONLY thing GSAP rotates
 *       <group slot position/rotation>           fixed polar placement, never animated
 *         <group scaler>                         focus scale tween
 *           <RoomProvider live>                  physics gate
 *
 * The camera + OrbitControls are siblings of the pivot, so carousel rotation
 * and user orbit can never compound.
 */
export function CarouselManager() {
  const carousel = useRef<Group>(null);
  const slots = useRef<(Group | null)[]>([]);
  const scalers = useRef<(Group | null)[]>([]);
  const index = useStore((s) => s.index);
  const transitioning = useStore((s) => s.transitioning);
  const active = mod(index, ROOM_COUNT);
  const previous = useRef(index);
  const [mounted, setMounted] = useState<boolean[]>(() => ROOMS.map((_, i) => ringDistance(i, active) <= 1));

  // Focus + neighbours mount immediately; the rest stream in one at a time.
  useEffect(() => {
    const required = mounted.map((m, i) => m || ringDistance(i, active) <= 1);
    if (required.some((m, i) => m !== mounted[i])) {
      setMounted(required);
      return;
    }
    const next = mounted
      .map((m, i) => (m ? -1 : i))
      .filter((i) => i >= 0)
      .sort((a, b) => ringDistance(a, active) - ringDistance(b, active))[0];
    if (next === undefined) return;
    const timer = window.setTimeout(() => setMounted((m) => m.map((v, i) => v || i === next)), 140);
    return () => window.clearTimeout(timer);
  }, [mounted, active]);

  // Initial pose is applied as creation-time props, so the focused room is
  // already at the origin before any child RigidBody reads its world matrix.
  const [initial] = useState(() => {
    const start = useStore.getState().index;
    return { rotation: -start * STEP, active: mod(start, ROOM_COUNT) };
  });

  useEffect(() => {
    if (index === previous.current) return;
    const from = mod(previous.current, ROOM_COUNT);
    const to = mod(index, ROOM_COUNT);
    previous.current = index;
    const group = carousel.current;
    if (!group) return;
    const target = -index * STEP;
    const rest = TRANSITION.restScale;

    if (useStore.getState().reducedMotion) {
      // Reduced motion: veil → snap → unveil. No rotation is ever shown.
      useStore.getState().setVeil(true);
      gsap.delayedCall(TRANSITION.fade, () => {
        group.rotation.y = target;
        scalers.current.forEach((g, i) => g?.scale.setScalar(i === to ? 1 : rest));
        useStore.getState().setVeil(false);
        gsap.delayedCall(TRANSITION.fade, () => useStore.getState().endTransition());
      });
      return;
    }

    const tween = { duration: TRANSITION.duration, ease: TRANSITION.ease };
    const tl = gsap.timeline({ onComplete: () => useStore.getState().endTransition() });
    tl.to(group.rotation, { y: target, ...tween }, 0);
    const outgoing = scalers.current[from];
    const incoming = scalers.current[to];
    if (outgoing) tl.to(outgoing.scale, { x: rest, y: rest, z: rest, ...tween }, 0);
    if (incoming) tl.to(incoming.scale, { x: 1, y: 1, z: 1, ...tween }, 0);
  }, [index]);

  // Hide rooms rotated well away from the front; fog handles the fade before this.
  useFrame(() => {
    const g = carousel.current;
    if (!g) return;
    for (let i = 0; i < ROOM_COUNT; i++) {
      const slot = slots.current[i];
      if (slot) slot.visible = Math.abs(wrapAngle(i * STEP + g.rotation.y)) < VISIBLE_ARC;
    }
  });

  return (
    <group position={CAROUSEL_CENTER}>
      <group ref={carousel} rotation={[0, initial.rotation, 0]}>
        {ROOMS.map((room, i) => {
          const angle = ISO_AZIMUTH + i * STEP;
          return (
            <group
              key={room.id}
              ref={(g) => {
                slots.current[i] = g;
              }}
              position={[Math.sin(angle) * CAROUSEL_RADIUS, 0, Math.cos(angle) * CAROUSEL_RADIUS]}
              rotation={[0, i * STEP, 0]}
            >
              <group
                ref={(g) => {
                  scalers.current[i] = g;
                }}
                scale={i === initial.active ? 1 : TRANSITION.restScale}
              >
                {mounted[i] && <RoomSlot room={room} index={i} live={i === active && !transitioning} />}
              </group>
            </group>
          );
        })}
      </group>
    </group>
  );
}

const RoomSlot = memo(function RoomSlot({ room, index, live }: { room: RoomModule; index: number; live: boolean }) {
  const { Contents } = room;
  return (
    <RoomProvider index={index} id={room.id} live={live} palette={room.palette}>
      <Contents />
      {live && <RoomRuntime />}
    </RoomProvider>
  );
});
