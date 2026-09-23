import { useFrame } from '@react-three/fiber';
import { BallCollider, CuboidCollider, CylinderCollider, type RapierRigidBody } from '@react-three/rapier';
import { useMemo, useRef } from 'react';
import { Color, MeshStandardMaterial, type Group, type Object3D } from 'three';
import { RoomShell } from '../components/RoomShell';
import type { V3 } from '../config';
import { useAccentLight } from '../three/accentLights';
import { FixedAnchor, SphericalLink } from '../three/joints';
import { Box, Cyl, GLASS, Lathe, METAL, Sphere, Torus, type Profile } from '../three/kit';
import { FixedColliders, PhysicsProp } from '../three/PhysicsProp';
import { useRoom } from '../three/RoomContext';
import { RESTAURANT as P, mix } from './palettes';
import type { RoomModule } from './types';

const HALF_PI = Math.PI / 2;
const TABLE_TOP = 0.862;

const BOWL: Profile = [[0.018, 0], [0.05, 0.02], [0.075, 0.06], [0.08, 0.1], [0.07, 0.16], [0.066, 0.18]];
const WINE: Profile = [[0, 0.02], [0.048, 0.022], [0.07, 0.06], [0.074, 0.1], [0, 0.1]];
const BOTTLE: Profile = [[0, 0], [0.075, 0], [0.08, 0.02], [0.08, 0.2], [0.05, 0.27], [0.028, 0.31], [0.028, 0.38], [0, 0.38]];
const LEG: Profile = [[0, 0], [0.05, 0], [0.055, 0.05], [0.035, 0.12], [0.05, 0.25], [0.035, 0.38], [0.045, 0.49], [0, 0.49]];
const CUP_BRASS: Profile = [[0, 0], [0.03, 0], [0.045, 0.04], [0.04, 0.05], [0, 0.03]];

const WARM = new Color(P.accent).lerp(new Color(P.light), 0.35);

/* ─── Gimmick 1: a chandelier on a spherical joint — a real pendulum ─── */

const PIVOT: V3 = [0.2, 3.0, -0.1];
const ROD = 0.85;

