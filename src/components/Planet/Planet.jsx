import { useState } from "react";

export default function Planet({
  planet,
  language,
  onActivate,
  onHover,
  onHoverEnd,
  style,
  size,
}) {
  const [isHovered, setIsHovered] = useState(false);

  // Simply use the standard icon. No more swapping!
  const currentIconSrc = planet.icon[language];

  return (
    <div
      className="planet-container"
      style={{
        ...style,
        width: `${size}px`,
        height: `${size}px`,
        // We still keep the scale effect for visual feedback
        transform: isHovered
          ? `${style.transform} scale(1.15)`
          : style.transform,
        transition:
          "transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), filter 0.2s ease",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onMouseEnter={() => {
        setIsHovered(true);
        if (onHover) onHover(planet.id);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        if (onHoverEnd) onHoverEnd();
      }}
      onClick={(e) => {
        e.stopPropagation();
        onActivate(planet.id);
      }}
    >
      <img
        src={currentIconSrc}
        alt={planet.id}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
