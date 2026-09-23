import { RoundedBox } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { BallCollider, CuboidCollider, CylinderCollider } from '@react-three/rapier';
import { useMemo, useRef } from 'react';
import { Color, MathUtils, MeshStandardMaterial, Vector3, type Mesh, type Object3D } from 'three';
import { RoomShell } from '../components/RoomShell';
import type { V3 } from '../config';
import { useStore } from '../store';
import { useAccentLight } from '../three/accentLights';
import { Box, Cyl, GLASS, Lathe, METAL, Sphere, Torus, type Profile } from '../three/kit';
import { FixedColliders, PhysicsProp } from '../three/PhysicsProp';
import { FORTUNE as P, mix } from './palettes';
import type { RoomModule } from './types';

const TABLE_TOP = 0.86;
const SHELF_TOP = 1.5;
const HALF_PI = Math.PI / 2;

const STAND: Profile = [[0, 0], [0.15, 0], [0.155, 0.02], [0.12, 0.045], [0.085, 0.07], [0.1, 0.1], [0, 0.1]];
const CUP: Profile = [[0, 0], [0.05, 0], [0.058, 0.012], [0.085, 0.07], [0.095, 0.11], [0.083, 0.11], [0.074, 0.07], [0.045, 0.025], [0, 0.025]];
const FLASK: Profile = [[0, 0], [0.07, 0], [0.09, 0.035], [0.095, 0.085], [0.08, 0.135], [0.034, 0.17], [0.03, 0.22], [0, 0.22]];
const VIAL: Profile = [[0, 0], [0.055, 0], [0.06, 0.02], [0.06, 0.19], [0.03, 0.23], [0.028, 0.27], [0, 0.27]];
const JAR: Profile = [[0, 0], [0.08, 0], [0.086, 0.02], [0.086, 0.1], [0.06, 0.125], [0.032, 0.13], [0.032, 0.17], [0, 0.17]];
const HOURGLASS: Profile = [[0, 0], [0.042, 0.005], [0.048, 0.05], [0.014, 0.11], [0.048, 0.17], [0.042, 0.215], [0, 0.22]];
const BURNER: Profile = [[0, 0.02], [0.07, 0.02], [0.1, 0.04], [0.12, 0.075], [0.115, 0.095], [0, 0.095]];

const FORTUNES = [
  'A small door will open. Probably a cupboard.',
  'Someone, somewhere, is thinking about your soup.',
  'Your lost sock is safe. It has simply moved on.',
  'The next cup of tea will be exactly right.',
  'A cat will judge you — favourably.',
  'Great tidiness lies in your future. Press the button.',
  'Beware of wet paint on a Tuesday.',
  'You will find a coin in an old coat.',
];

const _up = new Vector3();
const _flame = new Vector3();
const GOLD = new Color(P.accent);
const WHITE_GOLD = new Color(P.light);

/* ─────────────── Signature gimmick: the crystal ball ─────────────── */

