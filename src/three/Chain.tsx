import type { RapierRigidBody } from '@react-three/rapier';
import { createRef, useMemo, useRef, type ReactNode } from 'react';
import type { Vector3 } from 'three';
import type { V3 } from '../config';
import { FixedAnchor, SphericalLink } from './joints';
import { PhysicsProp } from './PhysicsProp';
import { useRoom } from './RoomContext';

type ChainProps = {
  id: string;
  /** Room-space hook point the first link hangs from. */
  anchor: V3;
  count: number;
  /** Length of each link; joints sit at ±segment/2 on the local Y axis. */
  segment: number;
  collider: (index: number) => ReactNode;
  renderLink: (index: number) => ReactNode;
  linearDamping?: number;
  angularDamping?: number;
  /** Clamp drags to the reachable sphere around the hook (for permanently hung chains). */
  tethered?: boolean;
  /** When false the hook joint is removed and the chain is free. */
  attached?: boolean;
  throwMultiplier?: number;
  onLinkDrag?: (index: number, target: Vector3) => void;
};

/** A hanging chain of bodies joined end-to-end with spherical joints. */
export function Chain({
  id,
  anchor,
  count,
  segment,
  collider,
  renderLink,
  linearDamping = 0.3,
  angularDamping = 0.6,
  tethered = false,
  attached = true,
  throwMultiplier = 0.7,
  onLinkDrag,
}: ChainProps) {
  const { live } = useRoom();
  const hook = useRef<RapierRigidBody>(null);
  const links = useMemo(() => Array.from({ length: count }, () => createRef<RapierRigidBody>()), [count]);
  const half = segment / 2;

  return (
    <>
      {live && <FixedAnchor bodyRef={hook} position={anchor} />}
      {links.map((ref, i) => (
        <PhysicsProp
          key={i}
          id={`${id}-${i}`}
          bodyRef={ref}
          position={[anchor[0], anchor[1] - half - i * segment, anchor[2]]}
          colliders={collider(i)}
          linearDamping={linearDamping}
          angularDamping={angularDamping}
          drag={{
            throwMultiplier,
            spin: 0.3,
            tether: tethered ? { anchor, radius: (i + 1) * segment } : undefined,
            onDrag: onLinkDrag ? (target) => onLinkDrag(i, target) : undefined,
          }}
        >
          {renderLink(i)}
        </PhysicsProp>
      ))}
      {live && attached && <SphericalLink a={hook} b={links[0]} anchorA={[0, 0, 0]} anchorB={[0, half, 0]} />}
      {live &&
        links
          .slice(1)
          .map((ref, i) => <SphericalLink key={i} a={links[i]} b={ref} anchorA={[0, -half, 0]} anchorB={[0, half, 0]} />)}
    </>
  );
}