function Chandelier() {
  const { live } = useRoom();
  const anchor = useRef<RapierRigidBody>(null);
  const body = useRef<RapierRigidBody>(null);
  const carrier = useRef<Object3D | null>(null);
  const flame = useMemo(
    () => new MeshStandardMaterial({ color: P.accent, emissive: P.accent, emissiveIntensity: 2.2, roughness: 0.7, userData: { glow: true } }),
    [],
  );
  const arms = useMemo(() => Array.from({ length: 6 }, (_, i) => (i / 6) * Math.PI * 2), []);

  useFrame(({ clock }) => {
    flame.emissiveIntensity = 2 + Math.sin(clock.elapsedTime * 9.3) * 0.2 + Math.sin(clock.elapsedTime * 14.1) * 0.15;
  });

  useAccentLight(0, (light, t) => {
    const o = carrier.current;
    if (!o) return;
    light.position.set(o.position.x, o.position.y + 0.12, o.position.z);
    light.intensity = 5.2 + Math.sin(t * 9.3) * 0.3;
    light.distance = 4.8;
    light.decay = 2;
    light.color.copy(WARM);
  });

  return (
    <>
      {live && <FixedAnchor bodyRef={anchor} position={PIVOT} />}
      <PhysicsProp
        id="chandelier"
        bodyRef={body}
        objectRef={carrier}
        position={[PIVOT[0], PIVOT[1] - ROD, PIVOT[2]]}
        colliders={
          <>
            <BallCollider args={[0.12]} mass={2} />
            <CylinderCollider args={[0.07, 0.44]} position={[0, 0.06, 0]} mass={1.2} />
          </>
        }
        linearDamping={0.02}
        angularDamping={0.05}
        drag={{ tether: { anchor: PIVOT, radius: ROD }, throwMultiplier: 0.7, spin: 0.2 }}
      >
        <Cyl r={0.02} h={ROD} position={[0, ROD / 2, 0]} color={P.accent} s={METAL} seg={8} />
        {[0.25, 0.5, 0.75].map((f) => (
          <Torus key={f} r={0.035} tube={0.015} rotation={[HALF_PI, 0, 0]} position={[0, ROD * f, 0]} color={P.accent} s={METAL} seg={14} />
        ))}
        <Sphere r={0.09} color={P.accent} s={METAL} />
        <Cyl r={0.05} r2={0.015} h={0.1} position={[0, -0.12, 0]} color={P.accent} s={METAL} seg={12} />
        <Sphere r={0.035} position={[0, -0.18, 0]} color={P.accent} s={METAL} seg={10} />
        <Torus r={0.4} tube={0.028} rotation={[HALF_PI, 0, 0]} position={[0, 0.02, 0]} color={P.accent} s={METAL} seg={48} />
        {arms.map((a) => (
          <group key={a} rotation={[0, -a, 0]}>
            <Box size={[0.4, 0.035, 0.035]} position={[0.2, 0.02, 0]} color={P.accent} s={METAL} radius={0.014} />
            <Lathe points={CUP_BRASS} position={[0.4, 0.04, 0]} color={P.accent} s={METAL} seg={12} />
            <Cyl r={0.025} h={0.13} position={[0.4, 0.14, 0]} color={P.light} seg={10} />
            <group position={[0.4, 0.235, 0]} scale={[1, 1.6, 1]}>
              <mesh material={flame}>
                <sphereGeometry args={[0.026, 10, 8]} />
              </mesh>
            </group>
            <Sphere r={0.03} position={[0.3, -0.07, 0]} color={P.light} s={{ emissive: P.light, emissiveIntensity: 0.25 }} seg={10} />
          </group>
        ))}
      </PhysicsProp>
      {live && <SphericalLink a={anchor} b={body} anchorA={[0, 0, 0]} anchorB={[0, ROD, 0]} />}
    </>
  );
}

/* ─── Gimmick 2: tippy wine glasses — heavy bowl, featherweight foot ─── */

function WineGlass({ id, position }: { id: string; position: V3 }) {
  return (
    <PhysicsProp
      id={id}
      position={position}
      colliders={
        <>
          <CylinderCollider args={[0.015, 0.065]} position={[0, 0.015, 0]} mass={0.03} friction={0.9} restitution={0.05} />
          <CylinderCollider args={[0.09, 0.075]} position={[0, 0.3, 0]} mass={0.28} friction={0.4} restitution={0.05} />
        </>
      }
      linearDamping={0.05}
      angularDamping={0.2}
      ccd
      drag={{ throwMultiplier: 0.8, spin: 0.7 }}
    >
      <Cyl r={0.065} r2={0.07} h={0.03} position={[0, 0.015, 0]} color={P.light} s={GLASS} />
      <Cyl r={0.017} h={0.2} position={[0, 0.13, 0]} color={P.light} s={GLASS} seg={10} />
      <Lathe points={WINE} position={[0, 0.21, 0]} color={P.dominant} seg={20} />
      <Lathe points={BOWL} position={[0, 0.21, 0]} color={P.light} s={{ ...GLASS, doubleSide: true }} seg={24} />
    </PhysicsProp>
  );
}

/* ─── Props ─── */

function Plate({ id, position }: { id: string; position: V3 }) {
  return (
    <PhysicsProp id={id} position={position} colliders={<CylinderCollider args={[0.015, 0.15]} position={[0, 0.015, 0]} mass={0.3} friction={0.7} />}>
      <Cyl r={0.15} r2={0.12} h={0.03} position={[0, 0.015, 0]} color={P.light} seg={28} />
      <Torus r={0.135} tube={0.015} rotation={[HALF_PI, 0, 0]} position={[0, 0.03, 0]} color={P.accent} s={METAL} />
    </PhysicsProp>
  );
}

