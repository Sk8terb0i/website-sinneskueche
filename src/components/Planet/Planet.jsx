import { useState } from "react";
import "./Planet.css";

export default function Planet({
  planet,
  language,
  isActive,
  onActivate,
  onHover,
  onHoverEnd,
  style,
}) {
  const [isHovered, setIsHovered] = useState(false);
  const iconSrc = planet.icon[language];

  return (
    <div
      className="planet-container"
      style={{
        ...style,
        transform: isHovered
          ? `${style.transform} scale(1.1)` // simple grow on hover
          : style.transform,
        transition: "transform 0.2s ease, filter 0.2s ease",
        cursor: "pointer",
      }}
      onMouseEnter={() => {
        setIsHovered(true);
        onHover(planet.id);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        onHoverEnd && onHoverEnd();
      }}
      onClick={() => onActivate(planet.id)}
    >
      <img src={iconSrc} alt={planet.id} className="planet-icon" />
    </div>
  );
}
