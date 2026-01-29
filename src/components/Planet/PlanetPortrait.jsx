import { useState } from "react";
import "./Planet.css";

export default function PlanetPortrait({
  planet,
  language,
  size = 100,
  onActivate,
  isIconOnly, // Received from parent
  onMouseEnter,
  onMouseLeave,
}) {
  const [isHovered, setIsHovered] = useState(false);

  // Logic to select the icon:
  // Use 'base' if it exists and isIconOnly is true, otherwise use language version
  const iconSrc =
    isIconOnly && planet.icon.base ? planet.icon.base : planet.icon[language];

  const hoverScale = 1.15;
  const activeScale = isHovered ? hoverScale : 1;

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (onMouseEnter) onMouseEnter();
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (onMouseLeave) onMouseLeave();
  };

  return (
    <div
      className={`planet-portrait-container ${isIconOnly ? "is-shrunken" : ""}`}
      onClick={onActivate}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        width: size,
        height: size,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transform: `scale(${activeScale})`,
        transition:
          "transform 0.3s ease, width 0.3s ease, height 0.3s ease, opacity 0.3s ease",
        opacity: isIconOnly ? 0.7 : 1,
      }}
    >
      <img
        src={iconSrc}
        alt={planet.id}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          // Slight visual cue for shrunken state
          filter: isIconOnly ? "brightness(0.9)" : "none",
          transition: "filter 0.3s ease",
        }}
      />
    </div>
  );
}