function Cutlery({ id, position, knife }: { id: string; position: V3; knife?: boolean }) {
  return (
    <PhysicsProp
      id={id}
      position={position}
      colliders={<CuboidCollider args={[0.03, 0.015, 0.11]} mass={0.05} friction={0.6} />}
      ccd
    >
      <Box size={[0.03, 0.03, 0.2]} position={[0, 0, 0.02]} color={P.accent} s={METAL} radius={0.012} />
      <Box size={knife ? [0.04, 0.03, 0.1] : [0.06, 0.03, 0.06]} position={[0, 0, knife ? -0.06 : -0.08]} color={P.accent} s={METAL} radius={0.012} />
    </PhysicsProp>
  );
}

function Bottle() {
  return (
    <PhysicsProp
      id="bottle"
      position={[0.05, TABLE_TOP, -0.38]}
      colliders={<CylinderCollider args={[0.19, 0.08]} position={[0, 0.19, 0]} mass={0.9} friction={0.7} />}
    >
      <Lathe points={BOTTLE} color={P.deep} />
      <Cyl r={0.083} h={0.08} position={[0, 0.11, 0]} color={P.light} />
      <Cyl r={0.032} h={0.06} position={[0, 0.36, 0]} color={P.accent} s={METAL} seg={12} />
    </PhysicsProp>
  );
}

function Cloche() {
  return (
    <PhysicsProp
      id="cloche"
      position={[0.3, TABLE_TOP, -0.22]}
      colliders={<CylinderCollider args={[0.08, 0.16]} position={[0, 0.08, 0]} mass={0.6} friction={0.7} />}
    >
      <Cyl r={0.16} r2={0.13} h={0.03} position={[0, 0.015, 0]} color={P.light} seg={28} />
      <Sphere r={0.13} thetaLength={HALF_PI} position={[0, 0.03, 0]} color={P.accent} s={METAL} seg={28} />
      <Torus r={0.13} tube={0.015} rotation={[HALF_PI, 0, 0]} position={[0, 0.035, 0]} color={P.accent} s={METAL} />
      <Sphere r={0.028} position={[0, 0.175, 0]} color={P.accent} s={METAL} seg={12} />
    </PhysicsProp>
  );
}

function ParlourChair({ id, position, yaw }: { id: string; position: V3; yaw: number }) {
  return (
    <PhysicsProp
      id={id}
      position={position}
      rotation={[0, yaw, 0]}
      colliders={
        <>
          <CuboidCollider args={[0.25, 0.07, 0.24]} position={[0, 0.5, 0]} mass={1.1} />
          <CuboidCollider args={[0.23, 0.21, 0.22]} position={[0, 0.22, 0]} mass={1.2} />
          <CuboidCollider args={[0.25, 0.4, 0.035]} position={[0, 0.95, -0.21]} mass={0.9} />
        </>
      }
      angularDamping={0.4}
    >
      {([[-0.2, -0.19], [0.2, -0.19], [-0.2, 0.19], [0.2, 0.19]] as const).map(([x, z], i) => (
        <Box key={i} size={[0.06, 0.44, 0.06]} position={[x, 0.22, z]} color={P.dominant} radius={0.022} />
      ))}
      <Box size={[0.5, 0.08, 0.48]} position={[0, 0.47, 0]} color={P.dominant} />
      <Box size={[0.44, 0.07, 0.42]} position={[0, 0.54, 0.01]} color={P.mid} radius={0.03} />
      <Box size={[0.5, 0.8, 0.07]} position={[0, 0.95, -0.21]} color={P.dominant} />
      <Sphere r={0.2} scale={[1, 1.3, 0.15]} position={[0, 0.95, -0.17]} color={P.mid} />
      <Sphere r={0.04} position={[-0.25, 1.37, -0.21]} color={P.accent} s={METAL} seg={12} />
      <Sphere r={0.04} position={[0.25, 1.37, -0.21]} color={P.accent} s={METAL} seg={12} />
    </PhysicsProp>
  );
}

/* ─── Fixed furniture + decor ─── */

