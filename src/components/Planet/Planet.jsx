import { useState } from "react";

export default function Planet({
  planet,
  language,
  isActive,
  onActivate,
  onHover,
  onHoverEnd,
  style,
  size,
}) {
  const [isHovered, setIsHovered] = useState(false);
  const iconSrc = planet.icon[language];

  return (
    <div
      className="planet-container"
      style={{
        ...style,
        width: `${size}px`,
        height: `${size}px`,
        transform: isHovered
          ? `${style.transform} scale(1.1)`
          : style.transform,
        transition: "transform 0.2s ease-out, filter 0.2s ease",
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
        src={iconSrc}
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
