import { CapsuleCollider, CuboidCollider, CylinderCollider } from '@react-three/rapier';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { Color, Object3D, Vector3, type InstancedMesh } from 'three';
import { RoomShell } from '../components/RoomShell';
import { HALF_D, HALF_W, type V3 } from '../config';
import { useAccentLight } from '../three/accentLights';
import { Chain } from '../three/Chain';
import { Box, Cyl, Lathe, METAL, Sphere, Torus, type Profile } from '../three/kit';
import { FixedColliders, PhysicsProp } from '../three/PhysicsProp';
import { useRoomFlag, useTidyReset } from '../three/RoomContext';
import { BUTCHER as P, mix } from './palettes';
import type { RoomModule } from './types';

const HALF_PI = Math.PI / 2;
const COUNTER_TOP = 0.962;
const BLOCK_TOP = 0.752;
const LINK = 0.2;

const SAUSAGE: Profile = [[0, -0.1], [0.03, -0.095], [0.048, -0.075], [0.055, -0.04], [0.055, 0.04], [0.048, 0.075], [0.03, 0.095], [0, 0.1]];
const HAM: Profile = [[0, 0], [0.08, 0], [0.13, 0.06], [0.14, 0.14], [0.11, 0.22], [0.06, 0.27], [0.035, 0.3], [0, 0.3]];

const COLD_LIGHT = new Color(P.dominant).lerp(new Color(P.light), 0.5);

/* ─── Signature gimmick: sausage links — yank one and the chain follows ─── */

function Sausage() {
  return (
    <>
      <Lathe points={SAUSAGE} color={P.accent} seg={16} />
      <Sphere r={0.018} position={[0, 0.1, 0]} color={P.light} seg={8} />
      <Sphere r={0.018} position={[0, -0.1, 0]} color={P.light} seg={8} />
    </>
  );
}

function SausageChain({ id, hook }: { id: string; hook: V3 }) {
  const [unhooked, setUnhooked] = useRoomFlag(`${id}-unhooked`, false);
  const unhookedRef = useRef(unhooked);
  unhookedRef.current = unhooked;
  const hookPoint = useMemo(() => new Vector3(...hook), [hook]);
  useTidyReset(() => setUnhooked(false));

  return (
    <Chain
      id={id}
      anchor={hook}
      count={6}
      segment={LINK}
      attached={!unhooked}
      linearDamping={0.25}
      angularDamping={0.6}
      throwMultiplier={0.8}
      collider={() => <CapsuleCollider args={[0.045, 0.05]} mass={0.1} friction={0.7} />}
      renderLink={() => <Sausage />}
      onLinkDrag={(i, target) => {
        if (unhookedRef.current) return;
        if (target.distanceTo(hookPoint) > (i + 1) * LINK + 0.18) {
          unhookedRef.current = true;
          setUnhooked(true);
        }
      }}
    />
  );
}

/* ─── Props ─── */

function Steak({ id, position, yaw }: { id: string; position: V3; yaw: number }) {
  return (
    <PhysicsProp
      id={id}
      position={position}
      rotation={[0, yaw, 0]}
      colliders={<CuboidCollider args={[0.14, 0.025, 0.11]} mass={0.35} friction={0.9} />}
    >
      <Box size={[0.28, 0.05, 0.2]} color={P.accent} radius={0.03} />
      <Box size={[0.28, 0.05, 0.035]} position={[0, 0, -0.09]} color={P.light} radius={0.015} />
      <Cyl r={0.03} h={0.05} position={[0.07, 0, 0.02]} color={P.light} seg={12} />
    </PhysicsProp>
  );
}

function Ham() {
  return (
    <PhysicsProp
      id="ham"
      position={[-1.75, COUNTER_TOP + 0.13, 0.25]}
      rotation={[0, 0, HALF_PI]}
      colliders={<CylinderCollider args={[0.15, 0.13]} position={[0, 0.15, 0]} mass={1.2} friction={0.9} />}
      angularDamping={0.6}
    >
      <Lathe points={HAM} color={P.accent} seg={20} />
      <Cyl r={0.025} h={0.1} position={[0, 0.34, 0]} color={P.light} seg={10} />
      <Sphere r={0.035} position={[0, 0.4, 0]} color={P.light} seg={12} />
    </PhysicsProp>
  );
}

function Scale() {
  return (
    <PhysicsProp
      id="scale"
      position={[-1.9, COUNTER_TOP, 0.7]}
      rotation={[0, HALF_PI, 0]}
      colliders={<CuboidCollider args={[0.15, 0.1, 0.12]} position={[0, 0.1, 0]} mass={2} friction={0.8} />}
    >
      <Box size={[0.3, 0.06, 0.24]} position={[0, 0.03, 0]} color={P.mid} s={METAL} />
      <Box size={[0.08, 0.2, 0.08]} position={[0, 0.16, -0.06]} color={P.mid} s={METAL} />
      <Cyl r={0.1} h={0.03} rotation={[HALF_PI, 0, 0]} position={[0, 0.3, -0.04]} color={P.light} />
      <Torus r={0.1} tube={0.015} position={[0, 0.3, -0.03]} color={P.mid} s={METAL} />
      <Box size={[0.03, 0.08, 0.03]} position={[0.015, 0.33, -0.015]} rotation={[0, 0, -0.5]} color={P.accent} radius={0.012} />
      <Cyl r={0.14} r2={0.11} h={0.03} position={[0, 0.08, 0.02]} color={P.mid} s={METAL} />
    </PhysicsProp>
  );
}