function Sconce({ position, slot }: { position: V3; slot: number }) {
  useAccentLight(slot, (light, t) => {
    light.position.set(position[0], position[1] + 0.25, position[2] + 0.18);
    light.intensity = 1.5 + Math.sin(t * 8.1 + slot) * 0.12;
    light.distance = 2.4;
    light.decay = 2;
    light.color.copy(WARM);
  });
  return (
    <group position={position}>
      <Box size={[0.12, 0.2, 0.04]} position={[0, 0, 0.02]} color={P.accent} s={METAL} radius={0.015} />
      <Box size={[0.04, 0.04, 0.16]} position={[0, 0, 0.1]} color={P.accent} s={METAL} radius={0.015} />
      <Lathe points={CUP_BRASS} position={[0, 0.02, 0.18]} color={P.accent} s={METAL} seg={12} />
      <Cyl r={0.025} h={0.12} position={[0, 0.12, 0.18]} color={P.light} seg={10} />
      <Sphere r={0.026} scale={[1, 1.6, 1]} position={[0, 0.22, 0.18]} color={P.accent} s={{ emissive: P.accent, emissiveIntensity: 2 }} seg={10} />
    </group>
  );
}

function ClockPendulum() {
  const pendulum = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (pendulum.current) pendulum.current.rotation.x = Math.sin(clock.elapsedTime * Math.PI) * 0.18;
  });
  return (
    <group ref={pendulum} position={[-1.78, 1.3, -1.55]}>
      <Box size={[0.03, 0.5, 0.03]} position={[0, -0.25, 0]} color={P.accent} s={METAL} radius={0.012} />
      <Cyl r={0.07} h={0.03} rotation={[0, 0, HALF_PI]} position={[0, -0.52, 0]} color={P.accent} s={METAL} />
    </group>
  );
}

function Furniture() {
  return (
    <>
      <Box size={[4.4, 1.1, 0.04]} position={[0, 0.55, -2.18]} color={P.dominant} radius={0.015} />
      <Box size={[0.04, 1.1, 4.36]} position={[-2.18, 0.55, 0.02]} color={P.dominant} radius={0.015} />
      <Box size={[4.4, 0.04, 0.06]} position={[0, 1.12, -2.17]} color={P.accent} s={METAL} radius={0.015} />
      <Box size={[0.06, 0.04, 4.36]} position={[-2.17, 1.12, 0.02]} color={P.accent} s={METAL} radius={0.015} />
      {[-1.5, -0.5, 0.5, 1.5].map((x) => (
        <Box key={x} size={[0.7, 0.6, 0.03]} position={[x, 0.58, -2.15]} color={P.deep} radius={0.012} />
      ))}

      <Box size={[4.5, 0.2, 0.22]} position={[0, 3.1, -0.1]} color={P.dominant} />
      <Cyl r={0.12} h={0.04} position={[PIVOT[0], 2.99, PIVOT[2]]} color={P.accent} s={METAL} />

      <Box size={[1.7, 0.08, 1.0]} position={[0.2, 0.82, -0.1]} color={P.light} />
      <Box size={[1.74, 0.34, 1.04]} position={[0.2, 0.66, -0.1]} color={P.light} />
      {([[-0.52, -0.5], [0.92, -0.5], [-0.52, 0.3], [0.92, 0.3]] as const).map(([x, z]) => (
        <Lathe key={`${x}${z}`} points={LEG} position={[x, 0, z]} color={P.dominant} seg={16} />
      ))}

      <Box size={[0.4, 2.1, 0.45]} position={[-2.0, 1.05, -1.55]} color={P.dominant} />
      <Box size={[0.46, 0.3, 0.5]} position={[-2.0, 2.25, -1.55]} color={P.dominant} />
      <Sphere r={0.05} position={[-2.0, 2.44, -1.55]} color={P.accent} s={METAL} />
      <Cyl r={0.14} h={0.03} rotation={[0, 0, HALF_PI]} position={[-1.785, 1.75, -1.55]} color={P.light} />
      <Torus r={0.14} tube={0.018} rotation={[0, HALF_PI, 0]} position={[-1.78, 1.75, -1.55]} color={P.accent} s={METAL} />
      <Box size={[0.03, 0.1, 0.03]} position={[-1.765, 1.79, -1.55]} color={P.deep} radius={0.012} />
      <Box size={[0.03, 0.03, 0.08]} position={[-1.765, 1.75, -1.52]} color={P.deep} radius={0.012} />
      <Box size={[0.03, 0.8, 0.26]} position={[-1.795, 0.95, -1.55]} color={P.deep} radius={0.012} />
      <ClockPendulum />

      <group position={[0.3, 1.95, -2.16]}>
        <Box size={[1.0, 0.75, 0.05]} color={P.accent} s={METAL} />
        <Box size={[0.84, 0.59, 0.03]} position={[0, 0, 0.02]} color={P.light} radius={0.012} />
        <Sphere r={0.35} scale={[1.15, 0.45, 0.1]} position={[-0.12, -0.2, 0.03]} color={P.mid} />
        <Sphere r={0.28} scale={[1.2, 0.5, 0.1]} position={[0.2, -0.24, 0.035]} color={P.dominant} />
        <Sphere r={0.06} position={[0.25, 0.14, 0.035]} color={P.accent} s={{ emissive: P.accent, emissiveIntensity: 0.3 }} />
      </group>

      <group position={[-2.16, 1.95, -0.2]} rotation={[0, HALF_PI, 0]}>
        <Torus r={0.3} tube={0.035} scale={[1, 1.35, 1]} color={P.accent} s={METAL} />
        <Cyl r={0.29} h={0.03} rotation={[HALF_PI, 0, 0]} scale={[1, 1, 1.35]} color={P.light} s={{ emissive: P.light, emissiveIntensity: 0.12 }} />
      </group>

      <Sconce position={[-1.2, 1.85, -2.18]} slot={1} />
      <Sconce position={[1.6, 1.85, -2.18]} slot={2} />

      <FixedColliders>
        <CuboidCollider args={[0.87, 0.43, 0.52]} position={[0.2, 0.43, -0.1]} friction={0.8} />
        <CuboidCollider args={[0.2, 1.1, 0.23]} position={[-2.0, 1.1, -1.55]} />
      </FixedColliders>
    </>
  );
}

