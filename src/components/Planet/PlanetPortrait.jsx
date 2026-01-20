import { useState } from "react";
import "./Planet.css";

export default function PlanetPortrait({
  planet,
  language,
  size = 100,
  onActivate,
}) {
  const [isHovered, setIsHovered] = useState(false);
  const iconSrc = planet.icon[language];

  // combine base size with hover scale
  const hoverScale = 1.15;
  const activeScale = isHovered ? hoverScale : 1;

  return (
    <div
      className="planet-portrait-container"
      onClick={onActivate}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: size,
        height: size,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transform: `scale(${activeScale})`,
        transition: "transform 0.3s ease, width 0.3s ease, height 0.3s ease",
      }}
    >
      <img
        src={iconSrc}
        alt={planet.id}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
        }}
      />
    </div>
  );
}
