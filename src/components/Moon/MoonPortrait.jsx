import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

// Keep track of last used angles globally to avoid overlap
const lastUsedAngles = [];

export default function MoonPortrait({
  moon,
  orbitRadius = 100,
  currentLang,
  exitOnly = false,
  enterDirection = "top", // "top" or "bottom"
  exitDirection = "bottom", // "top" or "bottom"
  onHoverStart,
  onHoverEnd,
}) {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);

  // ---------------- Resolve content & link ----------------
  let content = "";
  let href = null;
  if (typeof moon === "object") {
    content =
      typeof moon.text === "object" ? moon.text[currentLang] : moon.text;
    href = moon.link || null;
  } else {
    content = moon;
  }

  // ---------------- 6 fixed positions on right half ----------------
  const possibleAngles = [
    -Math.PI / 4,
    -Math.PI / 6,
    -Math.PI / 12,
    Math.PI / 12,
    Math.PI / 6,
    Math.PI / 4,
  ];

  const targetAngleRef = useRef(null);
  if (targetAngleRef.current === null) {
    const availableAngles = possibleAngles.filter(
      (a) => !lastUsedAngles.slice(-2).includes(a),
    );
    const chosen =
      availableAngles[Math.floor(Math.random() * availableAngles.length)];
    lastUsedAngles.push(chosen);
    targetAngleRef.current = chosen;
  }
  const targetAngle = targetAngleRef.current;

  // ---------------- Entry and exit angles ----------------
  const entryAngle =
    enterDirection === "top" ? -Math.PI / 2 - 0.5 : Math.PI / 2 + 0.5;
  const exitAngle =
    exitDirection === "bottom" ? Math.PI / 2 + 1 : -Math.PI / 2 - 1;

  const [animatedAngle, setAnimatedAngle] = useState(
    exitOnly ? targetAngle : entryAngle,
  );
  const [animatedOpacity, setAnimatedOpacity] = useState(exitOnly ? 1 : 0);
  const [animatedScale, setAnimatedScale] = useState(exitOnly ? 1 : 1);
  const [state, setState] = useState(exitOnly ? "exit" : "enter");

  // ---------------- Time-based easing animation ----------------
  const duration = 3000;
  const startTimeRef = useRef(null);
  const startAngleRef = useRef(animatedAngle);
  const startOpacityRef = useRef(animatedOpacity);
  const startScaleRef = useRef(animatedScale);

  useEffect(() => {
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    const step = (timestamp) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;

      let target = targetAngle;
      let targetOpacity = 1;
      let targetScale = 1;
      let opacityDuration = duration;

      if (state === "enter") {
        target = targetAngle;
      } else if (state === "exit") {
        target = exitAngle;
        targetOpacity = 0;
        targetScale = 0;
        opacityDuration = 600;
      } else {
        return;
      }

      const t = Math.min(elapsed / duration, 1);
      const easedT = easeOutCubic(t);
      const newAngle =
        startAngleRef.current + (target - startAngleRef.current) * easedT;

      const tOpacity = Math.min(elapsed / opacityDuration, 1);
      const easedOpacity = easeOutCubic(tOpacity);
      const newOpacity =
        startOpacityRef.current +
        (targetOpacity - startOpacityRef.current) * easedOpacity;

      const tScale = Math.min(elapsed / opacityDuration, 1);
      const easedScale = easeOutCubic(tScale);
      const newScale =
        startScaleRef.current +
        (targetScale - startScaleRef.current) * easedScale;

      setAnimatedAngle(newAngle);
      setAnimatedOpacity(newOpacity);
      setAnimatedScale(newScale);

      if (t < 1) {
        requestAnimationFrame(step);
      } else if (state === "enter") {
        setState("idle");
        setAnimatedOpacity(1);
        setAnimatedScale(1);
      }
    };

    startTimeRef.current = null;
    startAngleRef.current = animatedAngle;
    startOpacityRef.current = animatedOpacity;
    startScaleRef.current = animatedScale;

    requestAnimationFrame(step);
  }, [state, targetAngle, exitAngle]);

  // ---------------- Compute position ----------------
  const moonX = Math.cos(animatedAngle) * orbitRadius;
  const moonY = Math.sin(animatedAngle) * orbitRadius;

  const moonStyle = {
    position: "fixed",
    left: `calc(20vw + ${moonX}px)`,
    top: `calc(50vh + ${moonY}px)`,
    transform: "translate(-50%, -50%)",
    zIndex: 2000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: href ? "auto" : "none",
    cursor: href ? "pointer" : "default",
  };

  const circleStyle = {
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    background: href ? (isHovered ? "#9960a8" : "white") : "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background 0.2s ease-in-out, transform 0.2s ease",
    transform: href
      ? `scale(${isHovered ? 1.2 : animatedScale})`
      : `scale(${animatedScale})`,
  };

  const labelStyle = {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    whiteSpace: "nowrap",
    fontSize: isHovered ? "18px" : "16px",
    fontStyle: href ? "normal" : "italic",
    color: "#1c0700",
    textDecoration: href && isHovered ? "underline" : "none",
    transition:
      "color 0.2s ease-in-out, text-decoration 0.2s ease-in-out, font-size 0.2s ease",
    left: "100%",
    marginLeft: "12px",
    opacity: animatedOpacity,
  };

  const orbitStyle = {
    position: "fixed",
    left: "20vw",
    top: "50vh",
    transform: "translate(-50%, -50%)",
    pointerEvents: "none",
    zIndex: 1000,
  };

  return (
    <>
      {/* Orbit Path */}
      <svg style={orbitStyle} width={orbitRadius * 2} height={orbitRadius * 2}>
        <circle cx={orbitRadius} cy={orbitRadius} r={orbitRadius} fill="none" />
      </svg>

      {/* Moon */}
      <div
        style={moonStyle}
        onClick={() => {
          if (!href) return;

          if (href.startsWith("http")) {
            window.open(href, "_blank", "noreferrer");
          } else {
            navigate(href);
          }
        }}
        onMouseEnter={() => {
          if (!href) return;
          setIsHovered(true);
          onHoverStart?.();
        }}
        onMouseLeave={() => {
          if (!href) return;
          setIsHovered(false);
          onHoverEnd?.();
        }}
      >
        <div style={circleStyle} />
        <span style={labelStyle}>{content}</span>
      </div>
    </>
  );
}
