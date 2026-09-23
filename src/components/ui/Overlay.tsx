import { useEffect, useState } from 'react';
import { ROOM_COUNT, mod } from '../../config';
import { ROOMS } from '../../rooms';
import type { RoomModule } from '../../rooms/types';
import { useStore } from '../../store';
import { cn } from '../../utils/cn';

type Ink = RoomModule['ink'];

const inkText = (ink: Ink) => (ink === 'light' ? 'text-white' : 'text-stone-900');
const inkSurface = (ink: Ink) =>
  ink === 'light' ? 'bg-white/10 ring-white/15 hover:bg-white/20' : 'bg-white/45 ring-black/5 hover:bg-white/70';

export function Header({ ink, active }: { ink: Ink; active: number }) {
  return (
    <header className={cn('pointer-events-none absolute left-5 top-5 flex items-baseline gap-3 transition-colors duration-700 sm:left-8 sm:top-7', inkText(ink))}>
      <span className="text-sm font-semibold tracking-tight opacity-90">Little Shops</span>
      <span className="text-xs tabular-nums opacity-50">
        {String(active + 1).padStart(2, '0')} / {String(ROOM_COUNT).padStart(2, '0')}
      </span>
    </header>
  );
}

type CaptionLayer = { room: RoomModule; key: string; leaving: boolean };

/** Room name + flavour line; the outgoing caption fades while the incoming one rises in. */
export function Caption({ room }: { room: RoomModule }) {
  const [layers, setLayers] = useState<CaptionLayer[]>([{ room, key: room.id, leaving: false }]);

  useEffect(() => {
    setLayers((prev) => {
      if (prev[prev.length - 1]?.room.id === room.id) return prev;
      return [...prev.map((l) => ({ ...l, leaving: true })), { room, key: `${room.id}-${Date.now()}`, leaving: false }];
    });
    const timer = window.setTimeout(() => setLayers((prev) => prev.filter((l) => !l.leaving)), 650);
    return () => window.clearTimeout(timer);
  }, [room]);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-14 grid justify-items-center px-6 text-center sm:top-10">
      {layers.map((layer) => (
        <div
          key={layer.key}
          className={cn(
            '[grid-area:1/1] transition-opacity duration-500',
            inkText(layer.room.ink),
            layer.leaving ? 'opacity-0' : 'animate-caption-in opacity-100',
          )}
        >
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{layer.room.name}</h1>
          <p className="mt-1 text-sm opacity-65 sm:text-[15px]">{layer.room.caption}</p>
        </div>
      ))}
    </div>
  );
}

function ChevronIcon({ dir }: { dir: -1 | 1 }) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {dir === -1 ? <path d="M15 5l-7 7 7 7" /> : <path d="M9 5l7 7-7 7" />}
    </svg>
  );
}

export function Chevrons({ ink }: { ink: Ink }) {
  const go = useStore((s) => s.go);
  return (
    <>
      {([-1, 1] as const).map((dir) => (
        <button
          key={dir}
          type="button"
          aria-label={dir === -1 ? 'Previous shop' : 'Next shop'}
          onClick={() => go(dir)}
          className={cn(
            'pointer-events-auto absolute top-1/2 grid h-14 w-14 -translate-y-1/2 place-items-center rounded-full opacity-35 ring-1 backdrop-blur-sm transition duration-300 hover:scale-105 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none active:scale-95',
            dir === -1 ? 'left-2 sm:left-5' : 'right-2 sm:right-5',
            inkText(ink),
            inkSurface(ink),
          )}
        >
          <ChevronIcon dir={dir} />
        </button>
      ))}
    </>
  );
}

export function Dots({ ink, active }: { ink: Ink; active: number }) {
  const goTo = useStore((s) => s.goTo);
  return (
    <nav aria-label="Shops" className="pointer-events-auto absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-1 sm:bottom-8">
      {ROOMS.map((room, i) => (
        <button
          key={room.id}
          type="button"
          aria-label={room.name}
          aria-current={i === active ? 'true' : undefined}
          onClick={() => goTo(i)}
          className="group grid h-8 place-items-center px-1"
        >
          <span
            className={cn(
              'block h-2 rounded-full transition-all duration-500',
              ink === 'light' ? 'bg-white' : 'bg-stone-900',
              i === active ? 'w-6 opacity-90' : 'w-2 opacity-30 group-hover:opacity-60',
            )}
          />
        </button>
      ))}
    </nav>
  );
}

