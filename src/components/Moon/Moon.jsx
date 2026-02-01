import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import moonImage from "../../assets/planets/moon.png";

export default function Moon({
  planetId,
  moon,
  index,
  planetPosition,
  planetType,
  windowSize,
  currentLang,
  onHoverStart,
  onHoverEnd,
  totalMoons = 1,
  scaleFactor = 1,
}) {
  const navigate = useNavigate();

  const speedFactor = 0.05;
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeoutRef = useRef(null);
  const hasInitialized = useRef(false);

  const planetSeed = planetId
    ? planetId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
    : 0;

  const groupRotationOffset = (planetSeed % 100) * 0.1;
  const individualJitter = ((planetSeed + index) % 5) * 0.08;

  let baseMoonRadius = 110;
  if (planetType === "info") baseMoonRadius -= 20;
  if (planetType === "action") baseMoonRadius -= 40;
  const moonOrbitRadius = baseMoonRadius * scaleFactor;

  let content = "";
  let href = null;
  if (typeof moon === "object") {
    content =
      typeof moon.text === "object" ? moon.text[currentLang] : moon.text;
    href = moon.link || null;
  } else {
    content = moon;
  }

  const [targetAngle, setTargetAngle] = useState(0);
  const [animatedAngle, setAnimatedAngle] = useState(0);

  useEffect(() => {
    const angleStep = totalMoons > 0 ? (2 * Math.PI) / totalMoons : 0;
    const baseAngle = index * angleStep;
    const finalAngle = baseAngle + groupRotationOffset + individualJitter;

    setTargetAngle(finalAngle);

    if (!hasInitialized.current) {
      setAnimatedAngle(finalAngle);
      hasInitialized.current = true;
    }
  }, [index, totalMoons, groupRotationOffset, individualJitter]);

  useEffect(() => {
    if (!hasInitialized.current) return;
    let frame;
    const animate = () => {
      setAnimatedAngle((prev) => {
        let diff = targetAngle - prev;
        diff = ((diff + Math.PI) % (2 * Math.PI)) - Math.PI;
        return Math.abs(diff) < 0.001 ? targetAngle : prev + diff * speedFactor;
      });
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [targetAngle]);

  const moonX = Math.cos(animatedAngle) * moonOrbitRadius;
  const moonY = Math.sin(animatedAngle) * moonOrbitRadius;
  const isOnRight = moonX >= 0;

  return (
    <div
      className="moon-container"
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: `translate3d(${planetPosition.x + moonX}px, ${planetPosition.y + moonY}px, 0) translate(-50%, -50%)`,
        willChange: "transform",
        zIndex: 4002,
        pointerEvents: "auto",
        cursor: href ? "pointer" : "default",
        /* ADDED: A larger padding makes the label part of the hoverable area */
        padding: "10px 20px",
      }}
      onClick={() => {
        if (!href) return;
        href.startsWith("http")
          ? window.open(href, "_blank", "noreferrer")
          : navigate(href);
      }}
      onMouseEnter={() => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        setIsHovered(true);
        onHoverStart();
      }}
      onMouseLeave={() => {
        hoverTimeoutRef.current = setTimeout(() => {
          setIsHovered(false);
          onHoverEnd();
        }, 100);
      }}
    >
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "24px",
          height: "24px",
        }}
      >
        {/* Visual Moon */}
        <img
          src={moonImage}
          alt="moon"
          style={{
            width: "24px",
            height: "24px",
            objectFit: "contain",
            filter:
              href && isHovered
                ? "drop-shadow(0 0 6px #9960a8) drop-shadow(0 0 2px #9960a8)"
                : "none",
            transition: "filter 0.2s, transform 0.2s",
            transform: href ? `scale(${isHovered ? 1.2 : 1})` : "scale(1)",
            position: "relative",
            zIndex: 4003,
            display: "block",
          }}
        />

        {/* Moon Label */}
        <span
          style={{
            position: "absolute",
            top: "50%",
            /* Keep the label offset, but it's now inside the parent's hit area */
            transform: `translateY(-50%) translateX(${isOnRight ? "20px" : "-20px"})`,
            left: isOnRight ? "50%" : "auto",
            right: !isOnRight ? "50%" : "auto",
            whiteSpace: "nowrap",
            fontSize: isHovered ? "14px" : "12px",
            lineHeight: "1",
            fontStyle: href ? "normal" : "italic",
            color: "#1c0700",
            textDecoration: href && isHovered ? "underline" : "none",
            /* CHANGE: pointerEvents is now auto so the text itself triggers the hover */
            pointerEvents: "auto",
            zIndex: 4004,
            transition:
              "font-size 0.2s ease, text-decoration 0.2s ease, color 0.2s ease",
            textAlign: isOnRight ? "left" : "right",
            /* Optional: subtle background to make text more readable if overlapping orbits */
            padding: "2px 4px",
            borderRadius: "4px",
          }}
        >
          {content}
        </span>
      </div>
    </div>
  );
}
