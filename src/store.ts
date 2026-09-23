import { create } from 'zustand';
import { ROOM_COUNT, mod } from './config';

type Toast = { id: number; text: string };

type ShopState = {
  /** Unwrapped carousel index — rotation.y is always -index * STEP. */
  index: number;
  transitioning: boolean;
  pending: -1 | 0 | 1;
  dragging: boolean;
  tidying: boolean;
  tidyToken: number;
  reducedMotion: boolean;
  veil: boolean;
  ready: boolean;
  hasThrown: boolean;
  chaos: number[];
  flags: Record<string, unknown>;
  toast: Toast | null;

  go: (dir: -1 | 1) => void;
  goTo: (room: number) => void;
  endTransition: () => void;
  setDragging: (v: boolean) => void;
  markThrown: () => void;
  tidy: () => void;
  setTidying: (v: boolean) => void;
  setReducedMotion: (v: boolean) => void;
  setVeil: (v: boolean) => void;
  setReady: () => void;
  setChaos: (room: number, value: number) => void;
  setFlag: (key: string, value: unknown) => void;
  showToast: (text: string) => void;
  clearToast: (id: number) => void;
};

export const useStore = create<ShopState>((set, get) => ({
  index: 1,
  transitioning: false,
  pending: 0,
  dragging: false,
  tidying: false,
  tidyToken: 0,
  reducedMotion: false,
  veil: false,
  ready: false,
  hasThrown: false,
  chaos: Array.from({ length: ROOM_COUNT }, () => 0),
  flags: {},
  toast: null,

  go: (dir) => {
    const s = get();
    if (s.transitioning || s.tidying || s.dragging) {
      set({ pending: dir });
      return;
    }
    set({ index: s.index + dir, transitioning: true, pending: 0 });
  },

  goTo: (room) => {
    const s = get();
    if (s.transitioning || s.tidying || s.dragging) return;
    const current = mod(s.index, ROOM_COUNT);
    let delta = mod(room - current, ROOM_COUNT);
    if (delta > ROOM_COUNT / 2) delta -= ROOM_COUNT;
    if (delta === 0) return;
    set({ index: s.index + delta, transitioning: true, pending: 0 });
  },

  endTransition: () => {
    const queued = get().pending;
    set({ transitioning: false, pending: 0 });
    if (queued !== 0) get().go(queued);
  },

  setDragging: (v) => {
    set({ dragging: v });
    if (!v) {
      const queued = get().pending;
      if (queued !== 0) {
        set({ pending: 0 });
        get().go(queued);
      }
    }
  },

  markThrown: () => {
    if (!get().hasThrown) set({ hasThrown: true });
  },

  tidy: () => {
    const s = get();
    if (s.transitioning || s.tidying || s.dragging) return;
    set({ tidyToken: s.tidyToken + 1 });
  },

  setTidying: (v) => {
    set({ tidying: v });
    if (!v) {
      const queued = get().pending;
      if (queued !== 0) {
        set({ pending: 0 });
        get().go(queued);
      }
    }
  },

  setReducedMotion: (v) => set({ reducedMotion: v }),
  setVeil: (v) => set({ veil: v }),
  setReady: () => set({ ready: true }),

  setChaos: (room, value) => {
    const current = get().chaos[room];
    if (Math.abs(current - value) < 0.05) return;
    const next = get().chaos.slice();
    next[room] = value;
    set({ chaos: next });
  },

  setFlag: (key, value) => set((s) => ({ flags: { ...s.flags, [key]: value } })),

  showToast: (text) => set({ toast: { id: performance.now(), text } }),
  clearToast: (id) => {
    if (get().toast?.id === id) set({ toast: null });
  },
}));

export const activeRoomIndex = (index: number) => mod(index, ROOM_COUNT);