function CrystalBall() {
  const carrier = useRef<Object3D | null>(null);
  const shell = useRef<Mesh>(null);
  const core = useRef<Mesh>(null);
  const swirl = useRef<Mesh>(null);
  const holding = useRef(false);
  const glow = useRef(0.08);
  const told = useRef(false);

  useFrame((state, dt) => {
    // Glow charges while held, decays slowly once released.
    const g0 = glow.current;
    glow.current = holding.current
      ? g0 + (1 - g0) * (1 - Math.exp(-dt / 1.8))
      : g0 + (0.08 - g0) * (1 - Math.exp(-dt / 2.6));
    const g = glow.current;
    const t = state.clock.elapsedTime;

    if (core.current) {
      (core.current.material as MeshStandardMaterial).emissiveIntensity = 0.7 + g * 5.5 + Math.sin(t * 3.1) * 0.12;
      core.current.scale.setScalar(1 + g * 0.2 + Math.sin(t * 2.3) * 0.025);
    }
    if (swirl.current) {
      swirl.current.rotation.y += dt * (0.6 + g * 5);
      swirl.current.rotation.x = 0.6 + Math.sin(t * 0.7) * 0.3;
      (swirl.current.material as MeshStandardMaterial).emissiveIntensity = 0.3 + g * 2.5;
    }
    if (shell.current) (shell.current.material as MeshStandardMaterial).emissiveIntensity = 0.04 + g * 0.4;

    if (holding.current && g > 0.9 && !told.current) {
      told.current = true;
      useStore.getState().showToast(FORTUNES[Math.floor(Math.random() * FORTUNES.length)]);
    }
    if (g < 0.5) told.current = false;
  });

  // Pooled accent light rides with the ball, so it throws moving light on the walls.
  useAccentLight(0, (light) => {
    const o = carrier.current;
    if (!o) return;
    const g = glow.current;
    light.position.copy(o.position);
    light.intensity = 1.6 + g * 9;
    light.distance = 2.6 + g * 3;
    light.decay = 2;
    light.color.copy(GOLD).lerp(WHITE_GOLD, MathUtils.smoothstep(g, 0.45, 1));
  });

  return (
    <PhysicsProp
      id="crystal-ball"
      position={[0.2, TABLE_TOP + 0.1 + 0.222, -0.28]}
      objectRef={carrier}
      colliders={<BallCollider args={[0.22]} mass={3.2} friction={0.6} restitution={0.12} />}
      angularDamping={0.45}
      linearDamping={0.05}
      drag={{
        throwMultiplier: 0.8,
        spin: 0.5,
        onGrab: () => {
          holding.current = true;
        },
        onRelease: () => {
          holding.current = false;
        },
      }}
    >
      <mesh ref={shell}>
        <sphereGeometry args={[0.22, 32, 24]} />
        <meshStandardMaterial
          color={P.mid}
          emissive={P.mid}
          emissiveIntensity={0.04}
          roughness={0.6}
          transparent
          opacity={0.45}
          depthWrite={false}
          userData={{ glow: true }}
        />
      </mesh>
      <mesh ref={core}>
        <sphereGeometry args={[0.1, 24, 18]} />
        <meshStandardMaterial color={P.accent} emissive={P.accent} emissiveIntensity={0.8} roughness={0.7} userData={{ glow: true }} />
      </mesh>
      <mesh ref={swirl}>
        <torusGeometry args={[0.145, 0.018, 8, 40, Math.PI * 1.6]} />
        <meshStandardMaterial color={P.light} emissive={P.light} emissiveIntensity={0.3} roughness={0.7} userData={{ glow: true }} />
      </mesh>
    </PhysicsProp>
  );
}

function CrystalStand() {
  return (
    <PhysicsProp
      id="crystal-stand"
      position={[0.2, TABLE_TOP + 0.002, -0.28]}
      colliders={<CylinderCollider args={[0.05, 0.14]} position={[0, 0.05, 0]} mass={0.8} friction={0.9} />}
    >
      <Lathe points={STAND} color={P.accent} s={METAL} />
      <Torus r={0.105} tube={0.022} rotation={[HALF_PI, 0, 0]} position={[0, 0.1, 0]} color={P.accent} s={METAL} />
      {[0, 1, 2].map((i) => (
        <Sphere key={i} r={0.022} position={[Math.cos(i * 2.094) * 0.13, 0.03, Math.sin(i * 2.094) * 0.13]} color={P.dominant} />
      ))}
    </PhysicsProp>
  );
}

/* ─────────────── Candles: flicker, carry light, snuff out when tipped ─────────────── */

