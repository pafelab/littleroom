import { useFrame } from '@react-three/fiber';
import { BallCollider, CuboidCollider, CylinderCollider, type RapierRigidBody } from '@react-three/rapier';
import { createRef, useMemo, useRef, type MutableRefObject } from 'react';
import { Color, Vector3, type Group, type Object3D } from 'three';
import { RoomShell } from '../components/RoomShell';
import type { V3 } from '../config';
import { useAccentLight } from '../three/accentLights';
import { FixedAnchor, RopeLine, RopeLink } from '../three/joints';
import { Box, Cyl, Lathe, METAL, Sphere, Torus, type Profile } from '../three/kit';
import { FixedColliders, PhysicsProp } from '../three/PhysicsProp';
import { useRoom } from '../three/RoomContext';
import { OFFICE as P, mix } from './palettes';
import type { RoomModule } from './types';

const HALF_PI = Math.PI / 2;
const DESK_TOP = 0.902;
const CABINET_TOP = 1.102;

const MUG: Profile = [[0, 0], [0.05, 0], [0.055, 0.01], [0.062, 0.11], [0.054, 0.11], [0.047, 0.02], [0, 0.02]];
const BIN: Profile = [[0, 0], [0.14, 0], [0.17, 0.36], [0.16, 0.36], [0.13, 0.02], [0, 0.02]];
const GLOBE_BASE: Profile = [[0, 0], [0.1, 0], [0.1, 0.02], [0.03, 0.05], [0.02, 0.1], [0, 0.1]];

const _bulb = new Vector3();
const LAMP_LIGHT = new Color(P.light).lerp(new Color(P.accent), 0.25);

/* ─── Gimmick 1: a Newton's cradle hung from real rope joints ─── */

const CRADLE_BASE: V3 = [0.8, 0.9, -0.6];
const BALL_R = 0.05;
const SPACING = BALL_R * 2 + 0.024;
const BAR_Y = CRADLE_BASE[1] + 0.48;
const BAR_Z = 0.12;
const HANG = 0.3;
const ROPE_LENGTH = Math.hypot(HANG, BAR_Z);

function NewtonsCradle() {
  const { live } = useRoom();
  const frame = useRef<RapierRigidBody>(null);
  const balls = useMemo(() => Array.from({ length: 5 }, () => createRef<RapierRigidBody>()), []);
  const carriers = useMemo<MutableRefObject<Object3D | null>[]>(() => Array.from({ length: 5 }, () => ({ current: null })), []);
  const xs = useMemo(() => [-2, -1, 0, 1, 2].map((k) => CRADLE_BASE[0] + k * SPACING), []);
  const [bx, by, bz] = CRADLE_BASE;

  return (
    <>
      <Box size={[0.9, 0.04, 0.34]} position={[bx, by + 0.02, bz]} color={P.deep} />
      {([[-0.4, -BAR_Z], [0.4, -BAR_Z], [-0.4, BAR_Z], [0.4, BAR_Z]] as const).map(([x, z]) => (
        <Cyl key={`${x}${z}`} r={0.015} h={0.46} position={[bx + x, by + 0.25, bz + z]} color={P.light} s={METAL} seg={8} />
      ))}
      {[-BAR_Z, BAR_Z].map((z) => (
        <Cyl key={z} r={0.015} h={0.83} rotation={[0, 0, HALF_PI]} position={[bx, BAR_Y, bz + z]} color={P.light} s={METAL} seg={8} />
      ))}
      <FixedColliders>
        <CuboidCollider args={[0.45, 0.02, 0.17]} position={[bx, by + 0.02, bz]} />
      </FixedColliders>

      {live && <FixedAnchor bodyRef={frame} />}
      {xs.map((x, i) => (
        <PhysicsProp
          key={i}
          id={`cradle-${i}`}
          bodyRef={balls[i]}
          objectRef={carriers[i]}
          position={[x, BAR_Y - HANG, bz]}
          colliders={<BallCollider args={[BALL_R]} mass={0.3} restitution={0.97} friction={0} />}
          linearDamping={0.01}
          angularDamping={0.2}
          drag={{ tether: { anchor: [x, BAR_Y, bz], radius: HANG }, throwMultiplier: 0.1, spin: 0, margin: 0.06 }}
        >
          <Sphere r={BALL_R} color={P.light} s={{ metalness: 0.75, roughness: 0.6 }} />
        </PhysicsProp>
      ))}
      {live &&
        xs.flatMap((x, i) =>
          [-BAR_Z, BAR_Z].map((z) => (
            <RopeLink key={`${i}${z}`} a={frame} b={balls[i]} anchorA={[x, BAR_Y, bz + z]} anchorB={[0, 0, 0]} length={ROPE_LENGTH} />
          )),
        )}
      {xs.flatMap((x, i) =>
        [-BAR_Z, BAR_Z].map((z) => <RopeLine key={`${i}${z}`} from={[x, BAR_Y, bz + z]} target={carriers[i]} radius={0.015} color={P.deep} />),
      )}
    </>
  );
}

