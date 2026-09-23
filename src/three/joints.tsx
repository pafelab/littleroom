import { useFrame } from '@react-three/fiber';
import { RigidBody, useRopeJoint, useSphericalJoint, type RapierRigidBody } from '@react-three/rapier';
import { useEffect, useMemo, useRef, type MutableRefObject, type RefObject } from 'react';
import { Vector3, type Mesh, type Object3D } from 'three';
import type { V3 } from '../config';
import { Mat } from './kit';

type BodyRef = RefObject<RapierRigidBody>;

/** A collider-less fixed body used purely as a joint anchor (hooks, beams, ceilings). */
export function FixedAnchor({ bodyRef, position = [0, 0, 0] }: { bodyRef: BodyRef; position?: V3 }) {
  return <RigidBody ref={bodyRef} type="fixed" colliders={false} position={position} />;
}

/**
 * Joint hooks create their joint once in a passive effect. Rendering these
 * after the RigidBodies guarantees both refs were assigned in the layout phase.
 */
export function SphericalLink({
  a,
  b,
  anchorA,
  anchorB,
  contacts = false,
}: {
  a: BodyRef;
  b: BodyRef;
  anchorA: V3;
  anchorB: V3;
  contacts?: boolean;
}) {
  const joint = useSphericalJoint(a, b, [anchorA, anchorB]);
  useEffect(() => {
    joint.current?.setContactsEnabled(contacts);
  }, [joint, contacts]);
  return null;
}

export function RopeLink({ a, b, anchorA, anchorB, length }: { a: BodyRef; b: BodyRef; anchorA: V3; anchorB: V3; length: number }) {
  const joint = useRopeJoint(a, b, [anchorA, anchorB, length]);
  useEffect(() => {
    joint.current?.setContactsEnabled(false);
  }, [joint]);
  return null;
}

const UP = new Vector3(0, 1, 0);
const _end = new Vector3();
const _dir = new Vector3();

/** Visual rope between a room-space anchor and a point on a moving prop. */
export function RopeLine({
  from,
  target,
  localAnchor = [0, 0, 0],
  radius = 0.016,
  color,
}: {
  from: V3;
  target: MutableRefObject<Object3D | null>;
  localAnchor?: V3;
  radius?: number;
  color: string;
}) {
  const mesh = useRef<Mesh>(null);
  const start = useMemo(() => new Vector3(...from), [from]);
  const local = useMemo(() => new Vector3(...localAnchor), [localAnchor]);

  useFrame(() => {
    const m = mesh.current;
    const o = target.current;
    if (!m || !o) return;
    _end.copy(local).applyQuaternion(o.quaternion).add(o.position);
    _dir.subVectors(_end, start);
    const length = Math.max(_dir.length(), 0.001);
    m.position.copy(start).addScaledVector(_dir, 0.5);
    m.scale.set(1, length, 1);
    m.quaternion.setFromUnitVectors(UP, _dir.multiplyScalar(1 / length));
  });

  return (
    <mesh ref={mesh} castShadow>
      <cylinderGeometry args={[radius, radius, 1, 6]} />
      <Mat color={color} roughness={0.9} />
    </mesh>
  );
}