function Candle({ id, position, height, lightSlot = -1 }: { id: string; position: V3; height: number; lightSlot?: number }) {
  const carrier = useRef<Object3D | null>(null);
  const flame = useRef<Mesh>(null);
  const lit = useRef(1);
  const flicker = useRef(1);
  const seed = useMemo(() => id.length * 1.7 + position[0] * 13, [id, position]);
  const tip = height + 0.03;

  useFrame((state, dt) => {
    const o = carrier.current;
    const f = flame.current;
    if (!o || !f) return;
    _up.set(0, 1, 0).applyQuaternion(o.quaternion);
    const upright = _up.y > 0.8 ? 1 : 0;
    lit.current = MathUtils.damp(lit.current, upright, upright ? 2.5 : 12, dt);
    const t = state.clock.elapsedTime + seed;
    flicker.current = 0.86 + Math.sin(t * 11) * 0.06 + Math.sin(t * 17.3) * 0.05 + Math.sin(t * 5.1) * 0.03;
    const k = lit.current;
    f.scale.set(k * (0.92 + flicker.current * 0.08), k * flicker.current, k * (0.92 + flicker.current * 0.08));
    (f.material as MeshStandardMaterial).emissiveIntensity = 2.4 * flicker.current;
  });

  useAccentLight(lightSlot, (light) => {
    const o = carrier.current;
    if (!o) return;
    _flame.set(0, tip + 0.07, 0).applyQuaternion(o.quaternion).add(o.position);
    light.position.copy(_flame);
    light.intensity = 1.7 * flicker.current * lit.current;
    light.distance = 2.8;
    light.decay = 2;
    light.color.copy(GOLD);
  });

  return (
    <PhysicsProp
      id={id}
      position={position}
      objectRef={carrier}
      colliders={
        <>
          <CylinderCollider args={[tip / 2, 0.05]} position={[0, tip / 2, 0]} mass={0.25} friction={0.8} />
          <CylinderCollider args={[0.015, 0.075]} position={[0, 0.015, 0]} mass={0.1} friction={0.8} />
        </>
      }
      angularDamping={0.35}
    >
      <Cyl r={0.075} r2={0.068} h={0.03} position={[0, 0.015, 0]} color={P.accent} s={METAL} />
      <Torus r={0.07} tube={0.015} rotation={[HALF_PI, 0, 0]} position={[0, 0.03, 0]} color={P.accent} s={METAL} />
      <Cyl r={0.045} h={height} position={[0, 0.03 + height / 2, 0]} color={P.light} seg={18} />
      <Torus r={0.034} tube={0.015} rotation={[HALF_PI, 0, 0]} position={[0, tip - 0.005, 0]} color={P.light} seg={18} />
      <Cyl r={0.015} h={0.04} position={[0, tip + 0.02, 0]} color={P.deep} seg={6} />
      <group position={[0, tip + 0.075, 0]} scale={[1, 1.7, 1]}>
        <mesh ref={flame}>
          <sphereGeometry args={[0.034, 12, 10]} />
          <meshStandardMaterial color={P.accent} emissive={P.accent} emissiveIntensity={2.4} roughness={0.7} userData={{ glow: true }} />
        </mesh>
      </group>
    </PhysicsProp>
  );
}

/* ─────────────── Table-top props ─────────────── */

function TarotDeck() {
  return (
    <PhysicsProp
      id="tarot-deck"
      position={[-0.38, TABLE_TOP + 0.047, -0.12]}
      rotation={[0, 0.5, 0]}
      colliders={<CuboidCollider args={[0.1, 0.045, 0.15]} mass={0.18} friction={0.8} />}
    >
      <Box size={[0.2, 0.09, 0.3]} color={P.mid} radius={0.03} />
      <Box size={[0.16, 0.03, 0.26]} position={[0, 0.036, 0]} color={P.dominant} radius={0.012} />
      <Torus r={0.045} tube={0.015} rotation={[HALF_PI, 0, 0]} position={[0, 0.054, 0]} color={P.accent} s={METAL} />
      <Sphere r={0.022} position={[0, 0.056, 0]} color={P.accent} s={METAL} />
    </PhysicsProp>
  );
}

type Arcana = 'sun' | 'moon' | 'star';