/* ─── Gimmick 2: paper that flutters — drag, lift and a restless torque ─── */

function Paper({ id, position, yaw, header = false }: { id: string; position: V3; yaw: number; header?: boolean }) {
  const { live } = useRoom();
  const body = useRef<RapierRigidBody>(null);
  const seed = useMemo(() => position[1] * 97 + yaw * 13, [position, yaw]);

  useFrame(({ clock }) => {
    if (!live) return;
    const rb = body.current;
    if (!rb || rb.isSleeping() || !rb.isDynamic()) return;
    const v = rb.linvel();
    const speed = Math.hypot(v.x, v.y, v.z);
    if (speed < 0.25) return;
    const t = clock.elapsedTime + seed;
    const k = Math.min(speed, 3) * 0.00005;
    rb.applyTorqueImpulse({ x: Math.sin(t * 7.3) * k, y: Math.sin(t * 3.1) * k * 0.5, z: Math.cos(t * 6.1) * k }, true);
    rb.applyImpulse({ x: Math.sin(t * 2.3) * k * 3, y: Math.max(0, -v.y) * 0.0005, z: Math.cos(t * 1.9) * k * 3 }, true);
  });

  return (
    <PhysicsProp
      id={id}
      bodyRef={body}
      position={position}
      rotation={[0, yaw, 0]}
      colliders={<CuboidCollider args={[0.17, 0.015, 0.22]} mass={0.02} friction={0.6} />}
      linearDamping={1.8}
      angularDamping={1.4}
      gravityScale={0.5}
      ccd
      drag={{ throwMultiplier: 0.9, spin: 1.6, margin: 0.06 }}
    >
      <Box size={[0.34, 0.03, 0.44]} color={P.light} radius={0.012} />
      {header && <Box size={[0.22, 0.03, 0.05]} position={[-0.03, 0.008, -0.15]} color={P.accent} radius={0.012} />}
    </PhysicsProp>
  );
}

/* ─── Props ─── */

function DeskLamp() {
  const carrier = useRef<Object3D | null>(null);
  useAccentLight(0, (light) => {
    const o = carrier.current;
    if (!o) return;
    _bulb.set(0.38, 0.3, 0).applyQuaternion(o.quaternion).add(o.position);
    light.position.copy(_bulb);
    light.intensity = 2.4;
    light.distance = 2.6;
    light.decay = 2;
    light.color.copy(LAMP_LIGHT);
  });
  return (
    <PhysicsProp
      id="desk-lamp"
      position={[-0.5, DESK_TOP, -0.88]}
      rotation={[0, -0.9, 0]}
      objectRef={carrier}
      colliders={
        <>
          <CylinderCollider args={[0.02, 0.11]} position={[0, 0.02, 0]} mass={0.6} friction={0.8} />
          <BallCollider args={[0.08]} position={[0.38, 0.38, 0]} mass={0.1} />
        </>
      }
    >
      <Cyl r={0.1} r2={0.11} h={0.035} position={[0, 0.0175, 0]} color={P.deep} />
      <Box size={[0.035, 0.34, 0.035]} position={[0.04, 0.2, 0]} rotation={[0, 0, -0.25]} color={P.deep} radius={0.014} />
      <Sphere r={0.03} position={[0.085, 0.365, 0]} color={P.accent} seg={12} />
      <Box size={[0.3, 0.035, 0.035]} position={[0.22, 0.4, 0]} rotation={[0, 0, 0.25]} color={P.deep} radius={0.014} />
      <Cyl r={0.035} r2={0.1} h={0.12} open position={[0.38, 0.38, 0]} color={P.accent} s={{ doubleSide: true }} seg={20} />
      <Sphere r={0.04} position={[0.38, 0.33, 0]} color={P.light} s={{ emissive: P.light, emissiveIntensity: 1.5 }} seg={12} />
    </PhysicsProp>
  );
}

