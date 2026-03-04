import { motion } from "motion/react";

interface DiagonalStripesProps {
  variant?: "header" | "section";
  className?: string;
}

export function DiagonalStripes({ variant = "header", className = "" }: DiagonalStripesProps) {
  if (variant === "header") {
    return (
      <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>

        {/* Franja naranja — principal */}
        <motion.div
          initial={{ x: "110%", opacity: 0 }}
          animate={{ x: "0%", opacity: 1 }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          style={{
            position: "absolute",
            width: "160%",
            height: "160px",
            background: "rgba(235, 120, 5, 0.72)",
            top: "42%",
            left: "-30%",
            transform: "rotate(-10deg)",
            transformOrigin: "center center",
            filter: "blur(8px)",
          }}
        />

        {/* Franja amarilla — acento delgado */}
        <motion.div
          initial={{ x: "-110%", opacity: 0 }}
          animate={{ x: "0%", opacity: 1 }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.35 }}
          style={{
            position: "absolute",
            width: "160%",
            height: "36px",
            background: "rgba(255, 200, 0, 0.65)",
            top: "68%",
            left: "-30%",
            transform: "rotate(-10deg)",
            transformOrigin: "center center",
            filter: "blur(5px)",
          }}
        />

        {/* Franja blanca — toque de luz sutil */}
        <motion.div
          initial={{ x: "110%", opacity: 0 }}
          animate={{ x: "0%", opacity: 1 }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.55 }}
          style={{
            position: "absolute",
            width: "160%",
            height: "18px",
            background: "rgba(255, 255, 255, 0.14)",
            top: "58%",
            left: "-30%",
            transform: "rotate(-10deg)",
            transformOrigin: "center center",
            filter: "blur(4px)",
          }}
        />

      </div>
    );
  }

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      <motion.div
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#ff9800] via-[#ffc107] to-[#ff9800] origin-left"
      />
      <motion.div
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
        className="absolute bottom-0 right-0 w-3/4 h-px bg-gradient-to-l from-[#1e3a5f] via-[#2a4a6f] to-transparent origin-right"
      />
    </div>
  );
}
