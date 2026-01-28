import { motion } from "framer-motion";
import { useState } from "react";

const animations = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 1.02 },
};

export default function PageTransition({ children }) {
  const [isTransitioning, setIsTransitioning] = useState(false);

  return (
    <motion.div
      variants={animations}
      initial="initial"
      animate="animate"
      exit="exit"
      onAnimationStart={() => setIsTransitioning(true)}
      onAnimationComplete={() => setIsTransitioning(false)}
      transition={{ duration: 0.4, ease: [0.43, 0.13, 0.23, 0.96] }}
      style={{
        width: "100%",
        // Only apply 'fixed' and '100vh' during the actual swap
        position: isTransitioning ? "fixed" : "relative",
        height: isTransitioning ? "100vh" : "auto",
        top: 0,
        left: 0,
        overflow: isTransitioning ? "hidden" : "visible",
      }}
    >
      {children}
    </motion.div>
  );
}
