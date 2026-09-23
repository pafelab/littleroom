import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { Color, Vector3 } from 'three';
import { useRoom } from './RoomContext';

export type AccentSlot = {
  position: Vector3;
  color: Color;
  intensity: number;
  distance: number;
  decay: number;
  claimedAt: number;
};

/**
 * A fixed pool of point lights owned by the LightingRig. Keeping the count
 * constant means switching rooms never changes the scene's light count, so
 * no material programs recompile mid-transition.
 */
export const ACCENT_SLOTS = 3;

export const accentSlots: AccentSlot[] = Array.from({ length: ACCENT_SLOTS }, () => ({
  position: new Vector3(0, 2, 0),
  color: new Color('#ffc27a'),
  intensity: 0,
  distance: 4,
  decay: 2,
  claimedAt: -Infinity,
}));

/**
 * Claims a pooled accent light while the calling room is live. Positions are
 * room-space, which equals world space for the resting, focused room. Slots
 * that stop being claimed fade out inside the LightingRig.
 */
export function useAccentLight(slot: number, update: (light: AccentSlot, time: number, dt: number) => void) {
  const { live } = useRoom();
  const fn = useRef(update);
  fn.current = update;
  useFrame((state, dt) => {
    if (!live || slot < 0 || slot >= ACCENT_SLOTS) return;
    const light = accentSlots[slot];
    fn.current(light, state.clock.elapsedTime, dt);
    light.claimedAt = state.clock.elapsedTime;
  });
}