function Monitor() {
  return (
    <PhysicsProp
      id="monitor"
      position={[0.05, DESK_TOP, -0.9]}
      colliders={
        <>
          <CuboidCollider args={[0.13, 0.015, 0.09]} position={[0, 0.015, 0]} mass={1.0} friction={0.8} />
          <CuboidCollider args={[0.025, 0.14, 0.025]} position={[0, 0.16, -0.03]} mass={0.1} />
          <CuboidCollider args={[0.36, 0.22, 0.03]} position={[0, 0.47, 0]} mass={0.8} />
        </>
      }
    >
      <Box size={[0.26, 0.03, 0.18]} position={[0, 0.015, 0]} color={P.deep} radius={0.012} />
      <Box size={[0.05, 0.28, 0.05]} position={[0, 0.16, -0.03]} color={P.deep} radius={0.02} />
      <Box size={[0.72, 0.44, 0.05]} position={[0, 0.47, 0]} color={P.deep} />
      <Box size={[0.66, 0.38, 0.03]} position={[0, 0.47, 0.02]} color={P.mid} radius={0.012} s={{ emissive: P.dominant, emissiveIntensity: 0.35 }} />
      {[-0.18, -0.08, 0.02].map((x, i) => (
        <Box key={x} size={[0.06, 0.08 + i * 0.07, 0.03]} position={[x, 0.36 + (0.08 + i * 0.07) / 2, 0.035]} color={P.light} radius={0.012} />
      ))}
      <Box size={[0.2, 0.035, 0.03]} position={[0.18, 0.52, 0.035]} rotation={[0, 0, 0.5]} color={P.accent} radius={0.012} s={{ emissive: P.accent, emissiveIntensity: 0.4 }} />
    </PhysicsProp>
  );
}

function Mug() {
  return (
    <PhysicsProp
      id="mug"
      position={[0.25, DESK_TOP, -0.3]}
      rotation={[0, 2.4, 0]}
      colliders={<CylinderCollider args={[0.055, 0.065]} position={[0, 0.055, 0]} mass={0.25} friction={0.7} />}
    >
      <Lathe points={MUG} color={P.accent} s={{ doubleSide: true }} />
      <Cyl r={0.052} h={0.03} position={[0, 0.085, 0]} color={P.deep} seg={16} />
      <Torus r={0.035} tube={0.015} position={[0.07, 0.06, 0]} color={P.accent} seg={14} />
    </PhysicsProp>
  );
}

function Stapler() {
  return (
    <PhysicsProp
      id="stapler"
      position={[-0.05, DESK_TOP, -0.35]}
      rotation={[0, 0.4, 0]}
      colliders={<CuboidCollider args={[0.12, 0.04, 0.035]} position={[0, 0.04, 0]} mass={0.3} friction={0.7} />}
    >
      <Box size={[0.24, 0.03, 0.07]} position={[0, 0.015, 0]} color={P.deep} radius={0.012} />
      <Box size={[0.22, 0.05, 0.06]} position={[0.005, 0.055, 0]} rotation={[0, 0, -0.08]} color={P.accent} radius={0.02} />
      <Cyl r={0.02} h={0.07} rotation={[HALF_PI, 0, 0]} position={[-0.1, 0.04, 0]} color={P.mid} seg={10} />
    </PhysicsProp>
  );
}

function Globe() {
  return (
    <PhysicsProp
      id="globe"
      position={[-1.85, CABINET_TOP, -1.75]}
      colliders={<CylinderCollider args={[0.14, 0.14]} position={[0, 0.14, 0]} mass={0.6} friction={0.8} />}
    >
      <Lathe points={GLOBE_BASE} color={P.deep} seg={20} />
      <group position={[0, 0.24, 0]} rotation={[0, 0, 0.41]}>
        <Sphere r={0.13} color={P.dominant} seg={24} />
        <Sphere r={0.07} scale={[1, 0.6, 0.35]} position={[0.03, 0.05, 0.1]} color={P.mid} seg={12} />
        <Sphere r={0.06} scale={[0.8, 1, 0.35]} position={[-0.08, -0.03, 0.08]} rotation={[0, -0.7, 0]} color={P.mid} seg={12} />
        <Torus r={0.15} tube={0.015} color={P.light} s={METAL} />
      </group>
    </PhysicsProp>
  );
}

function Binder({ id, x, color }: { id: string; x: number; color: string }) {
  return (
    <PhysicsProp
      id={id}
      position={[x, CABINET_TOP + 0.15, -1.45]}
      colliders={<CuboidCollider args={[0.04, 0.15, 0.13]} mass={0.4} friction={0.8} />}
    >
      <Box size={[0.08, 0.3, 0.26]} color={color} radius={0.02} />
      <Box size={[0.03, 0.08, 0.14]} position={[0.03, 0.06, 0]} color={P.light} radius={0.012} />
    </PhysicsProp>
  );
}