function Cleaver() {
  return (
    <PhysicsProp
      id="cleaver"
      position={[0.72, BLOCK_TOP + 0.022, 0.52]}
      rotation={[0, 0.5, 0]}
      colliders={<CuboidCollider args={[0.21, 0.02, 0.07]} position={[-0.05, 0, 0]} mass={0.5} friction={0.7} />}
      drag={{ spin: 1.4 }}
    >
      <Box size={[0.26, 0.03, 0.14]} color={P.mid} s={METAL} radius={0.012} />
      <Cyl r={0.022} h={0.16} rotation={[0, 0, HALF_PI]} position={[-0.2, 0, 0.03]} color={P.deep} seg={10} />
      <Cyl r={0.018} h={0.035} position={[0.09, 0, -0.04]} color={P.deep} seg={10} />
    </PhysicsProp>
  );
}

function ButcherBlock() {
  return (
    <PhysicsProp
      id="butcher-block"
      position={[0.8, 0.002, 0.6]}
      rotation={[0, 0.15, 0]}
      colliders={
        <>
          <CuboidCollider args={[0.4, 0.15, 0.3]} position={[0, 0.6, 0]} mass={5} friction={0.9} />
          <CuboidCollider args={[0.36, 0.22, 0.26]} position={[0, 0.22, 0]} mass={3} friction={0.9} />
        </>
      }
      angularDamping={0.5}
      drag={{ throwMultiplier: 0.6 }}
    >
      <Box size={[0.8, 0.3, 0.6]} position={[0, 0.6, 0]} color={P.light} radius={0.05} />
      <Box size={[0.82, 0.04, 0.62]} position={[0, 0.48, 0]} color={P.mid} radius={0.015} s={METAL} />
      {([[-0.33, -0.23], [0.33, -0.23], [-0.33, 0.23], [0.33, 0.23]] as const).map(([x, z], i) => (
        <Box key={i} size={[0.09, 0.45, 0.09]} position={[x, 0.225, z]} color={P.deep} radius={0.03} />
      ))}
    </PhysicsProp>
  );
}

function Package({ id, position, yaw }: { id: string; position: V3; yaw: number }) {
  return (
    <PhysicsProp
      id={id}
      position={position}
      rotation={[0, yaw, 0]}
      colliders={<CuboidCollider args={[0.18, 0.07, 0.13]} mass={0.5} friction={0.8} />}
    >
      <Box size={[0.36, 0.14, 0.26]} color={P.light} radius={0.03} />
      <Box size={[0.37, 0.145, 0.03]} color={P.accent} radius={0.012} />
      <Box size={[0.03, 0.145, 0.27]} color={P.accent} radius={0.012} />
    </PhysicsProp>
  );
}

/* ─── Cold tiles: 240 instances, one draw call ─── */

type Tile = { position: V3; rotation: V3; color: string };

function Tiles() {
  const mesh = useRef<InstancedMesh>(null);
  const tiles = useMemo(() => {
    const out: Tile[] = [];
    for (let c = 0; c < 10; c++) {
      for (let r = 0; r < 7; r++) {
        const color = r === 2 ? P.accent : P.dominant;
        const along = -HALF_W + 0.22 + c * 0.44;
        const y = 0.215 + r * 0.43;
        out.push({ position: [along, y, -HALF_D + 0.016], rotation: [0, 0, 0], color });
        out.push({ position: [-HALF_W + 0.016, y, -HALF_D + 0.22 + c * 0.44], rotation: [0, HALF_PI, 0], color });
      }
      for (let j = 0; j < 10; j++) {
        out.push({
          position: [-HALF_W + 0.22 + c * 0.44, -0.012, -HALF_D + 0.22 + j * 0.44],
          rotation: [-HALF_PI, 0, 0],
          color: (c + j) % 2 ? P.dominant : P.mid,
        });
      }
    }
    return out;
  }, []);

  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const dummy = new Object3D();
    const color = new Color();
    tiles.forEach((t, i) => {
      dummy.position.set(...t.position);
      dummy.rotation.set(...t.rotation);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      m.setColorAt(i, color.set(t.color));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  }, [tiles]);

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, tiles.length]} receiveShadow>
      <boxGeometry args={[0.4, 0.4, 0.03]} />
      <meshStandardMaterial roughness={0.6} />
    </instancedMesh>
  );
}

/* ─── Fixed furniture + decor ─── */

