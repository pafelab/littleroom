import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { MathUtils, type DirectionalLight, type HemisphereLight, type PointLight } from 'three';
import type { Mood } from '../rooms/types';
import { ACCENT_SLOTS, accentSlots } from '../three/accentLights';

const BASE = { fill: 1.15, key: 2.6, rim: 1.1 } as const;
const SHADOW_EXTENT = 5.2;

/**
 * Shared rig: hemisphere fill + warm shadow-casting key + cool rim, all in
 * world space (never parented to the carousel). Room moods scale these, and
 * pooled accent lights layer on top — nothing here is ever replaced.
 */
export function LightingRig({ mood }: { mood: Mood }) {
  const hemi = useRef<HemisphereLight>(null);
  const key = useRef<DirectionalLight>(null);
  const rim = useRef<DirectionalLight>(null);
  const points = useRef<(PointLight | null)[]>([]);

  useFrame((state, dt) => {
    const k = 1 - Math.exp(-dt * 2.4);
    if (hemi.current) hemi.current.intensity += (BASE.fill * mood.fill - hemi.current.intensity) * k;
    if (key.current) key.current.intensity += (BASE.key * mood.key - key.current.intensity) * k;
    if (rim.current) rim.current.intensity += (BASE.rim * mood.rim - rim.current.intensity) * k;

    const now = state.clock.elapsedTime;
    for (let i = 0; i < ACCENT_SLOTS; i++) {
      const light = points.current[i];
      if (!light) continue;
      const slot = accentSlots[i];
      const claimed = now - slot.claimedAt < 0.2;
      light.intensity = MathUtils.damp(light.intensity, claimed ? slot.intensity : 0, claimed ? 5 : 8, dt);
      light.position.copy(slot.position);
      light.color.copy(slot.color);
      light.distance = slot.distance;
      light.decay = slot.decay;
    }
  });

  return (
    <>
      <hemisphereLight ref={hemi} args={['#fff3e2', '#6b5a78', BASE.fill]} />
      <directionalLight
        ref={key}
        position={[5, 9.5, 6]}
        intensity={BASE.key}
        color="#ffdcb2"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}
        shadow-camera-left={-SHADOW_EXTENT}
        shadow-camera-right={SHADOW_EXTENT}
        shadow-camera-top={SHADOW_EXTENT}
        shadow-camera-bottom={-SHADOW_EXTENT}
        shadow-camera-near={1}
        shadow-camera-far={30}
      />
      <directionalLight ref={rim} position={[-6, 7, -7.5]} intensity={BASE.rim} color="#9cc2ff" />
      {Array.from({ length: ACCENT_SLOTS }, (_, i) => (
        <pointLight
          key={i}
          ref={(light) => {
            points.current[i] = light;
          }}
          intensity={0}
          distance={4}
          decay={2}
        />
      ))}
    </>
  );
}
