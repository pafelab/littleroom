import { useFrame } from '@react-three/fiber';
import { BallCollider, CuboidCollider, CylinderCollider, type RapierRigidBody } from '@react-three/rapier';
import { useRef } from 'react';
import { MathUtils, Vector3, type Object3D } from 'three';
import { RoomShell } from '../components/RoomShell';
import { HALF_D, HALF_W, type V3 } from '../config';
import { Chain } from '../three/Chain';
import { Box, Cyl, Lathe, Sphere, Torus, type Profile } from '../three/kit';
import { FixedColliders, PhysicsProp } from '../three/PhysicsProp';
import { useRoom, useRoomFlag, useTidyReset } from '../three/RoomContext';
import { FLORIST as P, mix } from './palettes';
import type { RoomModule } from './types';

const HALF_PI = Math.PI / 2;
const COUNTER_TOP = 0.962;

const BUCKET: Profile = [[0, 0], [0.15, 0], [0.155, 0.01], [0.19, 0.3], [0.2, 0.32], [0.185, 0.32], [0.175, 0.3], [0.14, 0.02], [0, 0.02]];
const POT: Profile = [[0, 0], [0.16, 0], [0.17, 0.02], [0.22, 0.34], [0.24, 0.36], [0.24, 0.4], [0.2, 0.4], [0.19, 0.36], [0, 0.36]];
const VASE: Profile = [[0, 0], [0.07, 0], [0.09, 0.06], [0.08, 0.16], [0.05, 0.22], [0.06, 0.26], [0.052, 0.26], [0, 0.2]];
const SMALL_POT: Profile = [[0, 0], [0.06, 0], [0.065, 0.01], [0.085, 0.11], [0.09, 0.12], [0, 0.12]];
const BLOOMS: V3[] = [[0, 0.47, 0], [0.1, 0.43, 0.05], [-0.09, 0.44, 0.06], [0.03, 0.42, -0.1], [-0.07, 0.41, -0.07]];

type PetalSpawn = { id: string; origin: V3; position: V3; rotation: V3; velocity: V3; color: string };

const _up = new Vector3();
const _mouth = new Vector3();

/* ─── Gimmick 1: vines hung from spherical-joint chains ─── */

function Vine({ id, anchor, bloomAt }: { id: string; anchor: V3; bloomAt: readonly number[] }) {
  return (
    <Chain
      id={id}
      anchor={anchor}
      count={5}
      segment={0.22}
      tethered
      linearDamping={0.25}
      angularDamping={0.5}
      throwMultiplier={0.5}
      collider={() => <BallCollider args={[0.07]} mass={0.06} friction={0.4} />}
      renderLink={(i) => (
        <>
          <Cyl r={0.02} h={0.22} color={P.mid} seg={8} />
          <Sphere r={0.07} scale={[1, 0.3, 0.55]} position={[i % 2 ? 0.055 : -0.055, 0.02, 0]} rotation={[0, 0, i % 2 ? -0.5 : 0.5]} color={P.mid} seg={12} />
          {bloomAt.includes(i) && (
            <>
              <Sphere r={0.045} position={[0, -0.07, 0.05]} color={P.accent} seg={12} />
              <Sphere r={0.018} position={[0, -0.07, 0.092]} color={P.light} seg={8} />
            </>
          )}
        </>
      )}
    />
  );
}

/* ─── Gimmick 2: knock a bucket over and it scatters petal bodies ─── */

