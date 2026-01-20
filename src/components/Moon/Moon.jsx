import { useState, useRef, useEffect } from "react";

export default function Moon({
  planetId,
  moon,
  index,
  planetPosition, // { x, y }
  planetType,
  moonOffset,
  windowSize,
  currentLang,
  onHoverStart,
  onHoverEnd,
  totalMoons = 1,
}) {
  const speedFactor = 0.01;
  const sideSpacing = 0.6; // radians (~35°)
  const padding = 250; // min distance from window edge
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeoutRef = useRef(null);

  // -------------------- Moon Orbit Radius --------------------
  let moonOrbitRadius = 100;
  if (planetType === "info") moonOrbitRadius -= 20;
  if (planetType === "action") moonOrbitRadius -= 40;

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

  // -------------------- Track current side --------------------
  const [side, setSide] = useState("right");

  // -------------------- Track target angle --------------------
  const [targetAngle, setTargetAngle] = useState(() => {
    const arc = sideSpacing * (totalMoons - 1);
    return -arc / 2 + index * sideSpacing;
  });

  // -------------------- Flip logic --------------------
  useEffect(() => {
    const arc = sideSpacing * (totalMoons - 1);
    const projectedX =
      planetPosition.x + Math.cos(targetAngle) * moonOrbitRadius;

    // Flip only if moon is too close to current side edge
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
  ]);

  // -------------------- animatedAngle state --------------------
  const [animatedAngle, setAnimatedAngle] = useState(targetAngle);

  // -------------------- Animate smoothly --------------------
  useEffect(() => {
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

  // -------------------- Compute x & y --------------------
  const moonX = Math.cos(animatedAngle) * moonOrbitRadius;
  const moonY = Math.sin(animatedAngle) * moonOrbitRadius;

  // -------------------- Moon container --------------------
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

  // -------------------- Circle styles --------------------
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

  // -------------------- Label styles --------------------
  const labelStyle = {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    whiteSpace: "nowrap",
    fontSize: isHovered ? "14px" : "12px",
    fontStyle: href ? "normal" : "italic",
    color: href ? "#1c0700" : "#1c0700",
    textDecoration: href && isHovered ? "underline" : "none",
    transition:
      "color 0.2s ease-in-out, text-decoration 0.2s ease-in-out, font-size 0.2s ease",
    left: moonX >= 0 ? "100%" : "auto",
    right: moonX < 0 ? "100%" : "auto",
    marginLeft: moonX >= 0 ? "12px" : "0",
    marginRight: moonX < 0 ? "12px" : "0",
  };

  return (
    <a
      href={href || "#"}
      target={href?.startsWith("http") ? "_blank" : "_self"}
      rel="noreferrer"
      style={moonStyle}
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
    </a>
  );
}
