import { CapsuleCollider, CuboidCollider, CylinderCollider, type RapierRigidBody } from '@react-three/rapier';
import { useMemo, useRef } from 'react';
import { Color, type Object3D } from 'three';
import { RoomShell } from '../components/RoomShell';
import type { V3 } from '../config';
import { useAccentLight } from '../three/accentLights';
import { FixedAnchor, RopeLine, RopeLink } from '../three/joints';
import { Box, Cyl, Lathe, METAL, Sphere, Torus, type Profile } from '../three/kit';
import { FixedColliders, PhysicsProp } from '../three/PhysicsProp';
import { useRoom } from '../three/RoomContext';
import { BAKERY as P, mix } from './palettes';
import type { RoomModule } from './types';

const HALF_PI = Math.PI / 2;
const COUNTER_TOP = 0.962;
const CAFE_TOP = 0.742;

const BAGUETTE: Profile = [[0, -0.3], [0.03, -0.29], [0.045, -0.25], [0.05, -0.15], [0.05, 0.15], [0.045, 0.25], [0.03, 0.29], [0, 0.3]];
const CAKE_STAND: Profile = [[0, 0], [0.1, 0], [0.1, 0.015], [0.03, 0.03], [0.025, 0.12], [0.18, 0.13], [0.18, 0.145], [0, 0.145]];
const CUP: Profile = [[0, 0], [0.045, 0], [0.05, 0.01], [0.065, 0.09], [0.058, 0.09], [0.045, 0.02], [0, 0.02]];

const OVEN_GLOW = new Color(P.dominant).lerp(new Color(P.accent), 0.35);

/* ─── Gimmick 1: a chalk menu board swinging on two rope joints ─── */

const ANCHOR_L: V3 = [-0.1, 2.72, -1.92];
const ANCHOR_R: V3 = [0.8, 2.72, -1.92];
const ROPE = 0.42;
const CORNER_L: V3 = [-0.45, 0.3, 0];
const CORNER_R: V3 = [0.45, 0.3, 0];

function MenuBoard() {
  const { live } = useRoom();
  const beam = useRef<RapierRigidBody>(null);
  const board = useRef<RapierRigidBody>(null);
  const carrier = useRef<Object3D | null>(null);
  const lines = [0.42, 0.34, 0.38];

  return (
    <>
      <Box size={[1.3, 0.1, 0.26]} position={[0.35, 2.78, -2.07]} color={P.mid} />
      <Box size={[0.06, 0.22, 0.2]} position={[-0.2, 2.64, -2.1]} color={P.mid} radius={0.025} />
      <Box size={[0.06, 0.22, 0.2]} position={[0.9, 2.64, -2.1]} color={P.mid} radius={0.025} />
      <Torus r={0.03} tube={0.015} position={ANCHOR_L} color={P.deep} s={METAL} />
      <Torus r={0.03} tube={0.015} position={ANCHOR_R} color={P.deep} s={METAL} />

      {live && <FixedAnchor bodyRef={beam} />}
      <PhysicsProp
        id="menu-board"
        bodyRef={board}
        objectRef={carrier}
        position={[0.35, ANCHOR_L[1] - ROPE - 0.3, -1.92]}
        colliders={<CuboidCollider args={[0.58, 0.32, 0.04]} mass={1.1} friction={0.6} />}
        linearDamping={0.08}
        angularDamping={0.25}
        drag={{ tether: { anchor: [0.35, ANCHOR_L[1], -1.92], radius: ROPE + 0.36 }, throwMultiplier: 0.6, spin: 0.2 }}
      >
        <Box size={[1.1, 0.6, 0.06]} color={P.deep} radius={0.03} />
        <Box size={[1.16, 0.05, 0.08]} position={[0, 0.3, 0]} color={P.mid} radius={0.02} />
        <Box size={[1.16, 0.05, 0.08]} position={[0, -0.3, 0]} color={P.mid} radius={0.02} />
        <Box size={[0.05, 0.64, 0.08]} position={[-0.56, 0, 0]} color={P.mid} radius={0.02} />
        <Box size={[0.05, 0.64, 0.08]} position={[0.56, 0, 0]} color={P.mid} radius={0.02} />
        <Box size={[0.36, 0.06, 0.03]} position={[-0.2, 0.18, 0.03]} color={P.light} radius={0.012} />
        {[0.07, -0.04, -0.15].map((y, i) => (
          <group key={y}>
            <Box size={[lines[i], 0.035, 0.03]} position={[-0.38 + lines[i] / 2, y, 0.03]} color={P.light} radius={0.012} />
            <Box size={[0.09, 0.035, 0.03]} position={[0.16, y, 0.03]} color={P.dominant} radius={0.012} />
          </group>
        ))}
        <Torus r={0.07} tube={0.018} arc={Math.PI * 1.2} rotation={[0, 0, 0.4]} position={[0.38, 0.03, 0.035]} color={P.light} />
        <Sphere r={0.024} position={[0.36, -0.17, 0.035]} color={P.accent} />
      </PhysicsProp>
      {live && <RopeLink a={beam} b={board} anchorA={ANCHOR_L} anchorB={CORNER_L} length={ROPE} />}
      {live && <RopeLink a={beam} b={board} anchorA={ANCHOR_R} anchorB={CORNER_R} length={ROPE} />}
      <RopeLine from={ANCHOR_L} target={carrier} localAnchor={CORNER_L} color={P.light} />
      <RopeLine from={ANCHOR_R} target={carrier} localAnchor={CORNER_R} color={P.light} />
    </>
  );
}