function TarotCard({ id, position, yaw, arcana }: { id: string; position: V3; yaw: number; arcana: Arcana }) {
  return (
    <PhysicsProp
      id={id}
      position={position}
      rotation={[0, yaw, 0]}
      colliders={<CuboidCollider args={[0.085, 0.015, 0.13]} mass={0.03} friction={0.7} />}
      linearDamping={0.9}
      angularDamping={0.8}
      ccd
      drag={{ throwMultiplier: 0.85, margin: 0.08 }}
    >
      <Box size={[0.17, 0.03, 0.26]} color={P.light} radius={0.012} />
      <Box size={[0.13, 0.03, 0.21]} position={[0, 0.008, 0]} color={P.dominant} radius={0.012} />
      {arcana === 'sun' && (
        <Sphere r={0.036} scale={[1, 0.4, 1]} position={[0, 0.03, 0]} color={P.accent} s={{ emissive: P.accent, emissiveIntensity: 0.4 }} />
      )}
      {arcana === 'moon' && (
        <Torus r={0.036} tube={0.015} arc={Math.PI * 1.3} rotation={[HALF_PI, 0, 0.6]} position={[0, 0.03, 0]} color={P.light} />
      )}
      {arcana === 'star' && (
        <>
          <Box size={[0.09, 0.03, 0.03]} position={[0, 0.03, 0]} color={P.accent} radius={0.012} />
          <Box size={[0.03, 0.03, 0.09]} position={[0, 0.03, 0]} color={P.accent} radius={0.012} />
        </>
      )}
    </PhysicsProp>
  );
}

function Teacup() {
  return (
    <PhysicsProp
      id="teacup"
      position={[-0.2, TABLE_TOP + 0.002, -0.6]}
      rotation={[0, 0.8, 0]}
      colliders={
        <>
          <CylinderCollider args={[0.015, 0.13]} position={[0, 0.015, 0]} mass={0.1} friction={0.8} />
          <CylinderCollider args={[0.055, 0.09]} position={[0, 0.085, 0]} mass={0.15} friction={0.6} />
        </>
      }
    >
      <Cyl r={0.13} r2={0.11} h={0.03} position={[0, 0.015, 0]} color={P.light} seg={28} />
      <Torus r={0.12} tube={0.015} rotation={[HALF_PI, 0, 0]} position={[0, 0.03, 0]} color={P.accent} />
      <Lathe points={CUP} position={[0, 0.03, 0]} color={P.light} s={{ doubleSide: true }} />
      <Cyl r={0.074} h={0.03} position={[0, 0.115, 0]} color={P.deep} seg={20} />
      <Torus r={0.036} tube={0.015} position={[0.098, 0.1, 0]} color={P.light} seg={18} />
    </PhysicsProp>
  );
}

/* ─────────────── Shelf props ─────────────── */

function Skull() {
  return (
    <PhysicsProp
      id="skull"
      position={[-2.0, SHELF_TOP + 0.135, -1.0]}
      rotation={[0, HALF_PI, 0]}
      colliders={<BallCollider args={[0.13]} mass={0.6} friction={0.8} />}
      angularDamping={0.6}
    >
      <Sphere r={0.13} scale={[1, 0.95, 1.08]} position={[0, 0.02, -0.01]} color={P.light} />
      <Box size={[0.16, 0.09, 0.13]} position={[0, -0.075, 0.045]} color={P.light} radius={0.04} />
      <Sphere r={0.036} position={[-0.05, 0, 0.112]} color={P.deep} />
      <Sphere r={0.036} position={[0.05, 0, 0.112]} color={P.deep} />
      <Box size={[0.03, 0.04, 0.03]} position={[0, -0.05, 0.125]} color={P.deep} radius={0.012} />
      <Box size={[0.1, 0.03, 0.03]} position={[0, -0.098, 0.103]} color={P.deep} radius={0.012} />
    </PhysicsProp>
  );
}

function Potion({
  id,
  position,
  profile,
  height,
  radius,
  color,
  glow = false,
  label,
}: {
  id: string;
  position: V3;
  profile: Profile;
  height: number;
  radius: number;
  color: string;
  glow?: boolean;
  label?: { y: number; r: number };
}) {
  return (
    <PhysicsProp
      id={id}
      position={position}
      colliders={<CylinderCollider args={[height / 2, radius]} position={[0, height / 2, 0]} mass={0.3} friction={0.7} />}
    >
      <Lathe points={profile} color={color} s={glow ? { emissive: color, emissiveIntensity: 0.35 } : undefined} />
      <Cyl r={0.034} r2={0.03} h={0.05} position={[0, height + 0.01, 0]} color={P.deep} seg={12} />
      {label && <Cyl r={label.r} h={0.05} position={[0, label.y, 0]} color={P.deep} seg={24} />}
    </PhysicsProp>
  );
}

