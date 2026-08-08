"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

interface RightRevealProps {
    children: ReactNode;
    className?: string;
    /** Optional key to trigger re-animation on change. */
    revealKey?: string;
}

/**
 * Slides content in from the right edge with a gentle fade.
 * Renders statically when the user prefers reduced motion.
 *
 * Use inside a Booking Widget panel, drawer, or any container where
 * a right-to-left entry animation is needed (contact forms, confirmations).
 */
export function RightReveal({ children, className, revealKey }: RightRevealProps) {
    const reduceMotion = useReducedMotion();

    if (reduceMotion) {
        return <div className={className}>{children}</div>;
    }

    return (
        <motion.div
            key={revealKey}
            className={className}
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 32 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
            {children}
        </motion.div>
    );
}