/* ─── Gimmick 2: a criss-cross loaf stack you can topple jenga-style ─── */

function Loaf() {
  return (
    <>
      <Box size={[0.5, 0.15, 0.16]} color={P.dominant} radius={0.065} />
      {[-0.14, 0, 0.14].map((x) => (
        <Box key={x} size={[0.035, 0.03, 0.12]} position={[x, 0.066, 0]} rotation={[0, 0.5, 0]} color={P.light} radius={0.012} />
      ))}
    </>
  );
}

function BreadStack({ base }: { base: V3 }) {
  const loaves = useMemo(() => {
    const out: { id: string; position: V3; rotation: V3 }[] = [];
    for (let layer = 0; layer < 4; layer++) {
      const alongX = layer % 2 === 0;
      for (let k = 0; k < 3; k++) {
        const offset = (k - 1) * 0.166;
        out.push({
          id: `loaf-${layer}-${k}`,
          position: [base[0] + (alongX ? 0 : offset), base[1] + 0.076 + layer * 0.152, base[2] + (alongX ? offset : 0)],
          rotation: [0, alongX ? 0 : HALF_PI, 0],
        });
      }
    }
    return out;
  }, [base]);

  return (
    <>
      {loaves.map((loaf) => (
        <PhysicsProp
          key={loaf.id}
          id={loaf.id}
          position={loaf.position}
          rotation={loaf.rotation}
          colliders={<CuboidCollider args={[0.25, 0.075, 0.08]} mass={0.35} friction={1} restitution={0.02} />}
          angularDamping={0.4}
        >
          <Loaf />
        </PhysicsProp>
      ))}
    </>
  );
}

/* ─── Props ─── */

function CakeStand() {
  return (
    <PhysicsProp
      id="cake"
      position={[-1.9, COUNTER_TOP, -0.75]}
      colliders={<CylinderCollider args={[0.19, 0.16]} position={[0, 0.19, 0]} mass={0.9} friction={0.8} />}
    >
      <Lathe points={CAKE_STAND} color={P.light} />
      <Cyl r={0.15} h={0.12} position={[0, 0.205, 0]} color={P.dominant} />
      <Torus r={0.14} tube={0.025} rotation={[HALF_PI, 0, 0]} position={[0, 0.265, 0]} color={P.light} />
      <Cyl r={0.1} h={0.1} position={[0, 0.315, 0]} color={P.light} />
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * Math.PI * 2;
        return <Sphere key={i} r={0.025} position={[Math.cos(a) * 0.065, 0.375, Math.sin(a) * 0.065]} color={P.accent} seg={10} />;
      })}
      <Sphere r={0.035} position={[0, 0.39, 0]} color={P.accent} seg={12} />
    </PhysicsProp>
  );
}

function Tray() {
  return (
    <PhysicsProp
      id="tray"
      position={[-1.9, COUNTER_TOP + 0.015, -0.1]}
      colliders={<CuboidCollider args={[0.18, 0.015, 0.23]} mass={0.3} friction={0.8} />}
    >
      <Box size={[0.36, 0.03, 0.46]} color={P.light} radius={0.012} />
    </PhysicsProp>
  );
}

