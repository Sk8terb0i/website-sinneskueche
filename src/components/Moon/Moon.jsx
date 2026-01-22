import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Moon({
  planetId,
  moon,
  index,
  planetPosition,
  planetType,
  moonOffset,
  windowSize,
  currentLang,
  onHoverStart,
  onHoverEnd,
  totalMoons = 1,
  scaleFactor = 1, // <--- Add default value here
}) {
  const navigate = useNavigate();

  const speedFactor = 0.01;
  const sideSpacing = 0.6;
  const padding = 250;
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeoutRef = useRef(null);
  const hasInitialized = useRef(false);

  // -------------------- Moon Orbit Radius (Scaled) --------------------
  let baseMoonRadius = 100;
  if (planetType === "info") baseMoonRadius -= 20;
  if (planetType === "action") baseMoonRadius -= 40;

  // Apply the scale factor to the radius
  const moonOrbitRadius = baseMoonRadius * scaleFactor;

  // -------------------- Resolve content & link --------------------
  let content = "";
  let href = null;
  if (typeof moon === "object") {
    content =
      typeof moon.text === "object" ? moon.text[currentLang] : moon.text;
    href = moon.link || null;
  } else {
    content = moon;
  }

  // -------------------- Side & angle state --------------------
  const [side, setSide] = useState("right");
  const [targetAngle, setTargetAngle] = useState(0);
  const [animatedAngle, setAnimatedAngle] = useState(0);

  // -------------------- Initial placement (NO animation) --------------------
  useEffect(() => {
    const arc = sideSpacing * (totalMoons - 1);

    const rightAngle = -arc / 2 + index * sideSpacing;
    const projectedX =
      planetPosition.x + Math.cos(rightAngle) * moonOrbitRadius;

    const shouldFlipRight =
      projectedX + windowSize.width / 2 + 24 > windowSize.width - padding;

    const initialSide = shouldFlipRight ? "left" : "right";
    const initialAngle = shouldFlipRight
      ? Math.PI - arc / 2 + index * sideSpacing
      : rightAngle;

    setSide(initialSide);
    setTargetAngle(initialAngle);
    setAnimatedAngle(initialAngle); // 👈 instant placement

    hasInitialized.current = true;
  }, [planetPosition.x, windowSize.width, index, totalMoons, moonOrbitRadius]);

  // -------------------- Flip logic (AFTER init) --------------------
  useEffect(() => {
    if (!hasInitialized.current) return;

    const arc = sideSpacing * (totalMoons - 1);
    const projectedX =
      planetPosition.x + Math.cos(targetAngle) * moonOrbitRadius;

    if (
      side === "right" &&
      projectedX + windowSize.width / 2 + 24 > windowSize.width - padding
    ) {
      setSide("left");
      setTargetAngle(Math.PI - arc / 2 + index * sideSpacing);
    } else if (
      side === "left" &&
      projectedX + windowSize.width / 2 - 24 < padding
    ) {
      setSide("right");
      setTargetAngle(-arc / 2 + index * sideSpacing);
    }
  }, [
    planetPosition.x,
    windowSize.width,
    side,
    index,
    totalMoons,
    moonOrbitRadius,
    targetAngle,
  ]);

  // -------------------- Smooth animation --------------------
  useEffect(() => {
    if (!hasInitialized.current) return;

    let frame;
    const animate = () => {
      setAnimatedAngle((prev) => {
        let diff = targetAngle - prev;
        diff = ((diff + Math.PI) % (2 * Math.PI)) - Math.PI;
        const next = prev + diff * speedFactor;
        if (Math.abs(diff) < 0.001) return targetAngle;
        return next;
      });
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [targetAngle]);

  // -------------------- Compute position --------------------
  const moonX = Math.cos(animatedAngle) * moonOrbitRadius;
  const moonY = Math.sin(animatedAngle) * moonOrbitRadius;

  const moonStyle = {
    position: "absolute",
    left: `calc(50% + ${planetPosition.x + moonX}px)`,
    top: `calc(50% + ${planetPosition.y + moonY}px)`,
    transform: "translate(-50%, -50%)",
    zIndex: 2000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: href ? "auto" : "none",
    cursor: href ? "pointer" : "default",
  };

  const circleStyle = {
    width: "24px",
    height: "24px",
    borderRadius: "50%",
    background: href ? (isHovered ? "#9960a8" : "white") : "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background 0.2s ease-in-out, transform 0.2s ease",
    transform: href ? `scale(${isHovered ? 1.2 : 1})` : "scale(1)",
  };

  const labelStyle = {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    whiteSpace: "nowrap",
    fontSize: isHovered ? "14px" : "12px",
    fontStyle: href ? "normal" : "italic",
    color: "#1c0700",
    textDecoration: href && isHovered ? "underline" : "none",
    left: moonX >= 0 ? "100%" : "auto",
    right: moonX < 0 ? "100%" : "auto",
    marginLeft: moonX >= 0 ? "12px" : "0",
    marginRight: moonX < 0 ? "12px" : "0",
  };

  return (
    <div
      style={moonStyle}
      onClick={() => {
        if (!href) return;
        href.startsWith("http")
          ? window.open(href, "_blank", "noreferrer")
          : navigate(href);
      }}
      onMouseEnter={() => {
        if (!href) return;
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        setIsHovered(true);
        onHoverStart();
      }}
      onMouseLeave={() => {
        if (!href) return;
        hoverTimeoutRef.current = setTimeout(() => {
          setIsHovered(false);
          onHoverEnd();
        }, 150);
      }}
    >
      <div style={circleStyle} />
      <span style={labelStyle}>{content}</span>
    </div>
  );
}
