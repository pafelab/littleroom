import { CuboidCollider, RigidBody } from '@react-three/rapier';
import type { ReactNode } from 'react';
import { HALF_D, HALF_W, ROOM } from '../config';
import { Box } from '../three/kit';
import { useRoom } from '../three/RoomContext';

type RoomShellProps = {
  walls: string;
  floor: string;
  trim: string;
  children?: ReactNode;
};

const { w, d, h, wall, floor: slab } = ROOM;

/** Cutaway shell: floor + back wall + left wall so the isometric camera sees in. */
export function RoomShell({ walls, floor, trim, children }: RoomShellProps) {
  const { live } = useRoom();
  return (
    <group>
      <Box size={[w + wall, slab, d + wall]} position={[-wall / 2, -slab / 2, -wall / 2]} color={floor} radius={0.05} />
      <Box size={[w + wall, h, wall]} position={[-wall / 2, h / 2, -HALF_D - wall / 2]} color={walls} radius={0.05} />
      <Box size={[wall, h, d]} position={[-HALF_W - wall / 2, h / 2, 0]} color={walls} radius={0.05} />

      <Box size={[w, 0.12, 0.04]} position={[0, 0.06, -HALF_D + 0.02]} color={trim} radius={0.015} />
      <Box size={[0.04, 0.12, d - 0.04]} position={[-HALF_W + 0.02, 0.06, 0.02]} color={trim} radius={0.015} />
      <Box size={[w + wall + 0.06, 0.08, wall + 0.06]} position={[-wall / 2, h + 0.04, -HALF_D - wall / 2]} color={trim} />
      <Box size={[wall + 0.06, 0.08, d + 0.03]} position={[-HALF_W - wall / 2, h + 0.04, 0.015]} color={trim} />

      {children}
      {live && <ShellColliders />}
    </group>
  );
}

const T = 0.3;

/** Invisible containment: four walls + floor + ceiling, thick enough to stop tunnelling. */
function ShellColliders() {
  return (
    <RigidBody type="fixed" colliders={false}>
      <CuboidCollider args={[HALF_W + T * 2, T, HALF_D + T * 2]} position={[0, -T, 0]} friction={0.85} />
      <CuboidCollider args={[HALF_W + T * 2, T, HALF_D + T * 2]} position={[0, h + T, 0]} />
      <CuboidCollider args={[T, h / 2 + T, HALF_D + T * 2]} position={[-HALF_W - T, h / 2, 0]} />
      <CuboidCollider args={[T, h / 2 + T, HALF_D + T * 2]} position={[HALF_W + T, h / 2, 0]} />
      <CuboidCollider args={[HALF_W + T * 2, h / 2 + T, T]} position={[0, h / 2, -HALF_D - T]} />
      <CuboidCollider args={[HALF_W + T * 2, h / 2 + T, T]} position={[0, h / 2, HALF_D + T]} />
    </RigidBody>
  );
}
