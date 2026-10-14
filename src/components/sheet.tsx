"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  animate,
  motion,
  useDragControls,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";

/** Projeção de momentum (WWDC "Designing Fluid Interfaces"): onde o gesto pararia. */
function project(velocity: number, rate = 0.99) {
  return ((velocity / 1000) * rate) / (1 - rate);
}

/**
 * Bottom sheet modal. Segue o dedo 1:1 (a partir da alça), resiste com
 * rubber-band para cima, herda a velocidade do gesto ao soltar e decide
 * fechar pela posição *projetada*, não pela posição de soltura.
 * Sai pelo mesmo caminho por onde entrou.
 */
export function Sheet({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const panel = useRef<HTMLDivElement>(null);
  const controls = useDragControls();
  const y = useMotionValue(typeof window === "undefined" ? 800 : window.innerHeight);
  const scrim = useTransform(y, [0, 500], [0.4, 0]);
  const closing = useRef(false);

  const spring = reduce
    ? ({ type: "tween", duration: 0.15 } as const)
    : ({ type: "spring", bounce: 0, duration: 0.42 } as const);

  useEffect(() => {
    const controlsAnim = animate(y, 0, spring);
    panel.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      controlsAnim.stop();
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function close(velocity = 0) {
    if (closing.current) return;
    closing.current = true;
    const h = panel.current?.offsetHeight ?? 600;
    animate(y, h, { ...spring, velocity }).then(() => router.back());
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-[70]">
      <motion.div
        className="absolute inset-0 bg-black"
        style={{ opacity: scrim }}
        onPointerDown={() => close()}
        aria-hidden
      />
      <motion.div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        style={{ y }}
        drag="y"
        dragListener={false}
        dragControls={controls}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.08, bottom: 1 }}
        onDragEnd={(_, info) => {
          const h = panel.current?.offsetHeight ?? 600;
          const projected = y.get() + project(info.velocity.y);
          if (projected > h * 0.4) close(info.velocity.y);
          else animate(y, 0, { ...spring, velocity: info.velocity.y });
        }}
        className="material absolute inset-x-0 bottom-0 mx-auto flex max-h-[92dvh] w-full max-w-md flex-col rounded-t-[28px] bg-background outline-none shadow-[0_-20px_60px_-20px_rgba(0,0,0,.35)]"
      >
        <div
          onPointerDown={(e) => controls.start(e)}
          className="flex shrink-0 cursor-grab touch-none select-none flex-col items-center px-5 pb-1 pt-3 active:cursor-grabbing"
        >
          <span className="h-1.5 w-10 rounded-full bg-foreground/20" />
          <h2 className="sr-only">{title}</h2>
        </div>
        <div className="overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]">
          {children}
        </div>
      </motion.div>
    </div>
  );
}