function Furniture() {
  useAccentLight(0, (light, t) => {
    light.position.set(-1.3, 2.6, 0);
    light.intensity = 2.2 + (Math.sin(t * 43) > 0.97 ? -0.6 : 0);
    light.distance = 4.2;
    light.decay = 2;
    light.color.copy(COLD_LIGHT);
  });

  return (
    <>
      <Tiles />
      <Cyl r={0.025} h={2.8} rotation={[0, 0, HALF_PI]} position={[-0.5, 2.55, -1.95]} color={P.mid} s={METAL} seg={10} />
      {[-1.8, 0.8].map((x) => (
        <Box key={x} size={[0.04, 0.04, 0.25]} position={[x, 2.55, -2.06]} color={P.mid} s={METAL} radius={0.015} />
      ))}
      {[-1.5, -0.9, -0.3, 0.3].map((x) => (
        <Torus key={x} r={0.04} tube={0.015} arc={Math.PI * 1.3} rotation={[0, 0, -0.4 * Math.PI]} position={[x, 2.5, -1.95]} color={P.mid} s={METAL} seg={16} />
      ))}

      <Box size={[0.6, 0.9, 2.0]} position={[-1.9, 0.45, 0]} color={P.light} />
      <Box size={[0.03, 0.08, 2.0]} position={[-1.59, 0.7, 0]} color={P.accent} radius={0.012} />
      <Box size={[0.66, 0.06, 2.06]} position={[-1.9, 0.93, 0]} color={P.mid} s={METAL} />

      <group position={[-2.17, 1.72, 0.2]}>
        <Box size={[0.04, 0.05, 0.9]} color={P.deep} radius={0.015} />
        {[-0.25, 0, 0.25].map((z) => (
          <group key={z} position={[0.03, 0, z]}>
            <Box size={[0.035, 0.12, 0.035]} position={[0, 0.08, 0]} color={P.deep} radius={0.014} />
            <Box size={[0.03, 0.26, 0.07]} position={[0, -0.14, 0]} color={P.mid} s={METAL} radius={0.012} />
          </group>
        ))}
      </group>

      <group position={[1.35, 2.0, -2.15]}>
        <Box size={[0.95, 0.55, 0.05]} color={P.deep} />
        <Sphere r={0.16} scale={[1.4, 1, 0.3]} position={[-0.05, -0.02, 0.05]} color={P.accent} />
        <Sphere r={0.1} scale={[1, 1, 0.3]} position={[0.2, 0.03, 0.05]} color={P.accent} />
        <Cyl r={0.045} h={0.03} rotation={[HALF_PI, 0, 0]} position={[0.29, 0.01, 0.07]} color={P.light} seg={14} />
        <Box size={[0.05, 0.06, 0.03]} position={[0.17, 0.13, 0.06]} rotation={[0, 0, 0.4]} color={P.accent} radius={0.012} />
        <Box size={[0.05, 0.06, 0.03]} position={[0.24, 0.13, 0.06]} rotation={[0, 0, -0.3]} color={P.accent} radius={0.012} />
        {[-0.2, -0.08, 0.04, 0.14].map((x) => (
          <Box key={x} size={[0.04, 0.08, 0.03]} position={[x, -0.17, 0.05]} color={P.accent} radius={0.012} />
        ))}
        <Torus r={0.03} tube={0.015} position={[-0.29, 0.03, 0.06]} color={P.accent} seg={12} />
      </group>

      <FixedColliders>
        <CuboidCollider args={[0.33, 0.48, 1.03]} position={[-1.9, 0.48, 0]} friction={0.8} />
      </FixedColliders>
    </>
  );
}

function ButcherContents() {
  return (
    <>
      <RoomShell walls={P.mid} floor={P.deep} trim={P.accent} />
      <Furniture />
      <SausageChain id="links-a" hook={[-1.5, 2.45, -1.95]} />
      <SausageChain id="links-b" hook={[-0.9, 2.45, -1.95]} />
      <SausageChain id="links-c" hook={[-0.3, 2.45, -1.95]} />
      <Steak id="steak-a" position={[-1.9, COUNTER_TOP + 0.026, -0.6]} yaw={0.3} />
      <Steak id="steak-b" position={[-1.85, COUNTER_TOP + 0.026, -0.22]} yaw={-0.4} />
      <Ham />
      <Scale />
      <ButcherBlock />
      <Cleaver />
      <Steak id="steak-c" position={[0.98, BLOCK_TOP + 0.027, 0.66]} yaw={1.1} />
      <Package id="parcel-a" position={[1.55, 0.072, -1.25]} yaw={0} />
      <Package id="parcel-b" position={[1.58, 0.214, -1.22]} yaw={0.3} />
      <Package id="parcel-c" position={[1.55, 0.072, -0.88]} yaw={-0.2} />
    </>
  );
}

export const Butcher: RoomModule = {
  id: 'butcher',
  name: 'Butcher Shop',
  caption: 'Grab a sausage and yank. The whole string comes along.',
  palette: P,
  backdrop: mix(P.light, P.mid, 0.4),
  ink: 'dark',
  mood: { key: 0.9, fill: 1.1, rim: 1.0 },
  Contents: ButcherContents,
};
