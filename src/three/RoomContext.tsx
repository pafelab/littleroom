import type { RapierRigidBody } from '@react-three/rapier';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Quaternion, Vector3, type Object3D } from 'three';
import type { Palette } from '../rooms/palettes';
import { useStore } from '../store';

export type TransformMemo = { p: Vector3; q: Quaternion };

export type RegisteredProp = {
  id: string;
  body: RapierRigidBody;
  /** The Object3D Rapier writes into — its local transform is room-space. */
  object: Object3D;
  origin: TransformMemo;
  chaos: boolean;
};

export type RoomRuntimeValue = {
  index: number;
  id: string;
  live: boolean;
  palette: Palette;
  memory: Map<string, TransformMemo>;
  registry: Map<string, RegisteredProp>;
  resetters: Set<() => void>;
};

const memories = new Map<string, Map<string, TransformMemo>>();
const registries = new Map<string, Map<string, RegisteredProp>>();
const resetterSets = new Map<string, Set<() => void>>();

function lazy<T>(map: Map<string, T>, key: string, make: () => T): T {
  let value = map.get(key);
  if (!value) {
    value = make();
    map.set(key, value);
  }
  return value;
}

export function memoFor(memory: Map<string, TransformMemo>, id: string): TransformMemo {
  return lazy(memory, id, () => ({ p: new Vector3(), q: new Quaternion() }));
}

const RoomContext = createContext<RoomRuntimeValue | null>(null);

export function RoomProvider({
  index,
  id,
  live,
  palette,
  children,
}: {
  index: number;
  id: string;
  live: boolean;
  palette: Palette;
  children: ReactNode;
}) {
  const value = useMemo<RoomRuntimeValue>(
    () => ({
      index,
      id,
      live,
      palette,
      memory: lazy(memories, id, () => new Map()),
      registry: lazy(registries, id, () => new Map()),
      resetters: lazy(resetterSets, id, () => new Set()),
    }),
    [index, id, live, palette],
  );
  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}

export function useRoom(): RoomRuntimeValue {
  const room = useContext(RoomContext);
  if (!room) throw new Error('useRoom must be used inside a RoomProvider');
  return room;
}

/** Gimmick state that survives the live ↔ static swap (e.g. "bucket spilled"). */
export function useRoomFlag<T>(name: string, initial: T): [T, (value: T) => void] {
  const { id } = useRoom();
  const key = `${id}:${name}`;
  const value = useStore((s) => (key in s.flags ? (s.flags[key] as T) : initial));
  const set = useCallback((next: T) => useStore.getState().setFlag(key, next), [key]);
  return [value, set];
}

/** Runs after "tidy up" has lerped every body home — use it to undo gimmick state. */
export function useTidyReset(reset: () => void) {
  const { resetters } = useRoom();
  const ref = useRef(reset);
  ref.current = reset;
  useEffect(() => {
    const fn = () => ref.current();
    resetters.add(fn);
    return () => {
      resetters.delete(fn);
    };
  }, [resetters]);
}