function FlowerBucket({ id, position, bucket, bloom }: { id: string; position: V3; bucket: string; bloom: string }) {
  const { live } = useRoom();
  const carrier = useRef<Object3D | null>(null);
  const body = useRef<RapierRigidBody>(null);
  const [spill, setSpill] = useRoomFlag<PetalSpawn[] | null>(`${id}-spill`, null);
  const spilled = useRef(spill !== null);
  spilled.current = spill !== null || spilled.current;
  useTidyReset(() => {
    spilled.current = false;
    setSpill(null);
  });

  useFrame(() => {
    if (!live || spilled.current) return;
    const o = carrier.current;
    if (!o) return;
    _up.set(0, 1, 0).applyQuaternion(o.quaternion);
    if (_up.y > 0.45) return;
    spilled.current = true;
    _mouth.copy(o.position).addScaledVector(_up, 0.42);
    const v = body.current?.linvel() ?? { x: 0, y: 0, z: 0 };
    const stamp = Math.round(performance.now());
    const petals = Array.from({ length: 12 }, (_, i): PetalSpawn => {
      const a = (i / 12) * Math.PI * 2;
      const r = 0.05 + (i % 3) * 0.035;
      return {
        id: `${id}-petal-${stamp}-${i}`,
        origin: [position[0] + Math.cos(a) * 0.09, position[1] + 0.36 + (i % 3) * 0.03, position[2] + Math.sin(a) * 0.09],
        position: [
          MathUtils.clamp(_mouth.x + Math.cos(a) * r, -HALF_W + 0.08, HALF_W - 0.08),
          MathUtils.clamp(_mouth.y + (i % 4) * 0.02, 0.06, 2.8),
          MathUtils.clamp(_mouth.z + Math.sin(a) * r, -HALF_D + 0.08, HALF_D - 0.08),
        ],
        rotation: [Math.random() * 3, Math.random() * 3, Math.random() * 3],
        velocity: [
          _up.x * 1.6 + Math.cos(a) * 0.9 + v.x * 0.5,
          0.8 + Math.random() * 0.8 + v.y * 0.3,
          _up.z * 1.6 + Math.sin(a) * 0.9 + v.z * 0.5,
        ],
        color: i % 3 === 0 ? P.light : bloom,
      };
    });
    setSpill(petals);
  });

  return (
    <>
      <PhysicsProp
        id={id}
        bodyRef={body}
        objectRef={carrier}
        position={position}
        colliders={<CylinderCollider args={[0.16, 0.19]} position={[0, 0.16, 0]} mass={0.5} friction={0.7} />}
        angularDamping={0.3}
      >
        <Lathe points={BUCKET} color={bucket} s={{ doubleSide: true }} />
        <Torus r={0.195} tube={0.018} rotation={[HALF_PI, 0, 0]} position={[0, 0.32, 0]} color={bucket} />
        <Torus r={0.166} tube={0.015} rotation={[HALF_PI, 0, 0]} position={[0, 0.12, 0]} color={P.light} />
        {!spill && (
          <>
            <Sphere r={0.17} scale={[1, 0.55, 1]} position={[0, 0.34, 0]} color={P.mid} seg={16} />
            {BLOOMS.map(([x, y, z], i) => (
              <group key={i} position={[x, y, z]}>
                <Sphere r={0.065} scale={[1, 0.7, 1]} color={bloom} seg={14} />
                <Sphere r={0.028} position={[0, 0.04, 0]} color={P.light} seg={10} />
              </group>
            ))}
          </>
        )}
      </PhysicsProp>
      {spill?.map((petal) => (
        <PhysicsProp
          key={petal.id}
          id={petal.id}
          position={petal.origin}
          initial={{ position: petal.position, rotation: petal.rotation }}
          initialVelocity={petal.velocity}
          colliders={<CuboidCollider args={[0.045, 0.016, 0.034]} mass={0.012} friction={0.9} />}
          linearDamping={1.3}
          angularDamping={0.7}
          ccd
          drag={{ margin: 0.05, throwMultiplier: 0.6 }}
        >
          <Sphere r={0.05} scale={[1, 0.32, 0.72]} color={petal.color} seg={10} />
        </PhysicsProp>
      ))}
    </>
  );
}

/* ─── Props ─── */

