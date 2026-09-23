import type { ComponentType } from 'react';
import type { Palette } from './palettes';

/** Multipliers applied to the shared lighting rig while this room is in focus. */
export type Mood = Readonly<{ key: number; fill: number; rim: number }>;

/**
 * The contract every room module fulfils. `Contents` renders both the static
 * (off-focus) and live (physics) versions — it reads `useRoom().live` through
 * PhysicsProp / FixedColliders, so a room author never branches manually.
 */
export type RoomModule = Readonly<{
  id: string;
  name: string;
  caption: string;
  palette: Palette;
  backdrop: string;
  ink: 'dark' | 'light';
  mood: Mood;
  Contents: ComponentType;
}>;
