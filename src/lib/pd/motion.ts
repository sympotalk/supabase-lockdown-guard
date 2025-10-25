// Precision Design - Motion configurations for framer-motion
import { Variants, Transition } from "framer-motion";

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
};

export const fadeInConfig: Transition = {
  duration: 0.3,
  ease: "easeOut",
};

export const slideInLeft: Variants = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
};

export const slideInLeftConfig: Transition = {
  duration: 0.4,
  ease: "easeOut",
};

export const slideInRight: Variants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
};

export const slideInUp: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export const shake: Variants = {
  initial: { x: 0 },
  animate: { x: [-10, 10, -10, 10, 0] },
};