function OfficeChair() {
  return (
    <PhysicsProp
      id="office-chair"
      position={[0.3, 0.002, -1.55]}
      colliders={
        <>
          <CuboidCollider args={[0.26, 0.045, 0.25]} position={[0, 0.5, 0]} mass={1.2} />
          <CuboidCollider args={[0.25, 0.31, 0.035]} position={[0, 0.9, -0.22]} mass={0.8} />
          <CylinderCollider args={[0.22, 0.3]} position={[0, 0.22, 0]} mass={1.8} friction={0.5} />
        </>
      }
      angularDamping={0.5}
    >
      <Box size={[0.52, 0.09, 0.5]} position={[0, 0.5, 0]} color={P.deep} />
      <Box size={[0.5, 0.62, 0.07]} position={[0, 0.9, -0.22]} color={P.mid} />
      <Box size={[0.4, 0.035, 0.03]} position={[0, 0.76, -0.18]} color={P.accent} radius={0.012} />
      <Cyl r={0.035} h={0.36} position={[0, 0.28, 0]} color={P.light} s={METAL} seg={12} />
      {Array.from({ length: 5 }, (_, i) => {
        const a = (i / 5) * Math.PI * 2;
        return (
          <group key={i} rotation={[0, -a, 0]}>
            <Box size={[0.3, 0.04, 0.05]} position={[0.15, 0.08, 0]} color={P.deep} radius={0.018} />
            <Sphere r={0.035} position={[0.28, 0.035, 0]} color={P.deep} seg={10} />
          </group>
        );
      })}
    </PhysicsProp>
  );
}

function TrashBin() {
  return (
    <PhysicsProp
      id="bin"
      position={[1.6, 0.002, 0.35]}
      colliders={<CylinderCollider args={[0.18, 0.16]} position={[0, 0.18, 0]} mass={0.5} friction={0.7} />}
    >
      <Lathe points={BIN} color={P.mid} s={{ doubleSide: true }} />
      <Torus r={0.165} tube={0.015} rotation={[HALF_PI, 0, 0]} position={[0, 0.36, 0]} color={P.deep} />
    </PhysicsProp>
  );
}

function PaperBall({ id, position }: { id: string; position: V3 }) {
  return (
    <PhysicsProp
      id={id}
      position={position}
      colliders={<BallCollider args={[0.055]} mass={0.015} friction={0.8} />}
      linearDamping={0.5}
      angularDamping={0.6}
    >
      <Sphere r={0.055} scale={[1, 0.88, 0.95]} color={P.light} seg={10} />
      <Sphere r={0.04} position={[0.025, 0.02, 0.01]} color={P.light} seg={8} />
    </PhysicsProp>
  );
}

/* ─── Fixed furniture + decor ─── */

function WallClock() {
  const hour = useRef<Group>(null);
  const minute = useRef<Group>(null);
  useFrame(() => {
    const d = new Date();
    const h = (d.getHours() % 12) + d.getMinutes() / 60;
    const m = d.getMinutes() + d.getSeconds() / 60;
    if (hour.current) hour.current.rotation.z = -(h / 12) * Math.PI * 2;
    if (minute.current) minute.current.rotation.z = -(m / 60) * Math.PI * 2;
  });
  return (
    <group position={[-2.16, 2.25, 0.35]} rotation={[0, HALF_PI, 0]}>
      <Cyl r={0.25} h={0.04} rotation={[HALF_PI, 0, 0]} color={P.light} seg={32} />
      <Torus r={0.25} tube={0.03} color={P.deep} seg={40} />
      <group ref={hour} position={[0, 0, 0.03]}>
        <Box size={[0.035, 0.13, 0.03]} position={[0, 0.06, 0]} color={P.deep} radius={0.012} />
      </group>
      <group ref={minute} position={[0, 0, 0.045]}>
        <Box size={[0.03, 0.19, 0.03]} position={[0, 0.09, 0]} color={P.deep} radius={0.012} />
      </group>
      <Sphere r={0.022} position={[0, 0, 0.06]} color={P.accent} seg={10} />
    </group>
  );
}