function RestaurantContents() {
  return (
    <>
      <RoomShell walls={P.mid} floor={P.deep} trim={P.accent} />
      <Furniture />
      <Chandelier />
      <Plate id="plate-left" position={[-0.38, TABLE_TOP, -0.1]} />
      <Plate id="plate-right" position={[0.78, TABLE_TOP, -0.1]} />
      <Plate id="plate-front" position={[0.2, TABLE_TOP, 0.2]} />
      <Cutlery id="fork" position={[0.0, TABLE_TOP + 0.016, 0.2]} />
      <Cutlery id="knife" position={[0.4, TABLE_TOP + 0.016, 0.2]} knife />
      <WineGlass id="glass-a" position={[-0.3, TABLE_TOP, 0.22]} />
      <WineGlass id="glass-b" position={[0.72, TABLE_TOP, 0.22]} />
      <WineGlass id="glass-c" position={[0.52, TABLE_TOP, 0.3]} />
      <WineGlass id="glass-d" position={[0.72, TABLE_TOP, -0.42]} />
      <Bottle />
      <Cloche />
      <ParlourChair id="chair-left" position={[-0.95, 0.002, -0.1]} yaw={HALF_PI} />
      <ParlourChair id="chair-right" position={[1.35, 0.002, -0.1]} yaw={-HALF_PI} />
    </>
  );
}

export const Restaurant: RoomModule = {
  id: 'restaurant',
  name: 'Victorian Restaurant',
  caption: 'Give the chandelier a shove. Mind the glassware.',
  palette: P,
  backdrop: mix(P.deep, P.mid, 0.3),
  ink: 'light',
  mood: { key: 0.6, fill: 0.62, rim: 1.1 },
  Contents: RestaurantContents,
};
