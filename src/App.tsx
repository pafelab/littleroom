import { Experience } from './components/Experience';
import { Caption, Chevrons, Dots, FortuneToast, Header, Hint, Loader, TidyPanel, Veil, useActiveRoom } from './components/ui/Overlay';
import { useKeyboardNav, useReducedMotionSync } from './hooks/useShellInput';

export default function App() {
  useReducedMotionSync();
  useKeyboardNav();
  const { active, room } = useActiveRoom();

  return (
    <main
      className="relative h-dvh w-full select-none overflow-hidden font-sans transition-colors duration-700"
      style={{ backgroundColor: room.backdrop }}
    >
      <Experience />
      <div aria-hidden className="vignette pointer-events-none absolute inset-0" />
      <Header ink={room.ink} active={active} />
      <Caption room={room} />
      <FortuneToast ink={room.ink} />
      <Chevrons ink={room.ink} />
      <Dots ink={room.ink} active={active} />
      <TidyPanel ink={room.ink} active={active} />
      <Hint ink={room.ink} />
      <Veil color={room.backdrop} />
      <Loader color={room.backdrop} ink={room.ink} />
    </main>
  );
}