function BigPlant() {
  return (
    <PhysicsProp
      id="big-plant"
      position={[-1.8, 0.002, -0.3]}
      colliders={
        <>
          <CylinderCollider args={[0.2, 0.22]} position={[0, 0.2, 0]} mass={2.5} friction={0.8} />
          <BallCollider args={[0.3]} position={[0, 0.85, 0]} mass={0.4} />
        </>
      }
      angularDamping={0.5}
    >
      <Lathe points={POT} color={P.deep} s={{ doubleSide: true }} />
      <Cyl r={0.2} h={0.03} position={[0, 0.37, 0]} color={P.deep} />
      <Cyl r={0.03} h={0.35} position={[0, 0.52, 0]} color={P.deep} seg={8} />
      <Sphere r={0.26} position={[0, 0.72, 0]} color={P.mid} />
      <Sphere r={0.2} position={[0.14, 0.95, 0.05]} color={P.mid} />
      <Sphere r={0.18} position={[-0.12, 0.9, -0.08]} color={P.mid} />
      <Sphere r={0.14} position={[0.02, 1.12, -0.02]} color={P.dominant} />
    </PhysicsProp>
  );
}

function WateringCan() {
  return (
    <PhysicsProp
      id="watering-can"
      position={[0.95, 0.002, 0.55]}
      rotation={[0, 0.6, 0]}
      colliders={<CylinderCollider args={[0.11, 0.14]} position={[0, 0.11, 0]} mass={0.45} friction={0.7} />}
    >
      <Cyl r={0.13} r2={0.14} h={0.22} position={[0, 0.11, 0]} color={P.accent} />
      <Cyl r={0.12} h={0.03} position={[0, 0.235, 0]} color={P.accent} />
      <Sphere r={0.04} position={[0, 0.25, 0]} color={P.light} />
      <Cyl r={0.022} r2={0.032} h={0.3} position={[0.19, 0.18, 0]} rotation={[0, 0, -0.9]} color={P.accent} seg={12} />
      <Cyl r={0.045} r2={0.03} h={0.04} position={[0.31, 0.27, 0]} rotation={[0, 0, -0.9]} color={P.light} seg={12} />
      <Torus r={0.1} tube={0.022} arc={Math.PI} position={[-0.02, 0.235, 0]} color={P.accent} />
    </PhysicsProp>
  );
}

function SeedlingCrate() {
  return (
    <PhysicsProp
      id="seedling-crate"
      position={[1.45, 0.002, -0.5]}
      rotation={[0, -0.25, 0]}
      colliders={
        <>
          <CuboidCollider args={[0.3, 0.11, 0.22]} position={[0, 0.11, 0]} mass={1.0} friction={0.8} />
          <CuboidCollider args={[0.27, 0.06, 0.17]} position={[0, 0.28, 0]} mass={0.3} />
        </>
      }
    >
      <Box size={[0.6, 0.22, 0.44]} position={[0, 0.11, 0]} color={P.deep} />
      <Box size={[0.62, 0.035, 0.03]} position={[0, 0.07, 0.225]} color={P.light} radius={0.012} />
      <Box size={[0.62, 0.035, 0.03]} position={[0, 0.15, 0.225]} color={P.light} radius={0.012} />
      {[-0.18, 0, 0.18].flatMap((x) =>
        [-0.1, 0.1].map((z) => (
          <group key={`${x}${z}`} position={[x, 0.26, z]}>
            <Cyl r={0.06} r2={0.05} h={0.08} color={P.light} seg={14} />
            <Sphere r={0.045} scale={[1, 0.7, 1]} position={[0, 0.07, 0]} color={P.mid} seg={12} />
          </group>
        )),
      )}
    </PhysicsProp>
  );
}

function Stool() {
  return (
    <PhysicsProp
      id="stool"
      position={[1.55, 0.002, 0.95]}
      colliders={
        <>
          <CylinderCollider args={[0.03, 0.22]} position={[0, 0.45, 0]} mass={0.6} friction={0.8} />
          <CylinderCollider args={[0.21, 0.16]} position={[0, 0.21, 0]} mass={0.8} />
        </>
      }
    >
      <Cyl r={0.22} h={0.06} position={[0, 0.45, 0]} color={P.deep} />
      {[0, 1, 2].map((i) => (
        <Cyl key={i} r={0.025} h={0.43} position={[Math.cos(i * 2.094) * 0.14, 0.215, Math.sin(i * 2.094) * 0.14]} color={P.deep} seg={8} />
      ))}
      <Torus r={0.14} tube={0.015} rotation={[HALF_PI, 0, 0]} position={[0, 0.18, 0]} color={P.mid} />
    </PhysicsProp>
  );
}

