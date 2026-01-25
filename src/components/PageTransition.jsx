import { motion } from "framer-motion";

const animations = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 1.02 },
};

const transition = { duration: 0.5, ease: [0.61, 1, 0.88, 1] };

export default function PageTransition({ children }) {
  return (
    <motion.div
      variants={animations}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.4, ease: [0.43, 0.13, 0.23, 0.96] }}
      style={{ width: "100%", position: "relative" }}
    >
      {children}
    </motion.div>
  );
}