function Hourglass() {
  return (
    <PhysicsProp
      id="hourglass"
      position={[-2.0, SHELF_TOP + 0.002, 0.5]}
      rotation={[0, 0.3, 0]}
      colliders={<CylinderCollider args={[0.14, 0.08]} position={[0, 0.14, 0]} mass={0.35} friction={0.8} />}
    >
      <Cyl r={0.08} h={0.03} position={[0, 0.015, 0]} color={P.deep} seg={20} />
      <Cyl r={0.08} h={0.03} position={[0, 0.265, 0]} color={P.deep} seg={20} />
      {[0, 1, 2].map((i) => (
        <Cyl key={i} r={0.015} h={0.22} position={[Math.cos(i * 2.094) * 0.066, 0.14, Math.sin(i * 2.094) * 0.066]} color={P.accent} s={METAL} seg={8} />
      ))}
      <Cyl r={0.012} r2={0.04} h={0.045} position={[0, 0.058, 0]} color={P.accent} seg={16} />
      <Cyl r={0.036} r2={0.014} h={0.04} position={[0, 0.16, 0]} color={P.accent} seg={16} />
      <Lathe points={HOURGLASS} position={[0, 0.03, 0]} color={P.light} s={GLASS} />
    </PhysicsProp>
  );
}

/* ─────────────── Floor props ─────────────── */

function Book({ id, position, yaw, size, color }: { id: string; position: V3; yaw: number; size: V3; color: string }) {
  const [w, h, d] = size;
  return (
    <PhysicsProp
      id={id}
      position={position}
      rotation={[0, yaw, 0]}
      colliders={<CuboidCollider args={[w / 2, h / 2, d / 2]} mass={0.5} friction={0.8} />}
    >
      <Box size={[w, 0.03, d]} position={[0, -h / 2 + 0.015, 0]} color={color} radius={0.012} />
      <Box size={[w, 0.03, d]} position={[0, h / 2 - 0.015, 0]} color={color} radius={0.012} />
      <Box size={[w, h, 0.03]} position={[0, 0, -d / 2 + 0.015]} color={color} radius={0.012} />
      <Box size={[w - 0.03, h - 0.05, d - 0.035]} position={[0, 0, 0.005]} color={P.light} radius={0.01} />
    </PhysicsProp>
  );
}

function Pouf({ id, position, color }: { id: string; position: V3; color: string }) {
  return (
    <PhysicsProp
      id={id}
      position={position}
      colliders={<CylinderCollider args={[0.16, 0.33]} position={[0, 0.16, 0]} mass={1.4} friction={0.9} />}
      linearDamping={0.2}
      angularDamping={0.5}
    >
      <Cyl r={0.3} h={0.24} position={[0, 0.14, 0]} color={color} seg={28} />
      <Torus r={0.27} tube={0.06} rotation={[HALF_PI, 0, 0]} position={[0, 0.27, 0]} color={color} />
      <Torus r={0.28} tube={0.05} rotation={[HALF_PI, 0, 0]} position={[0, 0.05, 0]} color={color} />
      <Cyl r={0.27} h={0.04} position={[0, 0.3, 0]} color={color} seg={28} />
      <Sphere r={0.035} position={[0, 0.325, 0]} color={P.accent} />
    </PhysicsProp>
  );
}

function SideTable() {
  return (
    <PhysicsProp
      id="side-table"
      position={[1.55, 0.002, -1.55]}
      colliders={
        <>
          <CylinderCollider args={[0.025, 0.3]} position={[0, 0.6, 0]} mass={0.8} friction={0.8} />
          <CylinderCollider args={[0.28, 0.06]} position={[0, 0.3, 0]} mass={0.8} />
          <CylinderCollider args={[0.02, 0.2]} position={[0, 0.02, 0]} mass={1.2} friction={0.9} />
        </>
      }
      angularDamping={0.4}
    >
      <Cyl r={0.2} r2={0.22} h={0.04} position={[0, 0.02, 0]} color={P.deep} seg={24} />
      <Cyl r={0.045} r2={0.06} h={0.56} position={[0, 0.3, 0]} color={P.deep} seg={16} />
      <Torus r={0.06} tube={0.02} rotation={[HALF_PI, 0, 0]} position={[0, 0.3, 0]} color={P.accent} s={METAL} />
      <Cyl r={0.3} h={0.05} position={[0, 0.6, 0]} color={P.deep} seg={32} />
      <Torus r={0.3} tube={0.02} rotation={[HALF_PI, 0, 0]} position={[0, 0.6, 0]} color={P.accent} s={METAL} />
    </PhysicsProp>
  );
}

