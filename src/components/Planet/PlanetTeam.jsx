import { useState } from "react";

export default function PlanetTeam({
  planet,
  language,
  onActivate,
  onHover,
  onHoverEnd,
  style,
  size,
  isFocused,
}) {
  const [isHovered, setIsHovered] = useState(false);

  // ALWAYS show base (photo) normally, and language (name) on hover
  const currentIconSrc = isHovered
    ? planet.icon[language] || planet.icon.base
    : planet.icon.base || planet.icon[language];

  // Hotbox: 1% bigger hit area than the visual planet
  const hotboxSize = size * 1.01;

  // Bridge Size: Area to keep the system open while moving to moons
  const bridgeSize = 250;

  return (
    <div
      className="planet-hotbox"
      style={{
        ...style,
        width: `${hotboxSize}px`,
        height: `${hotboxSize}px`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        zIndex: 10,
        borderRadius: "50%",
        backgroundColor: "#fffce3", // Restored from Planet.jsx
      }}
      onMouseEnter={() => {
        if (onHover) onHover(planet.id);
        setIsHovered(true);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        if (onHoverEnd) onHoverEnd();
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (onActivate) onActivate(planet.id);
      }}
    >
      {/* THE BRIDGE: Large area active when the planet is focused */}
      {isFocused && (
        <div
          style={{
            position: "absolute",
            width: `${bridgeSize}px`,
            height: `${bridgeSize}px`,
            borderRadius: "50%",
            pointerEvents: "auto",
            zIndex: -1,
          }}
        />
      )}

      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          transform: isHovered ? "scale(1.15)" : "scale(1)", // Restored 1.15 scale from Planet.jsx
          transition: "transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <img
          src={currentIconSrc}
          alt={planet.id}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
          }}
        />
      </div>
    </div>
  );
}