function SmallPot({ id, position, color }: { id: string; position: V3; color: string }) {
  return (
    <PhysicsProp
      id={id}
      position={position}
      colliders={<CylinderCollider args={[0.07, 0.09]} position={[0, 0.07, 0]} mass={0.3} friction={0.8} />}
    >
      <Lathe points={SMALL_POT} color={color} />
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * Math.PI * 2;
        return <Sphere key={i} r={0.045} scale={[1, 0.5, 0.6]} position={[Math.cos(a) * 0.04, 0.14, Math.sin(a) * 0.04]} rotation={[0, -a, 0.4]} color={P.mid} seg={10} />;
      })}
      <Sphere r={0.03} position={[0, 0.16, 0]} color={P.dominant} seg={10} />
    </PhysicsProp>
  );
}

function CashBox() {
  return (
    <PhysicsProp
      id="cash-box"
      position={[1.4, COUNTER_TOP, -1.85]}
      rotation={[0, -0.2, 0]}
      colliders={<CuboidCollider args={[0.17, 0.09, 0.13]} position={[0, 0.09, 0]} mass={1.2} friction={0.8} />}
    >
      <Box size={[0.34, 0.18, 0.26]} position={[0, 0.09, 0]} color={P.mid} />
      <Box size={[0.28, 0.03, 0.12]} position={[0, 0.19, 0.04]} color={P.light} radius={0.012} />
      <Box size={[0.2, 0.1, 0.03]} position={[0, 0.23, -0.08]} rotation={[-0.3, 0, 0]} color={P.light} radius={0.012} />
      <Sphere r={0.022} position={[0.11, 0.2, 0.09]} color={P.accent} seg={10} />
    </PhysicsProp>
  );
}

function VaseBouquet() {
  return (
    <PhysicsProp
      id="vase"
      position={[0.45, COUNTER_TOP, -1.85]}
      colliders={<CylinderCollider args={[0.13, 0.09]} position={[0, 0.13, 0]} mass={0.5} friction={0.8} />}
    >
      <Lathe points={VASE} color={P.light} s={{ doubleSide: true }} />
      {[-0.35, 0, 0.35].map((tilt, i) => (
        <group key={i} position={[0, 0.2, 0]} rotation={[tilt * 0.5, 0, tilt]}>
          <Cyl r={0.015} h={0.3} position={[0, 0.15, 0]} color={P.mid} seg={6} />
          <Sphere r={0.06} scale={[1, 0.75, 1]} position={[0, 0.31, 0]} color={i === 1 ? P.light : P.accent} seg={14} />
        </group>
      ))}
      <Sphere r={0.07} scale={[1, 0.35, 0.55]} position={[0.07, 0.3, 0.02]} rotation={[0, 0, -0.6]} color={P.mid} seg={10} />
    </PhysicsProp>
  );
}

/* ─── Fixed furniture + decor ─── */

