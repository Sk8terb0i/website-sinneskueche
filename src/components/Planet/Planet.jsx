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

  // Get the base icon source (e.g., "assets/hearing_en.png")
  const baseIconSrc = planet.icon[language];

  // Generate the hover source by inserting "_hover" before the language suffix
  // This looks for the ".png" (or other extension) and inserts "_hover" before it
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
        // The transform now combines the position from props + the hover scale
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
      // Adding Touch support for the "tap" interaction we discussed earlier
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
          // Smooth transition between the two images
          transition: "all 0.2s ease",
        }}
      />
    </div>
  );
}
