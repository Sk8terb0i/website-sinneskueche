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

  // 1. Use the path exactly as it is defined in your data
  const baseIconSrc = planet.icon[language];

  // 2. Insert "_hover" before the language part of the filename.
  // This regex finds the underscore + language + dot (e.g., "_en.")
  // and replaces it with "_hover_en."
  // This preserves whatever directory structure (like "assets/") was already there.
  const hoverIconSrc = baseIconSrc.replace(
    new RegExp(`_${language}\\.`),
    `_hover_${language}.`,
  );

  // Determine which image to show
  const currentIconSrc = isHovered ? hoverIconSrc : baseIconSrc;

  return (
    <div
      className="planet-container"
      style={{
        ...style,
        width: `${size}px`,
        height: `${size}px`,
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
      onTouchStart={() => setIsHovered(true)}
      onTouchEnd={() => setIsHovered(false)}
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
          transition: "all 0.2s ease",
        }}
      />
    </div>
  );
}
