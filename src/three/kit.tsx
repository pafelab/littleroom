import { RoundedBox } from '@react-three/drei';
import { useMemo } from 'react';
import { DoubleSide, FrontSide, Vector2 } from 'three';
import type { V3 } from '../config';

export type Profile = ReadonlyArray<readonly [number, number]>;

type Xform = {
  position?: V3;
  rotation?: V3;
  scale?: number | V3;
  castShadow?: boolean;
};

/** Surface overrides — defaults follow the art direction (rough, non-metal). */
export type Surface = {
  roughness?: number;
  metalness?: number;
  emissive?: string;
  emissiveIntensity?: number;
  transparent?: boolean;
  opacity?: number;
  doubleSide?: boolean;
  /** Excludes the material from the hover emissive lift (flames, glow cores). */
  glow?: boolean;
};

export const METAL: Surface = { metalness: 0.6, roughness: 0.6 };
export const GLASS: Surface = { transparent: true, opacity: 0.42, roughness: 0.6 };

const GLOW_TAG = Object.freeze({ glow: true });
const TAU = Math.PI * 2;

export function Mat({
  color,
  roughness = 0.78,
  metalness = 0,
  emissive,
  emissiveIntensity = 1,
  transparent = false,
  opacity = 1,
  doubleSide = false,
  glow = false,
}: Surface & { color: string }) {
  const tagged = glow || emissive !== undefined;
  return (
    <meshStandardMaterial
      color={color}
      roughness={Math.min(0.9, Math.max(0.6, roughness))}
      metalness={metalness}
      emissive={emissive ?? '#000000'}
      emissiveIntensity={emissive ? emissiveIntensity : 0}
      transparent={transparent}
      opacity={opacity}
      depthWrite={!transparent}
      side={doubleSide ? DoubleSide : FrontSide}
      {...(tagged ? { userData: GLOW_TAG } : {})}
    />
  );
}

/** Bevelled box. Radius is clamped so thin slabs (≥0.03) still build valid geometry. */
export function Box({
  size,
  color,
  radius = 0.04,
  s,
  castShadow = true,
  ...x
}: Xform & { size: V3; color: string; radius?: number; s?: Surface }) {
  const r = Math.max(0.005, Math.min(radius, Math.min(size[0], size[1], size[2]) / 2 - 0.004));
  return (
    <RoundedBox
      args={size}
      radius={r}
      smoothness={3}
      bevelSegments={2}
      castShadow={castShadow && !s?.transparent}
      receiveShadow
      {...x}
    >
      <Mat color={color} {...s} />
    </RoundedBox>
  );
}

export function Cyl({
  r,
  r2,
  h,
  color,
  seg = 24,
  open = false,
  s,
  castShadow = true,
  ...x
}: Xform & { r: number; r2?: number; h: number; color: string; seg?: number; open?: boolean; s?: Surface }) {
  return (
    <mesh castShadow={castShadow && !s?.transparent} receiveShadow {...x}>
      <cylinderGeometry args={[r, r2 ?? r, h, seg, 1, open]} />
      <Mat color={color} {...s} />
    </mesh>
  );
}

export function Sphere({
  r,
  color,
  seg = 20,
  s,
  castShadow = true,
  thetaLength = Math.PI,
  ...x
}: Xform & { r: number; color: string; seg?: number; s?: Surface; thetaLength?: number }) {
  return (
    <mesh castShadow={castShadow && !s?.transparent} receiveShadow {...x}>
      <sphereGeometry args={[r, seg, Math.max(8, Math.round(seg * 0.7)), 0, TAU, 0, thetaLength]} />
      <Mat color={color} {...s} />
    </mesh>
  );
}

export function Torus({
  r,
  tube,
  color,
  arc = TAU,
  seg = 32,
  s,
  castShadow = true,
  ...x
}: Xform & { r: number; tube: number; color: string; arc?: number; seg?: number; s?: Surface }) {
  return (
    <mesh castShadow={castShadow && !s?.transparent} receiveShadow {...x}>
      <torusGeometry args={[r, Math.max(0.015, tube), 10, seg, arc]} />
      <Mat color={color} {...s} />
    </mesh>
  );
}

/** Lathe from a module-level profile constant (stable reference → geometry built once). */
export function Lathe({
  points,
  color,
  seg = 28,
  s,
  castShadow = true,
  ...x
}: Xform & { points: Profile; color: string; seg?: number; s?: Surface }) {
  const pts = useMemo(() => points.map(([a, b]) => new Vector2(a, b)), [points]);
  return (
    <mesh castShadow={castShadow && !s?.transparent} receiveShadow {...x}>
      <latheGeometry args={[pts, seg]} />
      <Mat color={color} {...s} />
    </mesh>
  );
}
