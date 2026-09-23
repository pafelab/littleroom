export type V3 = [number, number, number];

/** Interior room dimensions (world units). Floor top sits at y = 0. */
export const ROOM = {
  w: 4.4,
  d: 4.4,
  h: 3.0,
  wall: 0.2,
  floor: 0.2,
} as const;

export const HALF_W = ROOM.w / 2;
export const HALF_D = ROOM.d / 2;

export const ROOM_COUNT = 6;
/** 60° between carousel slots. */
export const STEP = (Math.PI * 2) / ROOM_COUNT;
export const CAROUSEL_RADIUS = 7.6;

/** True isometric: azimuth 45°, elevation atan(1/√2) ≈ 35.264° → polar ≈ 54.736°. */
export const ISO_AZIMUTH = Math.PI / 4;
export const ISO_POLAR = Math.acos(1 / Math.sqrt(3));
export const AZIMUTH_RANGE = (25 * Math.PI) / 180;
export const POLAR_RANGE = (5 * Math.PI) / 180;

/**
 * The carousel pivot sits behind the focused room along the camera's ground
 * direction, so the focused slot always lands on the world origin with
 * identity rotation — which is what lets physics run in plain world space.
 */
export const CAROUSEL_CENTER: V3 = [
  -CAROUSEL_RADIUS * Math.sin(ISO_AZIMUTH),
  0,
  -CAROUSEL_RADIUS * Math.cos(ISO_AZIMUTH),
];

export const CAMERA_TARGET: V3 = [0, 1.4, 0];
export const CAMERA_DISTANCE = 26;
const ISO_DIR = 1 / Math.sqrt(3);
export const CAMERA_POSITION: V3 = [
  CAMERA_TARGET[0] + CAMERA_DISTANCE * ISO_DIR,
  CAMERA_TARGET[1] + CAMERA_DISTANCE * ISO_DIR,
  CAMERA_TARGET[2] + CAMERA_DISTANCE * ISO_DIR,
];

/** Fog doubles as the "opacity" falloff for rooms that rotate away from focus. */
export const FOG_NEAR = CAMERA_DISTANCE + 1.9;
export const FOG_FAR = CAMERA_DISTANCE + 9.5;

/** Rooms further than this from the front of the carousel are hidden. */
export const VISIBLE_ARC = 1.75;

export const TRANSITION = {
  duration: 0.9,
  ease: 'power3.inOut',
  fade: 0.16,
  restScale: 0.86,
} as const;

/** Screen framing: world units that must fit horizontally / vertically. */
export const FRAME_WIDTH = 8.2;
export const FRAME_HEIGHT = 9.2;

export const mod = (n: number, m: number) => ((n % m) + m) % m;

export const wrapAngle = (a: number) => {
  const t = mod(a + Math.PI, Math.PI * 2);
  return t - Math.PI;
};

export const ringDistance = (a: number, b: number) => {
  const d = Math.abs(mod(a, ROOM_COUNT) - mod(b, ROOM_COUNT));
  return Math.min(d, ROOM_COUNT - d);
};
