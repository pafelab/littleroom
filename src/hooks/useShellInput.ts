import { useEffect } from 'react';
import { useStore } from '../store';

/** Mirrors `prefers-reduced-motion` into the store so the carousel can switch to a veil fade. */
export function useReducedMotionSync() {
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => useStore.getState().setReducedMotion(query.matches);
    apply();
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, []);
}

/** ← / → browse shops, T tidies the focused room. */
export function useKeyboardNav() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const { go, tidy } = useStore.getState();
      if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 't' || e.key === 'T') tidy();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
