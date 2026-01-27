import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import moonImage from "../../assets/planets/moon.png"; // Ensure path matches your folder structure

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
  scaleFactor = 1,
}) {
  const navigate = useNavigate();

  const speedFactor = 0.05;
  const sideSpacing = 0.6;
  const padding = 250;
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeoutRef = useRef(null);
  const hasInitialized = useRef(false);

  // Generate a unique starting rotation for this specific planet
  // so that single moons don't all sit at the exact same angle.
  const planetSeed = planetId
    ? planetId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
    : 0;
  const deterministicOffset = (planetSeed % 10) * 0.2;

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

  const [side, setSide] = useState("right");
  const [targetAngle, setTargetAngle] = useState(0);
  const [animatedAngle, setAnimatedAngle] = useState(0);

  useEffect(() => {
    const arc = sideSpacing * (totalMoons - 1);
    // Added deterministicOffset here to vary the starting point per planet
    const rightAngle = -arc / 2 + index * sideSpacing + deterministicOffset;

    const projectedX =
      planetPosition.x + Math.cos(rightAngle) * moonOrbitRadius;
    const shouldFlipRight =
      projectedX + windowSize.width / 2 + 24 > windowSize.width - padding;

    const initialAngle = shouldFlipRight
      ? Math.PI - arc / 2 + index * sideSpacing - deterministicOffset
      : rightAngle;

    setSide(shouldFlipRight ? "left" : "right");
    setTargetAngle(initialAngle);
    setAnimatedAngle(initialAngle);
    hasInitialized.current = true;
  }, [
    index,
    totalMoons,
    moonOrbitRadius,
    planetPosition.x,
    windowSize.width,
    deterministicOffset,
  ]);

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
      setTargetAngle(
        Math.PI - arc / 2 + index * sideSpacing - deterministicOffset,
      );
    } else if (
      side === "left" &&
      projectedX + windowSize.width / 2 - 24 < padding
    ) {
      setSide("right");
      setTargetAngle(-arc / 2 + index * sideSpacing + deterministicOffset);
    }
  }, [
    planetPosition.x,
    windowSize.width,
    side,
    targetAngle,
    moonOrbitRadius,
    index,
    totalMoons,
    deterministicOffset,
  ]);

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
    <>
      {/* Dashed Moon Orbit Line */}
      <svg
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: `translate3d(${planetPosition.x}px, ${planetPosition.y}px, 0) translate(-50%, -50%)`,
          width: moonOrbitRadius * 2 + 4,
          height: moonOrbitRadius * 2 + 4,
          pointerEvents: "none",
          zIndex: 1999,
        }}
      >
        <circle
          cx="50%"
          cy="50%"
          r={moonOrbitRadius}
          fill="none"
          stroke="#1c0700"
          strokeWidth="1"
          strokeDasharray="4 4"
        />
      </svg>

      {/* Moon Container */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: `translate3d(${planetPosition.x + moonX}px, ${planetPosition.y + moonY}px, 0) translate(-50%, -50%)`,
          willChange: "transform",
          zIndex: 2000,
          pointerEvents: href ? "auto" : "none",
          cursor: href ? "pointer" : "default",
        }}
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
          }, 200);
        }}
      >
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              position: "absolute",
              height: "40px",
              width: "140px",
              background: "transparent",
              left: isOnRight ? "50%" : "auto",
              right: !isOnRight ? "50%" : "auto",
              zIndex: 1,
            }}
          />

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
              zIndex: 2,
            }}
          />

          <span
            style={{
              position: "absolute",
              top: "50%",
              transform: `translateY(-50%) translateX(${isOnRight ? "16px" : "-16px"})`,
              left: isOnRight ? "calc(50% + 12px)" : "auto",
              right: !isOnRight ? "calc(50% + 12px)" : "auto",
              whiteSpace: "nowrap",
              fontSize: isHovered ? "14px" : "12px",
              fontStyle: href ? "normal" : "italic",
              color: "#1c0700",
              textDecoration: href && isHovered ? "underline" : "none",
              pointerEvents: "none",
              zIndex: 3,
              transition: "font-size 0.2s ease, text-decoration 0.2s ease",
            }}
          >
            {content}
          </span>
        </div>
      </div>
    </>
  );
}
