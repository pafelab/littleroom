import { ContactShadows, OrbitControls, OrthographicCamera } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { Suspense, memo, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Color, Fog, NeutralToneMapping } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import {
  AZIMUTH_RANGE,
  CAMERA_POSITION,
  CAMERA_TARGET,
  FOG_FAR,
  FOG_NEAR,
  FRAME_HEIGHT,
  FRAME_WIDTH,
  ISO_AZIMUTH,
  ISO_POLAR,
  POLAR_RANGE,
  ROOM_COUNT,
  mod,
} from '../config';
import { ROOMS } from '../rooms';
import { useStore } from '../store';
import { CarouselManager } from './CarouselManager';
import { LightingRig } from './LightingRig';

export const Experience = memo(function Experience() {
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      gl={{ antialias: true, powerPreference: 'high-performance', toneMapping: NeutralToneMapping }}
      onCreated={({ gl }) => {
        gl.toneMapping = NeutralToneMapping;
      }}
      style={{ position: 'absolute', inset: 0, touchAction: 'none' }}
    >
      <Scene />
    </Canvas>
  );
});

function Scene() {
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);
  // Zoom = pixels per world unit, fitted so the focused room frames on any viewport.
  const zoom = useMemo(() => Math.min(width / FRAME_WIDTH, height / FRAME_HEIGHT), [width, height]);
  const controls = useRef<OrbitControlsImpl>(null);
  const transitioning = useStore((s) => s.transitioning);
  const index = useStore((s) => s.index);
  const room = ROOMS[mod(index, ROOM_COUNT)];

  // Orbit is locked for the whole transition; the camera never moves during one.
  useEffect(() => {
    if (controls.current) controls.current.enabled = !transitioning && !useStore.getState().dragging;
  }, [transitioning]);

  return (
    <>
      <OrthographicCamera makeDefault position={CAMERA_POSITION} zoom={zoom} near={0.1} far={120} />
      <OrbitControls
        ref={controls}
        makeDefault
        target={CAMERA_TARGET}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.5}
        zoomSpeed={0.7}
        minPolarAngle={ISO_POLAR - POLAR_RANGE}
        maxPolarAngle={ISO_POLAR + POLAR_RANGE}
        minAzimuthAngle={ISO_AZIMUTH - AZIMUTH_RANGE}
        maxAzimuthAngle={ISO_AZIMUTH + AZIMUTH_RANGE}
        minZoom={zoom * 0.7}
        maxZoom={zoom * 1.4}
      />
      <Atmosphere color={room.backdrop} />
      <LightingRig mood={room.mood} />
      <ContactShadows position={[0, -0.62, 0]} scale={10} far={1.1} blur={2.6} opacity={0.42} resolution={512} color="#140e18" />
      <Suspense fallback={null}>
        {/* One world. Only the focused, resting room mounts bodies into it. */}
        <Physics gravity={[0, -9.81, 0]} colliders={false} timeStep={1 / 60} paused={transitioning} numSolverIterations={8}>
          <CarouselManager />
          <ReadySignal />
        </Physics>
      </Suspense>
    </>
  );
}

/** Background + fog colour follow the focused room; fog fades rooms rotating away. */
function Atmosphere({ color }: { color: string }) {
  const scene = useThree((s) => s.scene);
  const target = useMemo(() => new Color(color), [color]);
  const initial = useRef(target);

  useLayoutEffect(() => {
    scene.background = initial.current.clone();
    scene.fog = new Fog(initial.current.clone(), FOG_NEAR, FOG_FAR);
    return () => {
      scene.background = null;
      scene.fog = null;
    };
  }, [scene]);

  useFrame((_, dt) => {
    const bg = scene.background;
    const fog = scene.fog;
    if (!(bg instanceof Color) || !fog) return;
    bg.lerp(target, 1 - Math.exp(-dt * 3));
    fog.color.copy(bg);
  });

  return null;
}

function ReadySignal() {
  useEffect(() => {
    useStore.getState().setReady();
  }, []);
  return null;
}