function CounterAndDecor() {
  return (
    <>
      <Box size={[1.8, 0.9, 0.56]} position={[0.9, 0.45, -1.82]} color={P.deep} />
      <Box size={[1.9, 0.06, 0.62]} position={[0.9, 0.93, -1.82]} color={P.light} />
      {[0.3, 0.9, 1.5].map((x) => (
        <Box key={x} size={[0.5, 0.62, 0.03]} position={[x, 0.46, -1.525]} color={P.mid} radius={0.012} />
      ))}

      <Box size={[2.2, 0.3, 0.3]} position={[-0.8, 2.55, -2.03]} color={P.deep} />
      <Box size={[0.05, 0.25, 0.25]} position={[-1.6, 2.28, -2.08]} color={P.deep} radius={0.02} />
      <Box size={[0.05, 0.25, 0.25]} position={[0.0, 2.28, -2.08]} color={P.deep} radius={0.02} />
      {([[-1.75, 0.18], [-1.35, 0.16], [-0.95, 0.2], [-0.55, 0.17], [-0.15, 0.19], [0.2, 0.15]] as const).map(([x, r], i) => (
        <Sphere key={i} r={r} position={[x, 2.72, -2.02]} color={i % 2 ? P.dominant : P.mid} seg={16} />
      ))}
      {[-1.5, -0.75, 0.05].map((x) => (
        <Sphere key={x} r={0.06} position={[x, 2.86, -1.94]} color={P.accent} seg={12} />
      ))}

      <group position={[1.0, 1.95, -2.17]}>
        <Box size={[1.25, 0.95, 0.05]} color={P.light} />
        {([[-0.29, 0.21], [0.29, 0.21], [-0.29, -0.21], [0.29, -0.21]] as const).map(([x, y]) => (
          <Box key={`${x}${y}`} size={[0.54, 0.38, 0.03]} position={[x, y, 0.025]} color={P.dominant} radius={0.012} s={{ emissive: P.light, emissiveIntensity: 0.35 }} />
        ))}
      </group>

      <group position={[-2.17, 2.05, 0.95]} rotation={[0, HALF_PI, 0]}>
        <Box size={[0.8, 0.45, 0.05]} color={P.light} />
        {[0, 1, 2, 3, 4].map((i) => {
          const a = (i / 5) * Math.PI * 2 + HALF_PI;
          return <Sphere key={i} r={0.055} position={[Math.cos(a) * 0.075, Math.sin(a) * 0.075, 0.04]} color={P.accent} seg={12} />;
        })}
        <Sphere r={0.045} position={[0, 0, 0.06]} color={P.dominant} seg={12} />
        <Sphere r={0.08} scale={[1, 0.4, 0.3]} position={[-0.2, -0.09, 0.03]} rotation={[0, 0, 0.5]} color={P.mid} seg={10} />
        <Sphere r={0.08} scale={[1, 0.4, 0.3]} position={[0.2, -0.09, 0.03]} rotation={[0, 0, -0.5]} color={P.mid} seg={10} />
      </group>

      <FixedColliders>
        <CuboidCollider args={[0.95, 0.48, 0.31]} position={[0.9, 0.48, -1.82]} friction={0.8} />
      </FixedColliders>
    </>
  );
}

function FloristContents() {
  return (
    <>
      <RoomShell walls={P.dominant} floor={P.light} trim={P.deep} />
      <CounterAndDecor />
      <Vine id="vine-a" anchor={[-1.55, 2.4, -1.92]} bloomAt={[2, 4]} />
      <Vine id="vine-b" anchor={[-0.85, 2.4, -1.92]} bloomAt={[1, 3]} />
      <Vine id="vine-c" anchor={[-0.15, 2.4, -1.92]} bloomAt={[4]} />
      <FlowerBucket id="bucket-sage" position={[-1.25, 0.002, 0.85]} bucket={P.mid} bloom={P.accent} />
      <FlowerBucket id="bucket-cream" position={[-0.5, 0.002, 1.45]} bucket={P.light} bloom={P.accent} />
      <BigPlant />
      <WateringCan />
      <SeedlingCrate />
      <Stool />
      <SmallPot id="stool-pot" position={[1.55, 0.482, 0.95]} color={P.accent} />
      <SmallPot id="counter-pot" position={[0.95, COUNTER_TOP, -1.9]} color={P.dominant} />
      <CashBox />
      <VaseBouquet />
    </>
  );
}

export const Florist: RoomModule = {
  id: 'florist',
  name: 'Florist',
  caption: 'Tip a bucket and the petals go everywhere.',
  palette: P,
  backdrop: mix(P.light, P.dominant, 0.45),
  ink: 'dark',
  mood: { key: 1, fill: 1.05, rim: 0.9 },
  Contents: FloristContents,
};
