import { useState } from "react";

export default function Planet({
  planet,
  language,
  onActivate,
  onHover,
  onHoverEnd,
  style,
  size,
  isFocused, // Crucial: Keeps the hit-area active
}) {
  const [isHovered, setIsHovered] = useState(false);

  let currentIconSrc;
  if (planet.type === "courses") {
    currentIconSrc = isHovered
      ? planet.icon[language]
      : planet.icon.base || planet.icon[language];
  } else {
    currentIconSrc = planet.icon[language];
  }

  // Hotbox: 10% bigger hit area than the visual planet
  const hotboxSize = size * 1.01;

  // Bridge Size: Large enough to cover the moon orbits (approx 350px)
  const bridgeSize = 200;

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
        backgroundColor: "#fffce3",
      }}
      onMouseEnter={() => {
        // Clear any timers from the moons that might be trying to close the system
        if (onHover) onHover(planet.id);
        setIsHovered(true);
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
          transform: isHovered ? "scale(1.15)" : "scale(1)",
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