function IncenseBurner() {
  return (
    <PhysicsProp
      id="incense"
      position={[1.55, 0.629, -1.55]}
      colliders={<CylinderCollider args={[0.1, 0.12]} position={[0, 0.1, 0]} mass={0.6} friction={0.8} />}
    >
      {[0, 1, 2].map((i) => (
        <Sphere key={i} r={0.025} position={[Math.cos(i * 2.094) * 0.07, 0.014, Math.sin(i * 2.094) * 0.07]} color={P.accent} s={METAL} />
      ))}
      <Lathe points={BURNER} color={P.accent} s={METAL} />
      <Sphere r={0.1} thetaLength={HALF_PI} position={[0, 0.09, 0]} color={P.accent} s={METAL} />
      <Sphere r={0.026} position={[0, 0.2, 0]} color={P.dominant} />
    </PhysicsProp>
  );
}

function SeerChair() {
  return (
    <PhysicsProp
      id="seer-chair"
      position={[0.2, 0.002, -1.5]}
      colliders={
        <>
          <CuboidCollider args={[0.28, 0.08, 0.25]} position={[0, 0.54, 0]} mass={1.2} />
          <CuboidCollider args={[0.26, 0.22, 0.23]} position={[0, 0.24, 0]} mass={1.4} />
          <CuboidCollider args={[0.28, 0.475, 0.04]} position={[0, 1.0, -0.21]} mass={1.0} />
        </>
      }
      angularDamping={0.4}
    >
      {([[-0.22, -0.19], [0.22, -0.19], [-0.22, 0.19], [0.22, 0.19]] as const).map(([x, z], i) => (
        <Box key={i} size={[0.07, 0.46, 0.07]} position={[x, 0.23, z]} color={P.deep} radius={0.025} />
      ))}
      <Box size={[0.56, 0.1, 0.5]} position={[0, 0.51, 0]} color={P.deep} />
      <Box size={[0.5, 0.07, 0.44]} position={[0, 0.585, 0.01]} color={P.mid} radius={0.03} />
      <Box size={[0.56, 0.95, 0.08]} position={[0, 1.0, -0.21]} color={P.deep} />
      <Box size={[0.44, 0.72, 0.03]} position={[0, 1.0, -0.163]} color={P.mid} radius={0.012} />
      <Torus r={0.2} tube={0.04} arc={Math.PI} position={[0, 1.47, -0.21]} color={P.accent} s={METAL} />
      <Sphere r={0.045} position={[-0.28, 1.5, -0.21]} color={P.accent} s={METAL} />
      <Sphere r={0.045} position={[0.28, 1.5, -0.21]} color={P.accent} s={METAL} />
    </PhysicsProp>
  );
}

/* ─────────────── Fixed furniture + decor (static meshes, colliders when live) ─────────────── */