export function TidyPanel({ ink, active }: { ink: Ink; active: number }) {
  const chaos = useStore((s) => s.chaos[active]);
  const tidy = useStore((s) => s.tidy);
  const busy = useStore((s) => s.transitioning || s.tidying);
  const fill = Math.min(1, chaos / 14);
  return (
    <div
      className={cn(
        'pointer-events-auto absolute bottom-20 right-4 flex items-center gap-3 rounded-full py-1.5 pl-4 pr-1.5 ring-1 backdrop-blur-sm transition-colors duration-700 sm:bottom-7 sm:right-7',
        inkText(ink),
        inkSurface(ink),
      )}
    >
      <div className="flex flex-col gap-1" title="How far things have drifted from where they started">
        <span className="text-[10px] font-medium uppercase tracking-[0.14em] opacity-60">
          chaos <span className="tabular-nums">{chaos.toFixed(1)}m</span>
        </span>
        <span className={cn('block h-1 w-20 overflow-hidden rounded-full', ink === 'light' ? 'bg-white/15' : 'bg-black/10')}>
          <span className={cn('block h-full rounded-full transition-[width] duration-300', ink === 'light' ? 'bg-white/80' : 'bg-stone-900/70')} style={{ width: `${fill * 100}%` }} />
        </span>
      </div>
      <button
        type="button"
        onClick={tidy}
        disabled={busy || chaos < 0.1}
        className={cn(
          'rounded-full px-3.5 py-1.5 text-xs font-semibold transition disabled:cursor-default disabled:opacity-35',
          ink === 'light' ? 'bg-white text-stone-900 hover:bg-white/85' : 'bg-stone-900 text-white hover:bg-stone-800',
        )}
      >
        Tidy up
      </button>
    </div>
  );
}

export function FortuneToast({ ink }: { ink: Ink }) {
  const toast = useStore((s) => s.toast);
  const clearToast = useStore((s) => s.clearToast);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => clearToast(toast.id), 4200);
    return () => window.clearTimeout(timer);
  }, [toast, clearToast]);
  if (!toast) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-36 flex justify-center px-6 sm:top-32">
      <p key={toast.id} className={cn('animate-toast rounded-full px-4 py-2 text-sm italic ring-1 backdrop-blur-sm', inkText(ink), inkSurface(ink))}>
        ✦ {toast.text}
      </p>
    </div>
  );
}

export function Hint({ ink }: { ink: Ink }) {
  const hasThrown = useStore((s) => s.hasThrown);
  const ready = useStore((s) => s.ready);
  return (
    <p
      className={cn(
        'pointer-events-none absolute bottom-20 left-5 max-w-[14rem] text-xs leading-relaxed transition-all duration-700 sm:bottom-8 sm:left-8',
        inkText(ink),
        ready && !hasThrown ? 'opacity-60' : 'translate-y-1 opacity-0',
      )}
    >
      Drag anything, flick to throw.
      <br />
      Orbit a little · ← → to browse
    </p>
  );
}

export function Veil({ color }: { color: string }) {
  const veil = useStore((s) => s.veil);
  return (
    <div
      aria-hidden
      className={cn('pointer-events-none absolute inset-0 transition-opacity duration-150', veil ? 'opacity-100' : 'opacity-0')}
      style={{ backgroundColor: color }}
    />
  );
}

export function Loader({ color, ink }: { color: string; ink: Ink }) {
  const ready = useStore((s) => s.ready);
  return (
    <div
      aria-hidden={ready}
      className={cn('pointer-events-none absolute inset-0 grid place-items-center transition-opacity duration-700', ready ? 'opacity-0' : 'opacity-100')}
      style={{ backgroundColor: color }}
    >
      <p className={cn('animate-pulse text-sm tracking-wide opacity-70', inkText(ink))}>Opening the shops…</p>
    </div>
  );
}

export function useActiveRoom() {
  const index = useStore((s) => s.index);
  const active = mod(index, ROOM_COUNT);
  return { active, room: ROOMS[active] };
}
