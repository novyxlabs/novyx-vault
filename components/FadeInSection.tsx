"use client";

import { motion } from "motion/react";

export function FadeInSection({ id, className, children }: { id?: string; className?: string; children: React.ReactNode }) {
  return (
    <motion.section
      id={id}
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5 }}
    >
      {children}
    </motion.section>
  );
}