function Furniture() {
  return (
    <>
      <Cyl r={1.55} h={0.03} position={[0.2, 0.015, 0.05]} color={P.dominant} seg={56} />
      <Torus r={1.42} tube={0.02} rotation={[HALF_PI, 0, 0]} position={[0.2, 0.022, 0.05]} color={P.accent} seg={72} />
      <Torus r={0.9} tube={0.018} rotation={[HALF_PI, 0, 0]} position={[0.2, 0.022, 0.05]} color={P.mid} seg={56} />

      <Cyl r={0.8} r2={0.96} h={0.8} position={[0.2, 0.4, -0.2]} color={P.mid} seg={40} />
      <Torus r={0.95} tube={0.03} rotation={[HALF_PI, 0, 0]} position={[0.2, 0.035, -0.2]} color={P.accent} seg={56} />
      <Cyl r={0.84} h={0.07} position={[0.2, 0.825, -0.2]} color={P.mid} seg={40} />
      <Torus r={0.84} tube={0.024} rotation={[HALF_PI, 0, 0]} position={[0.2, 0.84, -0.2]} color={P.accent} seg={56} />

      <Box size={[0.36, 0.06, 2.0]} position={[-2.02, 1.47, -0.25]} color={P.deep} />
      <Box size={[0.03, 0.05, 2.0]} position={[-1.83, 1.47, -0.25]} color={P.accent} radius={0.012} />
      <Box size={[0.28, 0.2, 0.05]} position={[-2.06, 1.33, -1.0]} color={P.deep} />
      <Box size={[0.28, 0.2, 0.05]} position={[-2.06, 1.33, 0.5]} color={P.deep} />

      <FixedColliders>
        <CylinderCollider args={[0.015, 1.55]} position={[0.2, 0.015, 0.05]} friction={0.9} />
        <CylinderCollider args={[0.43, 0.84]} position={[0.2, 0.43, -0.2]} friction={0.8} />
        <CylinderCollider args={[0.2, 0.95]} position={[0.2, 0.2, -0.2]} />
        <CuboidCollider args={[0.18, 0.03, 1.0]} position={[-2.02, 1.47, -0.25]} friction={0.8} />
      </FixedColliders>
    </>
  );
}

function Drape({ x0, dir }: { x0: number; dir: 1 | -1 }) {
  return (
    <group>
      {[0, 1, 2, 3, 4].map((i) => (
        <Cyl key={i} r={0.085} h={2.55} position={[x0 + dir * i * 0.15, 1.42, -2.1 + (i % 2) * 0.05]} color={P.mid} seg={12} />
      ))}
      <Box size={[0.8, 0.07, 0.26]} position={[x0 + dir * 0.3, 1.15, -2.02]} color={P.accent} radius={0.03} />
    </group>
  );
}

const STARS: { position: V3; rotation: V3 }[] = [
  { position: [-0.75, 2.45, -2.18], rotation: [0, 0, 0] },
  { position: [-0.35, 1.72, -2.18], rotation: [0, 0, 0.3] },
  { position: [0.95, 2.5, -2.18], rotation: [0, 0, -0.2] },
  { position: [0.85, 1.55, -2.18], rotation: [0, 0, 0.5] },
  { position: [-2.18, 2.3, 1.0], rotation: [0, HALF_PI, 0.2] },
  { position: [-2.18, 1.7, 1.55], rotation: [0, HALF_PI, -0.3] },
];

function WallDecor() {
  const starMaterials = useMemo(
    () =>
      STARS.map(
        () => new MeshStandardMaterial({ color: P.accent, emissive: P.accent, emissiveIntensity: 0.6, roughness: 0.7, userData: { glow: true } }),
      ),
    [],
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    starMaterials.forEach((m, i) => {
      m.emissiveIntensity = 0.45 + Math.sin(t * 1.6 + i * 1.7) * 0.35;
    });
  });

  return (
    <>
      <Cyl r={0.028} h={4.3} rotation={[0, 0, HALF_PI]} position={[0, 2.72, -2.08]} color={P.accent} s={METAL} />
      <Sphere r={0.055} position={[-2.14, 2.72, -2.08]} color={P.accent} s={METAL} />
      <Sphere r={0.055} position={[2.14, 2.72, -2.08]} color={P.accent} s={METAL} />
      <Drape x0={-2.05} dir={1} />
      <Drape x0={2.1} dir={-1} />

      <Torus r={0.32} tube={0.075} arc={Math.PI * 1.25} rotation={[0, 0, 0.9]} position={[0.2, 2.1, -2.12]} color={P.accent} s={{ emissive: P.accent, emissiveIntensity: 0.35 }} />

      {STARS.map((star, i) => (
        <group key={i} position={star.position} rotation={star.rotation}>
          <RoundedBox args={[0.2, 0.045, 0.035]} radius={0.015} smoothness={2} material={starMaterials[i]} />
          <RoundedBox args={[0.045, 0.2, 0.035]} radius={0.015} smoothness={2} material={starMaterials[i]} />
          <RoundedBox args={[0.1, 0.035, 0.035]} radius={0.014} smoothness={2} rotation={[0, 0, Math.PI / 4]} material={starMaterials[i]} />
        </group>
      ))}

      <group position={[-2.16, 2.3, -0.25]} rotation={[0, HALF_PI, 0]}>
        <Torus r={0.3} tube={0.03} color={P.accent} s={METAL} />
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2;
          return <Box key={i} size={[0.035, 0.12, 0.035]} position={[Math.cos(a) * 0.4, Math.sin(a) * 0.4, 0]} rotation={[0, 0, a - HALF_PI]} color={P.accent} radius={0.014} />;
        })}
        <Sphere r={0.22} scale={[1, 0.52, 0.25]} color={P.light} />
        <Sphere r={0.09} scale={[1, 1, 0.45]} position={[0, 0, 0.04]} color={P.mid} />
        <Sphere r={0.045} position={[0, 0, 0.07]} color={P.deep} />
      </group>
    </>
  );
}