function Croissant({ id, position, yaw }: { id: string; position: V3; yaw: number }) {
  return (
    <PhysicsProp
      id={id}
      position={position}
      rotation={[0, yaw, 0]}
      colliders={<CuboidCollider args={[0.1, 0.04, 0.07]} mass={0.08} friction={0.8} />}
    >
      <Torus r={0.07} tube={0.04} arc={Math.PI * 1.2} rotation={[HALF_PI, 0, -0.1 * Math.PI]} color={P.dominant} seg={20} />
      <Sphere r={0.03} position={[0.07, 0, 0.02]} color={P.mid} seg={10} />
      <Sphere r={0.03} position={[-0.068, 0, 0.03]} color={P.mid} seg={10} />
    </PhysicsProp>
  );
}

function Baguette({ id, position }: { id: string; position: V3 }) {
  return (
    <PhysicsProp
      id={id}
      position={position}
      rotation={[HALF_PI, 0, 0.05]}
      colliders={<CapsuleCollider args={[0.25, 0.05]} mass={0.25} friction={0.8} />}
    >
      <Lathe points={BAGUETTE} color={P.dominant} seg={16} />
      {[-0.18, -0.06, 0.06, 0.18].map((y) => (
        <Box key={y} size={[0.06, 0.035, 0.03]} position={[0, y, -0.046]} rotation={[0, 0, 0.6]} color={P.light} radius={0.012} />
      ))}
    </PhysicsProp>
  );
}

function FlourSack() {
  return (
    <PhysicsProp
      id="flour-sack"
      position={[1.5, 0.002, -1.3]}
      rotation={[0, -0.3, 0]}
      colliders={<CuboidCollider args={[0.2, 0.25, 0.16]} position={[0, 0.25, 0]} mass={2.2} friction={0.9} />}
      angularDamping={0.6}
    >
      <Box size={[0.42, 0.5, 0.34]} position={[0, 0.25, 0]} color={P.light} radius={0.12} />
      <Cyl r={0.08} r2={0.11} h={0.1} position={[0, 0.54, 0]} color={P.light} />
      <Torus r={0.075} tube={0.02} rotation={[HALF_PI, 0, 0]} position={[0, 0.54, 0]} color={P.mid} />
      {[-0.05, 0, 0.05].map((x, i) => (
        <Sphere key={x} r={0.035} scale={[0.6, 1, 0.4]} position={[x, 0.26 + (i === 1 ? 0.03 : 0), 0.17]} color={P.dominant} seg={10} />
      ))}
    </PhysicsProp>
  );
}

function CoffeeCup({ id, position, yaw }: { id: string; position: V3; yaw: number }) {
  return (
    <PhysicsProp
      id={id}
      position={position}
      rotation={[0, yaw, 0]}
      colliders={<CylinderCollider args={[0.045, 0.065]} position={[0, 0.045, 0]} mass={0.18} friction={0.7} />}
    >
      <Lathe points={CUP} color={P.light} s={{ doubleSide: true }} />
      <Torus r={0.058} tube={0.015} rotation={[HALF_PI, 0, 0]} position={[0, 0.05, 0]} color={P.accent} seg={20} />
      <Cyl r={0.056} h={0.03} position={[0, 0.07, 0]} color={P.deep} seg={16} />
      <Torus r={0.028} tube={0.015} position={[0.07, 0.05, 0]} color={P.light} seg={14} />
    </PhysicsProp>
  );
}

/* ─── Fixed furniture + decor ─── */

