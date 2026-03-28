import { useEffect, useState } from 'react';

export function CustomCursor() {
  const [enabled, setEnabled] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const mq = window.matchMedia('(pointer: fine)');
    const apply = () => {
      const on = mq.matches && window.innerWidth > 900;
      setEnabled(on);
      document.documentElement.classList.toggle('bhumi-custom-cursor', on);
    };
    apply();
    mq.addEventListener('change', apply);
    window.addEventListener('resize', apply);
    return () => {
      mq.removeEventListener('change', apply);
      window.removeEventListener('resize', apply);
      document.documentElement.classList.remove('bhumi-custom-cursor');
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const onMove = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [enabled]);

  if (!enabled) return null;

  return (
    <>
      <div className="cursor" style={{ left: pos.x, top: pos.y }} aria-hidden />
      <div className="cursor-ring" style={{ left: pos.x, top: pos.y }} aria-hidden />
    </>
  );
}
