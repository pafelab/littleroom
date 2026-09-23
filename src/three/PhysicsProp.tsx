import { RigidBody, type RapierRigidBody, type RigidBodyProps } from '@react-three/rapier';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode, type RefObject } from 'react';
import { Euler, Quaternion, Vector3, type Group, type Object3D } from 'three';
import type { V3 } from '../config';
import { useDraggable, type DragOptions } from '../hooks/useDraggable';
import { useRoom, type TransformMemo } from './RoomContext';

export type PhysicsPropProps = {
  /** Unique within the room — keys transform memory and the tidy registry. */
  id: string;
  /** Origin transform: where the prop is authored and where "tidy up" returns it. */
  position: V3;
  rotation?: V3;
  /** Explicit colliders (auto colliders are off globally). */
  colliders: ReactNode;
  children: ReactNode;
  /** Optional external body ref, needed when joints connect this prop. */
  bodyRef?: RefObject<RapierRigidBody>;
  /** Receives the Object3D carrying the room-space transform in both modes. */
  objectRef?: MutableRefObject<Object3D | null>;
  /** First-spawn transform when it differs from the origin (e.g. spilled petals). */
  initial?: { position: V3; rotation?: V3 };
  initialVelocity?: V3;
  linearDamping?: number;
  angularDamping?: number;
  gravityScale?: number;
  ccd?: boolean;
  drag?: DragOptions;
  /** Counts towards the chaos meter. */
  chaos?: boolean;
};

type Start = { position: V3; rotation: V3; fromMemory: boolean };

const _euler = new Euler();

function resolveStart(
  memory: Map<string, TransformMemo>,
  id: string,
  position: V3,
  rotation: V3,
  initial?: { position: V3; rotation?: V3 },
): Start {
  const remembered = memory.get(id);
  if (remembered) {
    _euler.setFromQuaternion(remembered.q);
    return {
      position: [remembered.p.x, remembered.p.y, remembered.p.z],
      rotation: [_euler.x, _euler.y, _euler.z],
      fromMemory: true,
    };
  }
  if (initial) return { position: initial.position, rotation: initial.rotation ?? rotation, fromMemory: false };
  return { position, rotation, fromMemory: false };
}

/**
 * Physics gating lives here: the focused, resting room renders RigidBodies;
 * every other room renders the same visuals as plain groups at the last
 * simulated transform. Rapier never sees bodies from non-focused rooms.
 */
export function PhysicsProp(props: PhysicsPropProps) {
  const { live } = useRoom();
  return live ? <LiveProp {...props} /> : <StaticProp {...props} />;
}

function StaticProp({ id, position, rotation = [0, 0, 0], initial, objectRef, children }: PhysicsPropProps) {
  const { memory } = useRoom();
  const [start] = useState(() => resolveStart(memory, id, position, rotation, initial));
  return (
    <group
      ref={(o: Group | null) => {
        if (objectRef) objectRef.current = o;
      }}
      position={start.position}
      rotation={start.rotation}
    >
      {children}
    </group>
  );
}

function LiveProp({
  id,
  position,
  rotation = [0, 0, 0],
  colliders,
  children,
  bodyRef,
  objectRef,
  initial,
  initialVelocity,
  linearDamping = 0.15,
  angularDamping = 0.3,
  gravityScale = 1,
  ccd = false,
  drag,
  chaos = true,
}: PhysicsPropProps) {
  const room = useRoom();
  const ownBody = useRef<RapierRigidBody>(null);
  const body = bodyRef ?? ownBody;
  const visual = useRef<Group>(null);

  // Frozen at mount: changing these on re-render would re-teleport the body.
  const [start] = useState(() => resolveStart(room.memory, id, position, rotation, initial));
  const [origin] = useState<TransformMemo>(() => ({
    p: new Vector3(...position),
    q: new Quaternion().setFromEuler(new Euler(...rotation)),
  }));
  const [bodyOptions] = useState<RigidBodyProps>(() => ({
    type: 'dynamic',
    colliders: false,
    position: start.position,
    rotation: start.rotation,
    linearDamping,
    angularDamping,
    gravityScale,
    ccd,
    ...(initialVelocity && !start.fromMemory ? { linearVelocity: initialVelocity } : {}),
  }));

  const bind = useDraggable(body, visual, drag);

  useLayoutEffect(() => {
    const carrier = visual.current?.parent ?? null;
    if (objectRef) objectRef.current = carrier;
    return () => {
      if (objectRef && objectRef.current === carrier) objectRef.current = null;
    };
  }, [objectRef]);

  useEffect(() => {
    const rb = body.current;
    const carrier = visual.current?.parent;
    if (!rb || !carrier) return;
    const entry = { id, body: rb, object: carrier, origin, chaos };
    room.registry.set(id, entry);
    return () => {
      if (room.registry.get(id) === entry) room.registry.delete(id);
    };
  }, [body, id, origin, chaos, room.registry]);

  const content = useMemo(
    () => (
      <group ref={visual} {...bind}>
        {children}
      </group>
    ),
    [bind, children],
  );

  return (
    <RigidBody ref={body} {...bodyOptions}>
      {colliders}
      {content}
    </RigidBody>
  );
}

/** Static furniture colliders — mounted only while the room is live. */
export function FixedColliders({ children, position, rotation }: { children: ReactNode; position?: V3; rotation?: V3 }) {
  const { live } = useRoom();
  if (!live) return null;
  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
      {children}
    </RigidBody>
  );
}