/* ─────────────── Room assembly ─────────────── */

function FortuneTellerContents() {
  return (
    <>
      <RoomShell walls={P.dominant} floor={P.deep} trim={P.accent}>
        <WallDecor />
      </RoomShell>
      <Furniture />

      <CrystalStand />
      <CrystalBall />
      <Candle id="candle-tall" position={[0.72, TABLE_TOP + 0.002, -0.02]} height={0.3} lightSlot={1} />
      <Candle id="candle-mid" position={[0.56, TABLE_TOP + 0.002, 0.2]} height={0.2} />
      <Candle id="candle-short" position={[0.8, TABLE_TOP + 0.002, 0.14]} height={0.14} />
      <TarotDeck />
      <TarotCard id="card-sun" position={[0.0, TABLE_TOP + 0.017, 0.35]} yaw={0.25} arcana="sun" />
      <TarotCard id="card-moon" position={[-0.26, TABLE_TOP + 0.017, 0.2]} yaw={0.6} arcana="moon" />
      <TarotCard id="card-star" position={[0.24, TABLE_TOP + 0.017, 0.4]} yaw={-0.2} arcana="star" />
      <Teacup />

      <Skull />
      <Potion id="potion-flask" position={[-2.0, SHELF_TOP + 0.002, -0.62]} profile={FLASK} height={0.22} radius={0.095} color={P.accent} glow />
      <Potion id="potion-vial" position={[-2.0, SHELF_TOP + 0.002, -0.38]} profile={VIAL} height={0.27} radius={0.06} color={P.mid} label={{ y: 0.1, r: 0.063 }} />
      <Potion id="potion-jar" position={[-2.0, SHELF_TOP + 0.002, -0.14]} profile={JAR} height={0.17} radius={0.086} color={P.light} label={{ y: 0.06, r: 0.089 }} />
      <Candle id="candle-shelf" position={[-2.0, SHELF_TOP + 0.002, 0.18]} height={0.24} lightSlot={2} />
      <Hourglass />

      <Book id="book-a" position={[-1.72, 0.052, 1.25]} yaw={0.12} size={[0.5, 0.1, 0.36]} color={P.dominant} />
      <Book id="book-b" position={[-1.7, 0.149, 1.23]} yaw={-0.18} size={[0.44, 0.09, 0.32]} color={P.mid} />
      <Book id="book-c" position={[-1.74, 0.236, 1.27]} yaw={0.4} size={[0.38, 0.08, 0.28]} color={P.accent} />
      <Pouf id="pouf-a" position={[1.15, 0.032, 0.85]} color={P.mid} />
      <Pouf id="pouf-b" position={[-0.75, 0.032, 0.75]} color={P.dominant} />
      <SideTable />
      <IncenseBurner />
      <SeerChair />
    </>
  );
}

export const FortuneTeller: RoomModule = {
  id: 'fortune',
  name: 'Fortune Teller',
  caption: 'Hold the crystal ball. It warms to patient hands.',
  palette: P,
  backdrop: mix(P.deep, P.dominant, 0.32),
  ink: 'light',
  mood: { key: 0.42, fill: 0.5, rim: 1.1 },
  Contents: FortuneTellerContents,
};
