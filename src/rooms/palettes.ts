import { Color } from 'three';

/** Five colours per room: one dominant, one accent, three neutrals. */
export type Palette = Readonly<{
  dominant: string;
  accent: string;
  light: string;
  mid: string;
  deep: string;
}>;

export const FLORIST = {
  dominant: '#b5dcc0', // pastel mint
  accent: '#f29bb4', // petal pink
  light: '#fdf6ec', // cream
  mid: '#6f9f7b', // sage leaf
  deep: '#6b4f3a', // walnut
} as const satisfies Palette;

export const FORTUNE = {
  dominant: '#553278', // deep purple
  accent: '#f5b84a', // candle gold
  light: '#f1e4cf', // parchment
  mid: '#8e6fa8', // dusty lilac
  deep: '#1f1530', // ink
} as const satisfies Palette;

export const BAKERY = {
  dominant: '#eab45a', // warm gold
  accent: '#b5483a', // cherry
  light: '#fbf1dc', // flour
  mid: '#b07a48', // crust
  deep: '#3a2c26', // espresso
} as const satisfies Palette;

export const RESTAURANT = {
  dominant: '#5a3325', // mahogany
  accent: '#c9a25a', // brass
  light: '#efe6d6', // linen
  mid: '#8c7a66', // taupe
  deep: '#231612', // ebony
} as const satisfies Palette;

export const OFFICE = {
  dominant: '#8d97a3', // cool grey
  accent: '#e0703a', // signal orange
  light: '#eef1f4', // paper
  mid: '#5d6773', // slate
  deep: '#2b3038', // charcoal
} as const satisfies Palette;

export const BUTCHER = {
  dominant: '#dfe9ec', // cold tile
  accent: '#c8323a', // butcher red
  light: '#f4eee4', // butcher paper
  mid: '#9aa7ad', // steel
  deep: '#34383c', // graphite
} as const satisfies Palette;

/** Mixes two palette colours — used for backdrops so no sixth colour is introduced. */
export function mix(a: string, b: string, t: number): string {
  return '#' + new Color(a).lerp(new Color(b), t).getHexString();
}
