import { useState } from "react";
import sun from "../../assets/sun.png";

export default function Sun({
  sunClicked,
  onClick,
  absolute = true,
  style,
  size,
}) {
  const [isHovered, setIsHovered] = useState(false);

  // Interaction scale multiplier
  const interactionScale = sunClicked ? 1.1 : isHovered ? 1.05 : 1;

  return (
    <img
      src={sun}
      alt="Sun"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        ...style,
        width: `${size}px`,
        height: `${size}px`, // Forces ratio to remain consistent with scale
        objectFit: "contain",
        position: absolute ? "absolute" : "relative",
        top: absolute ? "50%" : undefined,
        left: absolute ? "50%" : undefined,
        transform: absolute
          ? `translate(-50%, -50%) scale(${interactionScale})`
          : `scale(${interactionScale})`,
        cursor: "pointer",
        transition:
          "transform 0.25s ease, filter 0.3s ease, width 0.2s ease, height 0.2s ease",
        zIndex: 1,
      }}
    />
  );
}
