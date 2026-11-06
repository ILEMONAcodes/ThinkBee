// Shared motion presets. Import these instead of writing ad-hoc values.
// Rule: animate transform and opacity only. Respect prefers-reduced-motion (see useMotionOK).
import type { Transition, Variants } from "motion/react";

export const ease = {
  outQuint: [0.22, 1, 0.36, 1] as const,
  inOutSoft: [0.65, 0, 0.35, 1] as const,
};

export const spring = {
  sheet: { type: "spring", stiffness: 380, damping: 36, mass: 0.9 } as Transition,
  pop: { type: "spring", stiffness: 520, damping: 28 } as Transition,
  soft: { type: "spring", stiffness: 220, damping: 26 } as Transition,
  nav: { type: "spring", stiffness: 420, damping: 34 } as Transition,
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: ease.outQuint } },
};

export const listStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045, delayChildren: 0.04 } },
};

export const screenSlide = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.28, ease: ease.outQuint } },
  exit: { opacity: 0, x: -16, transition: { duration: 0.18, ease: ease.inOutSoft } },
};

export const sheetUp = {
  initial: { y: "100%" },
  animate: { y: 0, transition: spring.sheet },
  exit: { y: "100%", transition: { duration: 0.22, ease: ease.inOutSoft } },
};

export const bubbleIn = (own: boolean) => ({
  initial: { opacity: 0, y: 14, scale: 0.96, originX: own ? 1 : 0 },
  animate: { opacity: 1, y: 0, scale: 1, transition: spring.pop },
});

export const press = { whileTap: { scale: 0.96 }, transition: spring.pop };

/** Honeycomb loader: cells fill in sequence. Used on scan analysis and AI thinking. */
export const combCell = (i: number): Variants => ({
  idle: { opacity: 0.25, scale: 0.9 },
  fill: {
    opacity: [0.25, 1, 0.55],
    scale: [0.9, 1.05, 1],
    transition: { duration: 1.2, delay: i * 0.12, repeat: Infinity, ease: ease.inOutSoft },
  },
});