function Furniture() {
  useAccentLight(0, (light, t) => {
    light.position.set(-1.6, 0.85, -1.05);
    light.intensity = 2.6 + Math.sin(t * 7.1) * 0.25 + Math.sin(t * 12.7) * 0.15;
    light.distance = 3.2;
    light.decay = 2;
    light.color.copy(OVEN_GLOW);
  });

  return (
    <>
      <Box size={[1.1, 1.45, 0.9]} position={[-1.6, 0.725, -1.72]} color={P.deep} />
      <Cyl r={0.28} h={0.03} rotation={[HALF_PI, 0, 0]} position={[-1.6, 0.82, -1.265]} color={P.dominant} s={{ emissive: P.dominant, emissiveIntensity: 1.3 }} />
      <Torus r={0.3} tube={0.035} position={[-1.6, 0.82, -1.26]} color={P.mid} />
      <Box size={[0.36, 0.04, 0.04]} position={[-1.6, 0.42, -1.25]} color={P.light} s={METAL} radius={0.015} />
      <Cyl r={0.12} h={1.55} position={[-1.8, 2.22, -1.95]} color={P.mid} />

      <Box size={[0.6, 0.9, 2.2]} position={[-1.9, 0.45, -0.05]} color={P.light} />
      <Box size={[0.66, 0.06, 2.26]} position={[-1.9, 0.93, -0.05]} color={P.mid} />
      {[-0.75, -0.05, 0.65].map((z) => (
        <Box key={z} size={[0.03, 0.55, 0.6]} position={[-1.59, 0.45, z]} color={P.dominant} radius={0.012} />
      ))}

      <Cyl r={0.36} h={0.04} position={[1.55, 0.72, -0.35]} color={P.light} />
      <Torus r={0.36} tube={0.015} rotation={[HALF_PI, 0, 0]} position={[1.55, 0.72, -0.35]} color={P.mid} />
      <Cyl r={0.04} h={0.7} position={[1.55, 0.35, -0.35]} color={P.deep} seg={12} />
      <Cyl r={0.22} h={0.03} position={[1.55, 0.015, -0.35]} color={P.deep} />

      {Array.from({ length: 9 }, (_, i) => (
        <group key={i} position={[-2.2 + 0.245 + i * 0.49, 2.86, -2.15]}>
          <Box size={[0.49, 0.28, 0.06]} color={i % 2 ? P.light : P.accent} radius={0.02} />
          <Sphere r={0.12} scale={[2, 1, 0.3]} position={[0, -0.14, 0]} color={i % 2 ? P.light : P.accent} seg={14} />
        </group>
      ))}

      <FixedColliders>
        <CuboidCollider args={[0.55, 0.725, 0.45]} position={[-1.6, 0.725, -1.72]} />
        <CuboidCollider args={[0.33, 0.48, 1.13]} position={[-1.9, 0.48, -0.05]} friction={0.8} />
        <CylinderCollider args={[0.02, 0.36]} position={[1.55, 0.72, -0.35]} friction={0.8} />
        <CylinderCollider args={[0.35, 0.05]} position={[1.55, 0.35, -0.35]} />
        <CylinderCollider args={[0.015, 0.22]} position={[1.55, 0.015, -0.35]} />
      </FixedColliders>
    </>
  );
}

function BakeryContents() {
  return (
    <>
      <RoomShell walls={P.dominant} floor={P.mid} trim={P.deep} />
      <Furniture />
      <MenuBoard />
      <BreadStack base={[0.75, 0.002, 0.55]} />
      <CakeStand />
      <Tray />
      <Croissant id="croissant-a" position={[-1.92, COUNTER_TOP + 0.072, -0.24]} yaw={0.4} />
      <Croissant id="croissant-b" position={[-1.88, COUNTER_TOP + 0.072, -0.08]} yaw={-0.6} />
      <Croissant id="croissant-c" position={[-1.9, COUNTER_TOP + 0.072, 0.07]} yaw={1.2} />
      <Baguette id="baguette-a" position={[-2.0, COUNTER_TOP + 0.052, 0.62]} />
      <Baguette id="baguette-b" position={[-1.89, COUNTER_TOP + 0.052, 0.6]} />
      <Baguette id="baguette-c" position={[-1.78, COUNTER_TOP + 0.052, 0.64]} />
      <FlourSack />
      <CoffeeCup id="cup-a" position={[1.45, CAFE_TOP, -0.28]} yaw={0.3} />
      <CoffeeCup id="cup-b" position={[1.68, CAFE_TOP, -0.45]} yaw={2.2} />
    </>
  );
}

export const Bakery: RoomModule = {
  id: 'bakery',
  name: 'Bakery',
  caption: 'Pull one loaf from the stack. Carefully. Or not.',
  palette: P,
  backdrop: mix(P.light, P.dominant, 0.4),
  ink: 'dark',
  mood: { key: 1, fill: 1, rim: 0.85 },
  Contents: BakeryContents,
};