function Furniture() {
  return (
    <>
      <Box size={[2.0, 0.08, 0.95]} position={[0.3, 0.86, -0.6]} color={P.deep} />
      {[-0.4, 1.0].map((x) => (
        <group key={x}>
          <Box size={[0.5, 0.82, 0.85]} position={[x, 0.41, -0.6]} color={P.mid} />
          {[0.64, 0.4, 0.16].map((y) => (
            <group key={y}>
              <Box size={[0.44, 0.2, 0.03]} position={[x, y, -0.165]} color={P.dominant} radius={0.012} />
              <Box size={[0.14, 0.03, 0.03]} position={[x, y + 0.04, -0.14]} color={P.accent} radius={0.012} />
            </group>
          ))}
        </group>
      ))}
      <Box size={[0.9, 0.5, 0.04]} position={[0.3, 0.55, -1.0]} color={P.mid} radius={0.015} />

      <Box size={[0.6, 1.1, 0.6]} position={[-1.9, 0.55, -1.6]} color={P.mid} />
      {[0.88, 0.55, 0.22].map((y) => (
        <group key={y}>
          <Box size={[0.03, 0.28, 0.5]} position={[-1.585, y, -1.6]} color={P.dominant} radius={0.012} />
          <Box size={[0.03, 0.03, 0.14]} position={[-1.56, y + 0.06, -1.6]} color={P.accent} radius={0.012} />
        </group>
      ))}

      <group position={[0.3, 1.95, -2.17]}>
        <Box size={[1.4, 1.0, 0.05]} color={P.light} />
        <Box size={[1.3, 0.9, 0.03]} position={[0, 0, 0.01]} color={P.light} s={{ emissive: P.light, emissiveIntensity: 0.45 }} />
        {Array.from({ length: 8 }, (_, i) => (
          <Box key={i} size={[1.3, 0.035, 0.08]} position={[0, 0.39 - i * 0.11, 0.05]} rotation={[0.45, 0, 0]} color={P.dominant} radius={0.012} />
        ))}
      </group>

      <group position={[-2.17, 1.7, 1.2]} rotation={[0, HALF_PI, 0]}>
        <Box size={[0.6, 0.8, 0.04]} color={P.deep} />
        <Box size={[0.5, 0.7, 0.03]} position={[0, 0, 0.015]} color={P.light} radius={0.012} />
        <Sphere r={0.13} scale={[1, 1, 0.15]} position={[-0.06, 0.12, 0.03]} color={P.accent} />
        <Box size={[0.3, 0.08, 0.03]} position={[0.06, -0.15, 0.03]} color={P.mid} radius={0.012} />
      </group>
      <WallClock />

      <FixedColliders>
        <CuboidCollider args={[1.0, 0.04, 0.475]} position={[0.3, 0.86, -0.6]} friction={0.7} />
        <CuboidCollider args={[0.25, 0.41, 0.425]} position={[-0.4, 0.41, -0.6]} />
        <CuboidCollider args={[0.25, 0.41, 0.425]} position={[1.0, 0.41, -0.6]} />
        <CuboidCollider args={[0.3, 0.55, 0.3]} position={[-1.9, 0.55, -1.6]} friction={0.8} />
      </FixedColliders>
    </>
  );
}

const PAPER_YAWS = [0.05, -0.08, 0.12, -0.03, 0.09, -0.11, 0.02];

function OfficeContents() {
  return (
    <>
      <RoomShell walls={P.dominant} floor={P.mid} trim={P.deep} />
      <Furniture />
      <NewtonsCradle />
      {PAPER_YAWS.map((yaw, i) => (
        <Paper key={i} id={`paper-${i}`} position={[-0.35, DESK_TOP + 0.016 + i * 0.031, -0.4]} yaw={yaw} header={i === PAPER_YAWS.length - 1 || i === 2} />
      ))}
      <DeskLamp />
      <Monitor />
      <Mug />
      <Stapler />
      <Globe />
      <Binder id="binder-a" x={-1.98} color={P.accent} />
      <Binder id="binder-b" x={-1.89} color={P.dominant} />
      <Binder id="binder-c" x={-1.8} color={P.deep} />
      <OfficeChair />
      <TrashBin />
      <PaperBall id="ball-a" position={[1.3, 0.06, 0.58]} />
      <PaperBall id="ball-b" position={[1.48, 0.06, 0.72]} />
      <PaperBall id="ball-c" position={[1.25, 0.06, 0.3]} />
    </>
  );
}

export const Office: RoomModule = {
  id: 'office',
  name: 'Executive Office',
  caption: 'Pull back one ball of the cradle. Then fling the paperwork.',
  palette: P,
  backdrop: mix(P.light, P.dominant, 0.45),
  ink: 'dark',
  mood: { key: 0.95, fill: 1.0, rim: 1.0 },
  Contents: OfficeContents,
};
