import { useState } from "react";
import sun from "../../assets/sun.png";

export default function Sun({ sunClicked, onClick, absolute = true, style }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <img
      src={sun}
      alt="Sun"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        ...style,
        position: absolute ? "absolute" : "relative",
        top: absolute ? "50%" : undefined,
        left: absolute ? "50%" : undefined,
        transform: absolute
          ? `translate(-50%, -50%) scale(${sunClicked ? 1.1 : isHovered ? 1.05 : 1})`
          : `scale(${sunClicked ? 1.1 : isHovered ? 1.05 : 1})`,
        cursor: "pointer",
        transition: "transform 0.25s ease",
        zIndex: 1,
      }}
    />
  );
}
